<?php
declare(strict_types=1);

namespace app\service\handler;

use app\service\RefundService;
use think\facade\Db;

/**
 * 处理 wms.inventory.changed 事件（多分支）：
 *
 *   分支 1: refund_no（iter-15）
 *     退货回库 → 调 RefundService::markReceivedBack
 *
 *   分支 2: inbound_no（iter-12）
 *     入库 → available +N，幂等 (inbound_no, sku, change_type=inbound)
 *
 *   分支 3: transfer_no（iter-24 P0-2）
 *     调拨完成 → 仅审计写 inventory_log（change_type=transfer），available 不变。
 *     跨仓库时数据真实变化但当前 OMS 不区分仓库（单实例 inventory_status），延迟到 M3+ 处理。
 *
 *   分支 4: take_no（iter-24 P0-3）
 *     盘点完成 → 按 items[].delta 调 available（可正可负，盘盈/盘亏）
 *     幂等：(take_no, sku, change_type=stock_take) 三元组防重放
 */
class WmsInventoryChangedHandler
{
    public function __invoke(array $payload, string $eventId = '', string $traceId = ''): void
    {
        $refundNo = (string)($payload['refund_no'] ?? '');
        $inboundNo = (string)($payload['inbound_no'] ?? '');
        $transferNo = (string)($payload['transfer_no'] ?? '');
        $takeNo = (string)($payload['take_no'] ?? '');
        $items = $payload['items'] ?? [];

        // 分支 1: refund_no（需 inbound_no 配合 - iter-15 原模式）
        if ($refundNo && $inboundNo) {
            (new RefundService())->markReceivedBack($refundNo);
            fwrite(STDOUT, "[handler] inbound_no={$inboundNo} → refund_no={$refundNo} markReceivedBack\n");
            return;
        }

        if (!is_array($items) || !$items) {
            throw new \RuntimeException('payload 缺字段: items');
        }

        // 分支 3: transfer_no（仅审计；OMS 不动 available）
        if ($transferNo) {
            $this->handleTransfer($transferNo, $payload['from_warehouse'] ?? '', $payload['to_warehouse'] ?? '', $items);
            return;
        }

        // 分支 4: take_no（按 delta 调 available）
        if ($takeNo) {
            $this->handleStockTake($takeNo, $items);
            return;
        }

        // 分支 2: 默认 inbound_no（旧模式）
        if (!$inboundNo) {
            throw new \RuntimeException('payload 缺字段: inbound_no/transfer_no/take_no 至少一个');
        }
        $this->handleInbound($inboundNo, $items);
    }

    /* ============= 分支 2: inbound ============= */
    private function handleInbound(string $inboundNo, array $items): void
    {
        Db::startTrans();
        try {
            foreach ($items as $it) {
                $sku = (string)($it['sku_code'] ?? '');
                $delta = (int)($it['delta'] ?? 0);
                if (!$sku || $delta <= 0) continue;

                $dup = Db::name('inventory_log')
                    ->where('related_order', $inboundNo)
                    ->where('sku_code', $sku)
                    ->where('change_type', 'inbound')
                    ->find();
                if ($dup) {
                    fwrite(STDOUT, "[handler] 跳过已处理 inbound={$inboundNo} sku={$sku}\n");
                    continue;
                }

                $row = Db::name('inventory_status')->where('sku_code', $sku)->lock(true)->find();
                if (!$row) {
                    Db::name('inventory_status')->insert([
                        'sku_code' => $sku, 'available' => $delta, 'locked' => 0, 'buffer_qty' => 0,
                    ]);
                    $this->writeOmsLog($sku, 'inbound', $delta, 0, $delta, 0, 0, $inboundNo);
                    continue;
                }
                $beforeA = (int)$row['available'];
                $beforeL = (int)$row['locked'];
                $afterA = $beforeA + $delta;
                Db::name('inventory_status')->where('sku_code', $sku)->update(['available' => $afterA]);
                $this->writeOmsLog($sku, 'inbound', $delta, $beforeA, $afterA, $beforeL, $beforeL, $inboundNo);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
        fwrite(STDOUT, "[handler] inbound_no={$inboundNo} synced to OMS available\n");
    }

    /* ============= 分支 3: transfer（仅审计） ============= */
    private function handleTransfer(string $transferNo, string $fromWh, string $toWh, array $items): void
    {
        Db::startTrans();
        try {
            foreach ($items as $it) {
                $sku = (string)($it['sku_code'] ?? '');
                $qty = (int)($it['qty'] ?? 0);
                if (!$sku || $qty <= 0) continue;

                // 幂等检测
                $dup = Db::name('inventory_log')
                    ->where('related_order', $transferNo)
                    ->where('sku_code', $sku)
                    ->where('change_type', 'transfer')
                    ->find();
                if ($dup) continue;

                $row = Db::name('inventory_status')->where('sku_code', $sku)->find();
                $beforeA = (int)($row['available'] ?? 0);
                $beforeL = (int)($row['locked'] ?? 0);

                // 仅审计：available 不变（同仓库或跨仓库总量都不变）
                $this->writeOmsLog($sku, 'transfer', 0, $beforeA, $beforeA, $beforeL, $beforeL, $transferNo);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
        fwrite(STDOUT, "[handler] transfer_no={$transferNo} ({$fromWh}→{$toWh}) audited\n");
    }

    /* ============= 分支 4: stock_take（按 delta 调） ============= */
    private function handleStockTake(string $takeNo, array $items): void
    {
        Db::startTrans();
        try {
            foreach ($items as $it) {
                $sku = (string)($it['sku_code'] ?? '');
                $delta = (int)($it['delta'] ?? 0);
                if (!$sku || $delta === 0) continue;

                $dup = Db::name('inventory_log')
                    ->where('related_order', $takeNo)
                    ->where('sku_code', $sku)
                    ->where('change_type', 'stock_take')
                    ->find();
                if ($dup) continue;

                $row = Db::name('inventory_status')->where('sku_code', $sku)->lock(true)->find();
                if (!$row) {
                    if ($delta > 0) {
                        Db::name('inventory_status')->insert([
                            'sku_code' => $sku, 'available' => $delta, 'locked' => 0, 'buffer_qty' => 0,
                        ]);
                        $this->writeOmsLog($sku, 'stock_take', $delta, 0, $delta, 0, 0, $takeNo);
                    }
                    continue;
                }
                $beforeA = (int)$row['available'];
                $beforeL = (int)$row['locked'];
                $afterA = max(0, $beforeA + $delta);  // 兜底不能为负
                $actualDelta = $afterA - $beforeA;
                Db::name('inventory_status')->where('sku_code', $sku)->update(['available' => $afterA]);
                $this->writeOmsLog($sku, 'stock_take', $actualDelta, $beforeA, $afterA, $beforeL, $beforeL, $takeNo);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
        fwrite(STDOUT, "[handler] take_no={$takeNo} synced to OMS available\n");
    }

    private function writeOmsLog(string $sku, string $changeType, int $delta, int $beforeA, int $afterA, int $beforeL, int $afterL, string $relatedOrder): void
    {
        Db::name('inventory_log')->insert([
            'sku_code' => $sku,
            'change_type' => $changeType,
            'change_qty' => $delta,
            'before_available' => $beforeA,
            'after_available' => $afterA,
            'before_locked' => $beforeL,
            'after_locked' => $afterL,
            'related_order' => $relatedOrder,
            'operator' => 'wms',
        ]);
    }
}
