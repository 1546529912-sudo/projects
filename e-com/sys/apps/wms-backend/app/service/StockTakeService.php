<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 盘点服务（iter-22）
 *   create → start(snapshot) → record(actual_qty) → complete(自动调差)
 *
 *   scope_type:
 *     - all        全仓盘点（按 warehouse_code 取所有 inventory）
 *     - zone       分区盘点（按 zone 找 locations 再找 inventory）
 *     - location   单库位盘点
 *     - sku        单 SKU 盘点（不限仓库或限 warehouse）
 */
class StockTakeService
{
    public function create(array $data): array
    {
        $required = ['warehouse_code', 'scope_type', 'created_by'];
        foreach ($required as $k) {
            if (empty($data[$k])) throw new \RuntimeException("{$k} 必传");
        }
        if (!in_array($data['scope_type'], ['all', 'zone', 'location', 'sku'], true)) {
            throw new \RuntimeException('scope_type 仅 all/zone/location/sku');
        }
        if (in_array($data['scope_type'], ['zone', 'location', 'sku'], true) && empty($data['scope_value'])) {
            throw new \RuntimeException("scope_type={$data['scope_type']} 需带 scope_value");
        }

        $takeNo = 'ST' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);
        Db::name('stock_takes')->insert([
            'take_no' => $takeNo,
            'warehouse_code' => $data['warehouse_code'],
            'scope_type' => $data['scope_type'],
            'scope_value' => $data['scope_value'] ?? null,
            'status' => 'draft',
            'created_by' => $data['created_by'],
            'remark' => $data['remark'] ?? '',
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->detail($takeNo);
    }

    public function list(array $filter = [], int $page = 1, int $size = 20): array
    {
        $q = Db::name('stock_takes');
        if (!empty($filter['warehouse_code'])) $q->where('warehouse_code', $filter['warehouse_code']);
        if (!empty($filter['status'])) $q->where('status', $filter['status']);
        $total = $q->count();
        $rows = (clone $q)->order('id', 'desc')->page($page, $size)->select()->toArray();
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    public function detail(string $takeNo): array
    {
        $take = Db::name('stock_takes')->where('take_no', $takeNo)->find();
        if (!$take) throw new \RuntimeException('盘点单不存在');
        $items = Db::name('stock_take_items')->where('take_no', $takeNo)->order('id', 'asc')->select()->toArray();
        return ['take' => $take, 'items' => $items];
    }

    /**
     * 起盘 → snapshot 当前 inventory 为 stock_take_items 的 system_qty
     */
    public function start(string $takeNo): array
    {
        return Db::transaction(function () use ($takeNo) {
            $take = Db::name('stock_takes')->where('take_no', $takeNo)->lock(true)->find();
            if (!$take) throw new \RuntimeException('盘点单不存在');
            if ($take['status'] !== 'draft') throw new \RuntimeException('仅 draft 状态可起盘');

            // 按 scope 取 inventory 行
            $q = Db::name('inventory')->where('status', 'normal');
            if ($take['scope_type'] === 'all') {
                // 全仓：先取该仓库下所有 location_code
                $locCodes = Db::name('locations')->where('warehouse_code', $take['warehouse_code'])->column('location_code');
                if (!$locCodes) {
                    // 无库位也可以提前完成（空盘）
                    Db::name('stock_takes')->where('take_no', $takeNo)->update(['status' => 'in_progress', 'started_at' => date('Y-m-d H:i:s')]);
                    return $this->detail($takeNo);
                }
                $q->whereIn('location_code', $locCodes);
            } elseif ($take['scope_type'] === 'zone') {
                $locCodes = Db::name('locations')
                    ->where('warehouse_code', $take['warehouse_code'])
                    ->where('zone', $take['scope_value'])
                    ->column('location_code');
                if (!$locCodes) {
                    Db::name('stock_takes')->where('take_no', $takeNo)->update(['status' => 'in_progress', 'started_at' => date('Y-m-d H:i:s')]);
                    return $this->detail($takeNo);
                }
                $q->whereIn('location_code', $locCodes);
            } elseif ($take['scope_type'] === 'location') {
                $q->where('location_code', $take['scope_value']);
            } elseif ($take['scope_type'] === 'sku') {
                $locCodes = Db::name('locations')->where('warehouse_code', $take['warehouse_code'])->column('location_code');
                $q->where('sku_code', $take['scope_value']);
                if ($locCodes) $q->whereIn('location_code', $locCodes);
            }

            $invRows = $q->select()->toArray();
            $now = date('Y-m-d H:i:s');
            $bulk = [];
            foreach ($invRows as $r) {
                $bulk[] = [
                    'take_no' => $takeNo,
                    'sku_code' => $r['sku_code'],
                    'location_code' => $r['location_code'],
                    'batch_no' => $r['batch_no'],
                    'system_qty' => (int)$r['quantity'],
                    'actual_qty' => null,
                    'diff' => null,
                    'status' => 'pending',
                ];
            }
            if ($bulk) Db::name('stock_take_items')->insertAll($bulk);
            Db::name('stock_takes')->where('take_no', $takeNo)->update([
                'status' => 'in_progress',
                'started_at' => $now,
            ]);
            return $this->detail($takeNo);
        });
    }

    public function record(string $takeNo, int $itemId, int $actualQty): array
    {
        if ($actualQty < 0) throw new \RuntimeException('actual_qty 不能 < 0');
        $take = Db::name('stock_takes')->where('take_no', $takeNo)->find();
        if (!$take) throw new \RuntimeException('盘点单不存在');
        if ($take['status'] !== 'in_progress') throw new \RuntimeException('仅 in_progress 可录入');
        $item = Db::name('stock_take_items')->where('id', $itemId)->where('take_no', $takeNo)->find();
        if (!$item) throw new \RuntimeException('明细不存在');
        Db::name('stock_take_items')->where('id', $itemId)->update([
            'actual_qty' => $actualQty,
            'diff' => $actualQty - (int)$item['system_qty'],
            'status' => 'counted',
        ]);
        return Db::name('stock_take_items')->where('id', $itemId)->find();
    }

    public function complete(string $takeNo): array
    {
        return Db::transaction(function () use ($takeNo) {
            $take = Db::name('stock_takes')->where('take_no', $takeNo)->lock(true)->find();
            if (!$take) throw new \RuntimeException('盘点单不存在');
            if ($take['status'] !== 'in_progress') throw new \RuntimeException('仅 in_progress 可完成');

            $logSvc = new WmsInventoryLogService();
            $operator = $take['created_by'] ?? 'system';
            // 用来推事件给 OMS
            $deltaByKey = [];  // sku_code => total_delta（OMS 视角，盘盈+ 盘亏-）

            $items = Db::name('stock_take_items')->where('take_no', $takeNo)->select()->toArray();
            foreach ($items as $it) {
                if ($it['actual_qty'] === null) continue;
                $diff = (int)$it['actual_qty'] - (int)$it['system_qty'];
                if ($diff === 0) continue;

                $inv = Db::name('inventory')
                    ->where('sku_code', $it['sku_code'])
                    ->where('location_code', $it['location_code'])
                    ->where('batch_no', $it['batch_no'])
                    ->lock(true)->find();
                if (!$inv) {
                    if ($diff > 0) {
                        Db::name('inventory')->insert([
                            'sku_code' => $it['sku_code'],
                            'location_code' => $it['location_code'],
                            'batch_no' => $it['batch_no'],
                            'status' => 'normal',
                            'quantity' => $diff,
                            'locked_quantity' => 0,
                        ]);
                        $logSvc->write([
                            'sku_code' => $it['sku_code'], 'location_code' => $it['location_code'], 'batch_no' => $it['batch_no'],
                            'change_type' => 'stock_take_in', 'delta' => $diff,
                            'before_quantity' => 0, 'after_quantity' => $diff,
                            'before_locked' => 0, 'after_locked' => 0,
                            'ref_no' => $takeNo, 'operator' => $operator,
                        ]);
                        $deltaByKey[$it['sku_code']] = ($deltaByKey[$it['sku_code']] ?? 0) + $diff;
                    }
                    continue;
                }
                $newQty = max(0, (int)$inv['quantity'] + $diff);
                $actualDelta = $newQty - (int)$inv['quantity'];  // 兜底（盘亏不能让 quantity 变负）
                Db::name('inventory')->where('id', $inv['id'])->update(['quantity' => $newQty]);
                $logSvc->write([
                    'sku_code' => $it['sku_code'], 'location_code' => $it['location_code'], 'batch_no' => $it['batch_no'],
                    'change_type' => $diff > 0 ? 'stock_take_in' : 'stock_take_out',
                    'delta' => $actualDelta,
                    'before_quantity' => (int)$inv['quantity'], 'after_quantity' => $newQty,
                    'before_locked' => (int)$inv['locked_quantity'], 'after_locked' => (int)$inv['locked_quantity'],
                    'ref_no' => $takeNo, 'operator' => $operator,
                ]);
                $deltaByKey[$it['sku_code']] = ($deltaByKey[$it['sku_code']] ?? 0) + $actualDelta;
            }

            Db::name('stock_takes')->where('take_no', $takeNo)->update([
                'status' => 'completed',
                'completed_at' => date('Y-m-d H:i:s'),
            ]);

            // iter-24 P0-3: tx 后推事件
            if ($deltaByKey) {
                $this->_pendingEvent = [
                    'take_no' => $takeNo,
                    'warehouse_code' => $take['warehouse_code'],
                    'items' => array_map(fn($sku, $d) => ['sku_code' => $sku, 'delta' => $d], array_keys($deltaByKey), array_values($deltaByKey)),
                ];
            }
            return $this->detail($takeNo);
        });
    }

    /** iter-24: tx 后从外部读取，由 controller 调用 publishPendingEvent() 发送 */
    private array $_pendingEvent = [];
    public function publishPendingEvent(): void
    {
        if (!$this->_pendingEvent) return;
        try {
            (new EventBus())->publish('wms.inventory.changed', $this->_pendingEvent);
        } catch (\Throwable $e) {
            // 推送失败不阻塞业务（已写库 + 已落 log）
        }
        $this->_pendingEvent = [];
    }

    public function cancel(string $takeNo): array
    {
        $take = Db::name('stock_takes')->where('take_no', $takeNo)->find();
        if (!$take) throw new \RuntimeException('盘点单不存在');
        if (!in_array($take['status'], ['draft', 'in_progress'], true)) {
            throw new \RuntimeException('当前状态不可取消');
        }
        Db::name('stock_takes')->where('take_no', $takeNo)->update(['status' => 'cancelled']);
        return $this->detail($takeNo);
    }
}
