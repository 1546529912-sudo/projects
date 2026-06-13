<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 库存四态服务（OMS 视角）
 *   available（可用） / locked（下单锁定） / reserved（换货预留） / buffer_qty（安全垫）
 *
 * 三个原子操作（事务 + 行锁 + 写流水）：
 *   - lock(sku, qty, order_no)      下单时：available - qty, locked + qty
 *   - unlock(sku, qty, order_no)    取消时：available + qty, locked - qty
 *   - outbound(sku, qty, order_no)  出库时：locked - qty（实物已减少）
 */
class InventoryService
{
    /**
     * 批量预校验：返回不足的 SKU
     * @param array<int, array{sku_code:string, qty:int}> $items
     * @return array<int, string> 不足的 sku_code
     */
    public function precheck(array $items): array
    {
        $shortage = [];
        foreach ($items as $it) {
            $row = Db::name('inventory_status')->where('sku_code', $it['sku_code'])->find();
            if (!$row || ($row['available'] - $row['buffer_qty']) < (int)$it['qty']) {
                $shortage[] = $it['sku_code'];
            }
        }
        return $shortage;
    }

    /**
     * 批量锁定（下单专用，整体事务）
     * @param array<int, array{sku_code:string, qty:int}> $items
     * @throws \RuntimeException 库存不足时抛出
     */
    public function lockBatch(array $items, string $orderNo): void
    {
        Db::startTrans();
        try {
            foreach ($items as $it) {
                $sku = $it['sku_code'];
                $qty = (int)$it['qty'];
                $row = Db::name('inventory_status')->where('sku_code', $sku)->lock(true)->find();
                if (!$row) {
                    throw new \RuntimeException("SKU 不存在: {$sku}");
                }
                $effective = $row['available'] - $row['buffer_qty'];
                if ($effective < $qty) {
                    throw new \RuntimeException("库存不足: {$sku} 可用 {$effective}, 需要 {$qty}");
                }
                $beforeA = (int)$row['available'];
                $beforeL = (int)$row['locked'];
                $afterA = $beforeA - $qty;
                $afterL = $beforeL + $qty;

                Db::name('inventory_status')
                    ->where('sku_code', $sku)
                    ->update(['available' => $afterA, 'locked' => $afterL]);

                Db::name('inventory_log')->insert([
                    'sku_code' => $sku,
                    'change_type' => 'lock',
                    'change_qty' => -$qty,
                    'before_available' => $beforeA,
                    'after_available' => $afterA,
                    'before_locked' => $beforeL,
                    'after_locked' => $afterL,
                    'related_order' => $orderNo,
                    'operator' => 'system',
                ]);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 批量解锁（取消订单 / 支付超时）
     * @param array<int, array{sku_code:string, qty:int}> $items
     */
    public function unlockBatch(array $items, string $orderNo): void
    {
        Db::startTrans();
        try {
            foreach ($items as $it) {
                $sku = $it['sku_code'];
                $qty = (int)$it['qty'];
                $row = Db::name('inventory_status')->where('sku_code', $sku)->lock(true)->find();
                if (!$row) continue;
                $beforeA = (int)$row['available'];
                $beforeL = (int)$row['locked'];
                $afterA = $beforeA + $qty;
                $afterL = max(0, $beforeL - $qty);

                Db::name('inventory_status')
                    ->where('sku_code', $sku)
                    ->update(['available' => $afterA, 'locked' => $afterL]);

                Db::name('inventory_log')->insert([
                    'sku_code' => $sku,
                    'change_type' => 'unlock',
                    'change_qty' => $qty,
                    'before_available' => $beforeA,
                    'after_available' => $afterA,
                    'before_locked' => $beforeL,
                    'after_locked' => $afterL,
                    'related_order' => $orderNo,
                    'operator' => 'system',
                ]);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 批量出库（实物已发货）：locked - qty
     * @param array<int, array{sku_code:string, qty:int}> $items
     */
    public function outboundBatch(array $items, string $orderNo): void
    {
        Db::startTrans();
        try {
            foreach ($items as $it) {
                $sku = $it['sku_code'];
                $qty = (int)$it['qty'];
                $row = Db::name('inventory_status')->where('sku_code', $sku)->lock(true)->find();
                if (!$row) continue;
                $beforeA = (int)$row['available'];
                $beforeL = (int)$row['locked'];
                $afterL = max(0, $beforeL - $qty);

                Db::name('inventory_status')
                    ->where('sku_code', $sku)
                    ->update(['locked' => $afterL]);

                Db::name('inventory_log')->insert([
                    'sku_code' => $sku,
                    'change_type' => 'outbound',
                    'change_qty' => -$qty,
                    'before_available' => $beforeA,
                    'after_available' => $beforeA,
                    'before_locked' => $beforeL,
                    'after_locked' => $afterL,
                    'related_order' => $orderNo,
                    'operator' => 'wms',
                ]);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 退货预留（退货退款审批通过时调）：locked / available 都不动
     *   - 货物在"运回中"，仍占用库存账面（locked 已扣，但实物未到）
     *   - 仅 reserved + qty 做账面标记，便于财务对账
     * @param array<int, array{sku_code:string, qty:int}> $items
     */
    public function reserveBatch(array $items, string $refundNo): void
    {
        Db::startTrans();
        try {
            foreach ($items as $it) {
                $sku = $it['sku_code'];
                $qty = (int)$it['qty'];
                $row = Db::name('inventory_status')->where('sku_code', $sku)->lock(true)->find();
                if (!$row) {
                    Db::name('inventory_status')->insert([
                        'sku_code' => $sku, 'available' => 0, 'locked' => 0,
                        'reserved' => $qty, 'buffer_qty' => 0,
                    ]);
                    Db::name('inventory_log')->insert([
                        'sku_code' => $sku, 'change_type' => 'reserve', 'change_qty' => $qty,
                        'before_available' => 0, 'after_available' => 0,
                        'before_locked' => 0, 'after_locked' => 0,
                        'related_order' => $refundNo, 'operator' => 'system',
                    ]);
                    continue;
                }
                $beforeA = (int)$row['available'];
                $beforeL = (int)$row['locked'];
                $beforeR = (int)$row['reserved'];
                $afterR = $beforeR + $qty;

                Db::name('inventory_status')
                    ->where('sku_code', $sku)
                    ->update(['reserved' => $afterR]);

                Db::name('inventory_log')->insert([
                    'sku_code' => $sku, 'change_type' => 'reserve', 'change_qty' => $qty,
                    'before_available' => $beforeA, 'after_available' => $beforeA,
                    'before_locked' => $beforeL, 'after_locked' => $beforeL,
                    'related_order' => $refundNo, 'operator' => 'system',
                ]);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 退货收到（WMS 入库 source_type=return 时）：reserved -N + available +N
     * @param array<int, array{sku_code:string, qty:int}> $items
     */
    public function receiveBackBatch(array $items, string $refundNo): void
    {
        Db::startTrans();
        try {
            foreach ($items as $it) {
                $sku = $it['sku_code'];
                $qty = (int)$it['qty'];
                $row = Db::name('inventory_status')->where('sku_code', $sku)->lock(true)->find();
                if (!$row) continue;

                $beforeA = (int)$row['available'];
                $beforeL = (int)$row['locked'];
                $beforeR = (int)$row['reserved'];
                $afterA = $beforeA + $qty;
                $afterR = max(0, $beforeR - $qty);

                Db::name('inventory_status')
                    ->where('sku_code', $sku)
                    ->update(['available' => $afterA, 'reserved' => $afterR]);

                Db::name('inventory_log')->insert([
                    'sku_code' => $sku, 'change_type' => 'receive_back', 'change_qty' => $qty,
                    'before_available' => $beforeA, 'after_available' => $afterA,
                    'before_locked' => $beforeL, 'after_locked' => $beforeL,
                    'related_order' => $refundNo, 'operator' => 'wms',
                ]);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
    }

    /**
     * 拒绝退款或撤销预留：reserved -N，available 不变（货还在用户手里）
     * @param array<int, array{sku_code:string, qty:int}> $items
     */
    public function unreserveBatch(array $items, string $refundNo): void
    {
        Db::startTrans();
        try {
            foreach ($items as $it) {
                $sku = $it['sku_code'];
                $qty = (int)$it['qty'];
                $row = Db::name('inventory_status')->where('sku_code', $sku)->lock(true)->find();
                if (!$row) continue;

                $beforeA = (int)$row['available'];
                $beforeL = (int)$row['locked'];
                $beforeR = (int)$row['reserved'];
                $afterR = max(0, $beforeR - $qty);

                Db::name('inventory_status')
                    ->where('sku_code', $sku)
                    ->update(['reserved' => $afterR]);

                Db::name('inventory_log')->insert([
                    'sku_code' => $sku, 'change_type' => 'unreserve', 'change_qty' => -$qty,
                    'before_available' => $beforeA, 'after_available' => $beforeA,
                    'before_locked' => $beforeL, 'after_locked' => $beforeL,
                    'related_order' => $refundNo, 'operator' => 'system',
                ]);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
    }

    public function get(string $sku): array
    {
        $row = Db::name('inventory_status')->where('sku_code', $sku)->find();
        if (!$row) return ['sku_code' => $sku, 'available' => 0, 'locked' => 0];
        return [
            'sku_code' => $sku,
            'available' => (int)$row['available'],
            'locked' => (int)$row['locked'],
            'effective' => (int)($row['available'] - $row['buffer_qty']),
        ];
    }

    public function getBatch(array $skus): array
    {
        if (!$skus) return [];
        $rows = Db::name('inventory_status')->whereIn('sku_code', $skus)->select()->toArray();
        $map = [];
        foreach ($rows as $r) {
            $map[$r['sku_code']] = [
                'sku_code' => $r['sku_code'],
                'available' => (int)$r['available'],
                'locked' => (int)$r['locked'],
                'effective' => (int)($r['available'] - $r['buffer_qty']),
            ];
        }
        return $map;
    }
}
