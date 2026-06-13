<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * WMS 实物库存服务
 *   - findAvailable(sku, qty)：找单个能满足数量的库位（MVP 简化：不跨库位拼单）
 *   - lock：增加 locked_quantity（拣货任务分配时）
 *   - deduct：减 quantity & locked_quantity（出库扫码时）
 *   - unlock：减 locked_quantity（取消时回滚）
 *
 * iter-24 P0-1: 所有变动通过 WmsInventoryLogService 落日志，调用方需在事务内调用
 *   - 新参数 refNo / operator 全部可选，向后兼容
 */
class InventoryService
{
    private WmsInventoryLogService $log;
    public function __construct() { $this->log = new WmsInventoryLogService(); }

    /**
     * 找一个能满足 qty 的库位
     *   iter-25 FIFO 策略：
     *     - INIT（种子默认批次）视为最老，永远排首位
     *     - 其他 BATCH-yyyymmdd 按字典序自然递增（旧 → 新）
     *     - 同批次内 locked_quantity ASC（倾向 locked 少的库位）
     *   不跨库位拼单
     */
    public function findAvailable(string $sku, int $qty): ?array
    {
        $row = Db::name('inventory')
            ->where('sku_code', $sku)
            ->where('status', 'normal')
            ->whereRaw('quantity - locked_quantity >= ?', [$qty])
            ->orderRaw("CASE WHEN batch_no = 'INIT' THEN 0 ELSE 1 END ASC")
            ->order('batch_no', 'asc')
            ->order('locked_quantity', 'asc')
            ->find();
        if (!$row) return null;
        return [
            'location_code' => $row['location_code'],
            'batch_no' => $row['batch_no'],
            'available' => (int)($row['quantity'] - $row['locked_quantity']),
        ];
    }

    public function lock(string $sku, string $location, string $batch, int $qty, ?string $refNo = null, string $operator = 'system'): void
    {
        $row = Db::name('inventory')
            ->where('sku_code', $sku)
            ->where('location_code', $location)
            ->where('batch_no', $batch)
            ->where('status', 'normal')
            ->lock(true)->find();
        if (!$row) throw new \RuntimeException("库存行不存在: {$sku}@{$location}");
        if (($row['quantity'] - $row['locked_quantity']) < $qty) {
            throw new \RuntimeException("库位可用不足: {$sku}@{$location}");
        }
        $newLocked = (int)$row['locked_quantity'] + $qty;
        Db::name('inventory')->where('id', $row['id'])->update(['locked_quantity' => $newLocked]);
        $this->log->write([
            'sku_code' => $sku, 'location_code' => $location, 'batch_no' => $batch,
            'change_type' => 'lock', 'delta' => 0,
            'before_quantity' => (int)$row['quantity'], 'after_quantity' => (int)$row['quantity'],
            'before_locked' => (int)$row['locked_quantity'], 'after_locked' => $newLocked,
            'ref_no' => $refNo, 'operator' => $operator,
        ]);
    }

    public function deduct(string $sku, string $location, string $batch, int $qty, ?string $refNo = null, string $operator = 'system'): void
    {
        $row = Db::name('inventory')
            ->where('sku_code', $sku)
            ->where('location_code', $location)
            ->where('batch_no', $batch)
            ->where('status', 'normal')
            ->lock(true)->find();
        if (!$row) throw new \RuntimeException("库存行不存在: {$sku}@{$location}");
        if ($row['locked_quantity'] < $qty) {
            throw new \RuntimeException("locked_quantity 不足: {$sku}@{$location}");
        }
        $newQty = (int)$row['quantity'] - $qty;
        $newLocked = (int)$row['locked_quantity'] - $qty;
        Db::name('inventory')->where('id', $row['id'])->update([
            'quantity' => $newQty,
            'locked_quantity' => $newLocked,
        ]);
        $this->log->write([
            'sku_code' => $sku, 'location_code' => $location, 'batch_no' => $batch,
            'change_type' => 'outbound', 'delta' => -$qty,
            'before_quantity' => (int)$row['quantity'], 'after_quantity' => $newQty,
            'before_locked' => (int)$row['locked_quantity'], 'after_locked' => $newLocked,
            'ref_no' => $refNo, 'operator' => $operator,
        ]);
    }

    public function unlock(string $sku, string $location, string $batch, int $qty, ?string $refNo = null, string $operator = 'system'): void
    {
        $row = Db::name('inventory')
            ->where('sku_code', $sku)
            ->where('location_code', $location)
            ->where('batch_no', $batch)
            ->where('status', 'normal')
            ->lock(true)->find();
        if (!$row) return;
        $newLocked = max(0, (int)$row['locked_quantity'] - $qty);
        $actualDelta = (int)$row['locked_quantity'] - $newLocked;  // 实际释放量
        Db::name('inventory')->where('id', $row['id'])->update(['locked_quantity' => $newLocked]);
        $this->log->write([
            'sku_code' => $sku, 'location_code' => $location, 'batch_no' => $batch,
            'change_type' => 'unlock', 'delta' => 0,
            'before_quantity' => (int)$row['quantity'], 'after_quantity' => (int)$row['quantity'],
            'before_locked' => (int)$row['locked_quantity'], 'after_locked' => $newLocked,
            'ref_no' => $refNo, 'operator' => $operator,
            'remark' => $actualDelta !== $qty ? "请求 {$qty}，实际释放 {$actualDelta}" : '',
        ]);
    }

    /**
     * iter-24: 入库直增（不走 locked 路径，仅 quantity++）
     *   入库流程当前在 Inbound::autoComplete 内直接改 inventory；为了统一 log 入口，
     *   提供本方法供调用方 opt-in。
     */
    public function inbound(string $sku, string $location, string $batch, int $qty, ?string $refNo = null, string $operator = 'system'): void
    {
        $row = Db::name('inventory')
            ->where('sku_code', $sku)
            ->where('location_code', $location)
            ->where('batch_no', $batch)
            ->lock(true)->find();
        if (!$row) {
            // iter-38 BIZ-08-4: 从 location 拿 warehouse_code → warehouse 拿 store_id
            $storeId = 1;
            try {
                $whCode = Db::name('locations')->where('location_code', $location)->value('warehouse_code');
                if ($whCode) $storeId = (int)(Db::name('warehouses')->where('warehouse_code', $whCode)->value('store_id') ?: 1);
            } catch (\Throwable $e) { /* fallback to 1 */ }
            Db::name('inventory')->insert([
                'sku_code' => $sku, 'location_code' => $location, 'batch_no' => $batch,
                'store_id' => $storeId,
                'status' => 'normal', 'quantity' => $qty, 'locked_quantity' => 0,
            ]);
            $this->log->write([
                'sku_code' => $sku, 'location_code' => $location, 'batch_no' => $batch,
                'change_type' => 'inbound', 'delta' => $qty,
                'before_quantity' => 0, 'after_quantity' => $qty,
                'before_locked' => 0, 'after_locked' => 0,
                'ref_no' => $refNo, 'operator' => $operator,
            ]);
            return;
        }
        $newQty = (int)$row['quantity'] + $qty;
        Db::name('inventory')->where('id', $row['id'])->update(['quantity' => $newQty]);
        $this->log->write([
            'sku_code' => $sku, 'location_code' => $location, 'batch_no' => $batch,
            'change_type' => 'inbound', 'delta' => $qty,
            'before_quantity' => (int)$row['quantity'], 'after_quantity' => $newQty,
            'before_locked' => (int)$row['locked_quantity'], 'after_locked' => (int)$row['locked_quantity'],
            'ref_no' => $refNo, 'operator' => $operator,
        ]);
    }
}
