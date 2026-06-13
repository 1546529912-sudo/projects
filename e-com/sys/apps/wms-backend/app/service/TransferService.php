<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 调拨服务（iter-22 单 SKU；iter-23 升级为多 SKU 批量）
 *
 *   一头多明细：
 *     - transfers 头：from_warehouse + to_warehouse + status + 元数据
 *     - transfer_items 明细：每行独立 from/to 库位 + SKU + 批次 + qty
 *
 *   状态机：draft → in_transit → completed | cancelled（全单维度）
 *   旧数据兼容：transfers 表 inline 字段（sku_code/from_location/to_location/qty/batch_no）改为 nullable，
 *              对于 iter-22 留下的 legacy 单 SKU 行，detail/list 时仍能读 inline 字段直接展示。
 */
class TransferService
{
    public function create(array $data): array
    {
        foreach (['from_warehouse', 'to_warehouse', 'created_by'] as $k) {
            if (empty($data[$k])) throw new \RuntimeException("{$k} 必传");
        }
        $items = $data['items'] ?? [];
        if (!is_array($items) || !$items) {
            throw new \RuntimeException('items 不能为空');
        }
        // 逐行校验
        foreach ($items as $idx => $it) {
            $lineNo = $idx + 1;
            foreach (['from_location', 'to_location', 'sku_code', 'qty'] as $k) {
                if (!isset($it[$k]) || $it[$k] === '' || $it[$k] === null) {
                    throw new \RuntimeException("行 {$lineNo} 缺少字段 {$k}");
                }
            }
            if ((int)$it['qty'] <= 0) {
                throw new \RuntimeException("行 {$lineNo} qty 必须 > 0");
            }
            if ($it['from_location'] === $it['to_location']) {
                throw new \RuntimeException("行 {$lineNo} 源库位与目标库位不能相同");
            }
            $fromLoc = Db::name('locations')->where('location_code', $it['from_location'])->find();
            if (!$fromLoc) throw new \RuntimeException("行 {$lineNo} 源库位不存在: {$it['from_location']}");
            $toLoc = Db::name('locations')->where('location_code', $it['to_location'])->find();
            if (!$toLoc) throw new \RuntimeException("行 {$lineNo} 目标库位不存在: {$it['to_location']}");
            if ($fromLoc['warehouse_code'] !== $data['from_warehouse']) {
                throw new \RuntimeException("行 {$lineNo} 源库位不属于源仓库");
            }
            if ($toLoc['warehouse_code'] !== $data['to_warehouse']) {
                throw new \RuntimeException("行 {$lineNo} 目标库位不属于目标仓库");
            }
        }

        // iter-61 Q38-01：跨店调拨需平台代理审核
        $fromWh = Db::name('warehouses')->where('warehouse_code', $data['from_warehouse'])->find();
        $toWh = Db::name('warehouses')->where('warehouse_code', $data['to_warehouse'])->find();
        $fromStore = (int)($fromWh['store_id'] ?? 1);
        $toStore = (int)($toWh['store_id'] ?? 1);
        $isCrossStore = $fromStore !== $toStore;
        $needsReview = 0;
        if ($isCrossStore) {
            try {
                $row = Db::connect('oms')->name('system_configs')->where('config_key', 'wms.transfer_cross_store_review')->find();
                $needsReview = $row && $row['config_value'] === '1' ? 1 : 0;
            } catch (\Throwable $e) { $needsReview = 1; }
        }

        return Db::transaction(function () use ($data, $items, $fromStore, $toStore, $needsReview) {
            $transferNo = 'TR' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);
            Db::name('transfers')->insert([
                'transfer_no' => $transferNo,
                'from_warehouse' => $data['from_warehouse'],
                'to_warehouse' => $data['to_warehouse'],
                'status' => 'draft',
                'needs_review' => $needsReview,
                'cross_store_from' => $fromStore,
                'cross_store_to' => $toStore,
                'created_by' => $data['created_by'],
                'remark' => $data['remark'] ?? '',
                'created_at' => date('Y-m-d H:i:s'),
            ]);
            $bulk = [];
            foreach ($items as $idx => $it) {
                $bulk[] = [
                    'transfer_no' => $transferNo,
                    'line_no' => $idx + 1,
                    'sku_code' => $it['sku_code'],
                    'batch_no' => $it['batch_no'] ?? 'INIT',
                    'from_location' => $it['from_location'],
                    'to_location' => $it['to_location'],
                    'qty' => (int)$it['qty'],
                ];
            }
            Db::name('transfer_items')->insertAll($bulk);
            return $this->detail($transferNo);
        });
    }

    public function list(array $filter = [], int $page = 1, int $size = 20): array
    {
        $q = Db::name('transfers');
        if (!empty($filter['status'])) $q->where('status', $filter['status']);
        if (!empty($filter['from_warehouse'])) $q->where('from_warehouse', $filter['from_warehouse']);
        if (!empty($filter['to_warehouse'])) $q->where('to_warehouse', $filter['to_warehouse']);
        $total = $q->count();
        $rows = (clone $q)->order('id', 'desc')->page($page, $size)->select()->toArray();
        // 给每行打上 item_count（=明细数；legacy 单 SKU 行为 0 → 渲染时回退 inline）
        $nos = array_column($rows, 'transfer_no');
        $counts = [];
        if ($nos) {
            $cntRows = Db::name('transfer_items')
                ->whereIn('transfer_no', $nos)
                ->field('transfer_no, COUNT(*) AS cnt')
                ->group('transfer_no')
                ->select()->toArray();
            foreach ($cntRows as $cr) $counts[$cr['transfer_no']] = (int)$cr['cnt'];
        }
        foreach ($rows as &$r) {
            $r['item_count'] = $counts[$r['transfer_no']] ?? 0;
            $r['is_legacy_single'] = $r['item_count'] === 0;
        }
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    public function detail(string $transferNo): array
    {
        $head = Db::name('transfers')->where('transfer_no', $transferNo)->find();
        if (!$head) throw new \RuntimeException('调拨单不存在');
        $items = Db::name('transfer_items')->where('transfer_no', $transferNo)->order('line_no', 'asc')->select()->toArray();
        $head['item_count'] = count($items);
        $head['is_legacy_single'] = count($items) === 0;
        return ['head' => $head, 'items' => $items];
    }

    /**
     * 起运：遍历所有 items（或 legacy 单行）逐条 from 库位 locked++
     *      tx 内任一失败全 rollback
     */
    public function ship(string $transferNo): array
    {
        return Db::transaction(function () use ($transferNo) {
            $t = Db::name('transfers')->where('transfer_no', $transferNo)->lock(true)->find();
            if (!$t) throw new \RuntimeException('调拨单不存在');
            if ($t['status'] !== 'draft') throw new \RuntimeException('仅 draft 可起运');
            // iter-61 Q38-01：跨店未审核 → 拒
            if ((int)($t['needs_review'] ?? 0) === 1 && empty($t['reviewed_at'])) {
                throw new \RuntimeException('跨店调拨需平台代理审核后方可起运');
            }
            $items = $this->itemsOrLegacy($transferNo, $t);
            $logSvc = new WmsInventoryLogService();
            $operator = $t['created_by'] ?? 'system';

            foreach ($items as $i => $it) {
                $lineNo = $it['line_no'] ?? ($i + 1);
                $inv = Db::name('inventory')
                    ->where('sku_code', $it['sku_code'])
                    ->where('location_code', $it['from_location'])
                    ->where('batch_no', $it['batch_no'])
                    ->where('status', 'normal')
                    ->lock(true)->find();
                if (!$inv) throw new \RuntimeException("行 {$lineNo} 源库位无该 SKU/批次");
                $avail = (int)$inv['quantity'] - (int)$inv['locked_quantity'];
                if ($avail < (int)$it['qty']) {
                    throw new \RuntimeException("行 {$lineNo} 源库位可用不足：可用 {$avail}，需要 {$it['qty']}");
                }
                $newLocked = (int)$inv['locked_quantity'] + (int)$it['qty'];
                Db::name('inventory')->where('id', $inv['id'])->update(['locked_quantity' => $newLocked]);
                $logSvc->write([
                    'sku_code' => $it['sku_code'], 'location_code' => $it['from_location'], 'batch_no' => $it['batch_no'],
                    'change_type' => 'lock', 'delta' => 0,
                    'before_quantity' => (int)$inv['quantity'], 'after_quantity' => (int)$inv['quantity'],
                    'before_locked' => (int)$inv['locked_quantity'], 'after_locked' => $newLocked,
                    'ref_no' => $transferNo, 'operator' => $operator,
                    'remark' => 'transfer ship',
                ]);
            }
            Db::name('transfers')->where('transfer_no', $transferNo)->update([
                'status' => 'in_transit',
                'shipped_at' => date('Y-m-d H:i:s'),
            ]);
            return $this->detail($transferNo);
        });
    }

    /**
     * 接收：遍历所有 items，逐条 from -- + locked -- + to ++
     */
    public function receive(string $transferNo): array
    {
        $result = Db::transaction(function () use ($transferNo) {
            $t = Db::name('transfers')->where('transfer_no', $transferNo)->lock(true)->find();
            if (!$t) throw new \RuntimeException('调拨单不存在');
            if ($t['status'] !== 'in_transit') throw new \RuntimeException('仅 in_transit 可接收');
            $items = $this->itemsOrLegacy($transferNo, $t);
            $logSvc = new WmsInventoryLogService();
            $operator = $t['created_by'] ?? 'system';

            // 用来推事件给 OMS（按 sku 聚合 from/to delta）
            $omsDelta = [];  // sku_code => total delta（同仓库 = 0，跨仓库 = from 负 to 正）

            foreach ($items as $i => $it) {
                $lineNo = $it['line_no'] ?? ($i + 1);
                $fromInv = Db::name('inventory')
                    ->where('sku_code', $it['sku_code'])
                    ->where('location_code', $it['from_location'])
                    ->where('batch_no', $it['batch_no'])
                    ->lock(true)->find();
                if (!$fromInv) throw new \RuntimeException("行 {$lineNo} 源库存丢失");
                $newFromQty = max(0, (int)$fromInv['quantity'] - (int)$it['qty']);
                $newFromLocked = max(0, (int)$fromInv['locked_quantity'] - (int)$it['qty']);
                Db::name('inventory')->where('id', $fromInv['id'])->update([
                    'quantity' => $newFromQty,
                    'locked_quantity' => $newFromLocked,
                ]);
                $logSvc->write([
                    'sku_code' => $it['sku_code'], 'location_code' => $it['from_location'], 'batch_no' => $it['batch_no'],
                    'change_type' => 'transfer_out', 'delta' => -((int)$it['qty']),
                    'before_quantity' => (int)$fromInv['quantity'], 'after_quantity' => $newFromQty,
                    'before_locked' => (int)$fromInv['locked_quantity'], 'after_locked' => $newFromLocked,
                    'ref_no' => $transferNo, 'operator' => $operator,
                    'remark' => "→ {$it['to_location']}",
                ]);

                $toInv = Db::name('inventory')
                    ->where('sku_code', $it['sku_code'])
                    ->where('location_code', $it['to_location'])
                    ->where('batch_no', $it['batch_no'])
                    ->lock(true)->find();
                if (!$toInv) {
                    Db::name('inventory')->insert([
                        'sku_code' => $it['sku_code'],
                        'location_code' => $it['to_location'],
                        'batch_no' => $it['batch_no'],
                        'status' => 'normal',
                        'quantity' => (int)$it['qty'],
                        'locked_quantity' => 0,
                    ]);
                    $logSvc->write([
                        'sku_code' => $it['sku_code'], 'location_code' => $it['to_location'], 'batch_no' => $it['batch_no'],
                        'change_type' => 'transfer_in', 'delta' => (int)$it['qty'],
                        'before_quantity' => 0, 'after_quantity' => (int)$it['qty'],
                        'before_locked' => 0, 'after_locked' => 0,
                        'ref_no' => $transferNo, 'operator' => $operator,
                        'remark' => "← {$it['from_location']}",
                    ]);
                } else {
                    $newToQty = (int)$toInv['quantity'] + (int)$it['qty'];
                    Db::name('inventory')->where('id', $toInv['id'])->update(['quantity' => $newToQty]);
                    $logSvc->write([
                        'sku_code' => $it['sku_code'], 'location_code' => $it['to_location'], 'batch_no' => $it['batch_no'],
                        'change_type' => 'transfer_in', 'delta' => (int)$it['qty'],
                        'before_quantity' => (int)$toInv['quantity'], 'after_quantity' => $newToQty,
                        'before_locked' => (int)$toInv['locked_quantity'], 'after_locked' => (int)$toInv['locked_quantity'],
                        'ref_no' => $transferNo, 'operator' => $operator,
                        'remark' => "← {$it['from_location']}",
                    ]);
                }

                // OMS 视角：仅当跨仓库才算变化
                if ($t['from_warehouse'] !== $t['to_warehouse']) {
                    $omsDelta[$it['sku_code']] = ($omsDelta[$it['sku_code']] ?? 0);
                }
            }
            Db::name('transfers')->where('transfer_no', $transferNo)->update([
                'status' => 'completed',
                'completed_at' => date('Y-m-d H:i:s'),
            ]);

            // iter-24 P0-2: 推事件给 OMS（含 transfer_no，OMS 仅审计）
            $this->_pendingEvent = [
                'transfer_no' => $transferNo,
                'from_warehouse' => $t['from_warehouse'],
                'to_warehouse' => $t['to_warehouse'],
                'items' => array_map(
                    fn($it) => ['sku_code' => $it['sku_code'], 'qty' => (int)$it['qty'], 'from_location' => $it['from_location'], 'to_location' => $it['to_location']],
                    $items
                ),
            ];
            return $this->detail($transferNo);
        });
        return $result;
    }

    /** iter-24: tx 后从外部读取，由 controller 调用 publishPendingEvent() 发送 */
    private array $_pendingEvent = [];
    public function publishPendingEvent(): void
    {
        if (!$this->_pendingEvent) return;
        try {
            (new EventBus())->publish('wms.inventory.changed', $this->_pendingEvent);
        } catch (\Throwable $e) { /* 推送失败不阻塞 */ }
        $this->_pendingEvent = [];
    }

    /**
     * iter-61 Q38-01：平台代理审核通过 → 清 needs_review，记 reviewer
     */
    public function review(string $transferNo, string $operator): array
    {
        $t = Db::name('transfers')->where('transfer_no', $transferNo)->find();
        if (!$t) throw new \RuntimeException('调拨单不存在');
        if ((int)($t['needs_review'] ?? 0) !== 1) throw new \RuntimeException('该单无需审核');
        if (!empty($t['reviewed_at'])) throw new \RuntimeException('已审核过');
        Db::name('transfers')->where('transfer_no', $transferNo)->update([
            'needs_review' => 0,
            'reviewed_by' => $operator,
            'reviewed_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->detail($transferNo);
    }

    /**
     * iter-69 Q23-01 部分接收：指定 item 的部分数量
     * @param array $partials [{line_no, received_qty}, ...]
     */
    public function receivePartial(string $transferNo, array $partials): array
    {
        return Db::transaction(function () use ($transferNo, $partials) {
            $t = Db::name('transfers')->where('transfer_no', $transferNo)->lock(true)->find();
            if (!$t) throw new \RuntimeException('调拨单不存在');
            if ($t['status'] !== 'shipped') throw new \RuntimeException('仅 shipped 可部分接收');
            foreach ($partials as $p) {
                $lineNo = (int)($p['line_no'] ?? 0);
                $rq = (int)($p['received_qty'] ?? 0);
                if ($lineNo <= 0 || $rq <= 0) continue;
                $line = Db::name('transfer_items')->where('transfer_no', $transferNo)->where('line_no', $lineNo)->lock(true)->find();
                if (!$line) continue;
                if ($rq > (int)$line['qty']) throw new \RuntimeException("行 {$lineNo} 接收数量 {$rq} 超过期望 {$line['qty']}");
                Db::name('transfer_items')->where('id', $line['id'])->update([
                    'received_qty' => $rq,
                    'line_status' => $rq >= (int)$line['qty'] ? 'received' : 'shipped',
                ]);
            }
            // 全部 received 才置 head=received
            $stillPending = Db::name('transfer_items')->where('transfer_no', $transferNo)->where('line_status', '<>', 'received')->count();
            if ($stillPending === 0) {
                Db::name('transfers')->where('transfer_no', $transferNo)->update(['status' => 'received']);
            }
            return $this->detail($transferNo);
        });
    }

    /**
     * iter-69 Q23-02 调拨行级取消
     */
    public function cancelLine(string $transferNo, int $lineNo, string $reason = ''): array
    {
        return Db::transaction(function () use ($transferNo, $lineNo, $reason) {
            $line = Db::name('transfer_items')->where('transfer_no', $transferNo)->where('line_no', $lineNo)->find();
            if (!$line) throw new \RuntimeException('行不存在');
            if (($line['line_status'] ?? 'draft') === 'received') throw new \RuntimeException('已接收行无法取消');
            Db::name('transfer_items')->where('id', $line['id'])->update([
                'line_status' => 'cancelled',
                'line_cancel_reason' => mb_substr($reason ?: '运营取消', 0, 200),
            ]);
            return $this->detail($transferNo);
        });
    }

    public function cancel(string $transferNo): array
    {
        return Db::transaction(function () use ($transferNo) {
            $t = Db::name('transfers')->where('transfer_no', $transferNo)->lock(true)->find();
            if (!$t) throw new \RuntimeException('调拨单不存在');
            if (!in_array($t['status'], ['draft', 'in_transit'], true)) {
                throw new \RuntimeException('当前状态不可取消');
            }
            if ($t['status'] === 'in_transit') {
                $items = $this->itemsOrLegacy($transferNo, $t);
                $logSvc = new WmsInventoryLogService();
                $operator = $t['created_by'] ?? 'system';
                foreach ($items as $it) {
                    $inv = Db::name('inventory')
                        ->where('sku_code', $it['sku_code'])
                        ->where('location_code', $it['from_location'])
                        ->where('batch_no', $it['batch_no'])
                        ->lock(true)->find();
                    if ($inv) {
                        $newLocked = max(0, (int)$inv['locked_quantity'] - (int)$it['qty']);
                        Db::name('inventory')->where('id', $inv['id'])->update(['locked_quantity' => $newLocked]);
                        $logSvc->write([
                            'sku_code' => $it['sku_code'], 'location_code' => $it['from_location'], 'batch_no' => $it['batch_no'],
                            'change_type' => 'unlock', 'delta' => 0,
                            'before_quantity' => (int)$inv['quantity'], 'after_quantity' => (int)$inv['quantity'],
                            'before_locked' => (int)$inv['locked_quantity'], 'after_locked' => $newLocked,
                            'ref_no' => $transferNo, 'operator' => $operator,
                            'remark' => 'transfer cancel',
                        ]);
                    }
                }
            }
            Db::name('transfers')->where('transfer_no', $transferNo)->update(['status' => 'cancelled']);
            return $this->detail($transferNo);
        });
    }

    /**
     * 取行：优先 transfer_items，没有则按 legacy 单 SKU 模式构造 1 条
     */
    private function itemsOrLegacy(string $transferNo, array $head): array
    {
        $items = Db::name('transfer_items')->where('transfer_no', $transferNo)->order('line_no', 'asc')->select()->toArray();
        if ($items) return $items;
        if (!empty($head['sku_code']) && !empty($head['from_location'])) {
            return [[
                'line_no' => 1,
                'sku_code' => $head['sku_code'],
                'batch_no' => $head['batch_no'] ?? 'INIT',
                'from_location' => $head['from_location'],
                'to_location' => $head['to_location'],
                'qty' => (int)$head['qty'],
            ]];
        }
        throw new \RuntimeException('调拨单无明细');
    }
}
