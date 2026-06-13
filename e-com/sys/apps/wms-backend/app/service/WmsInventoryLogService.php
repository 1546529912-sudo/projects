<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * WMS 库存变动日志（iter-24 P0-1）
 *
 * 统一入口：所有 inventory.quantity / locked_quantity 改动都通过 write() 落日志
 *   change_type:
 *     - inbound          入库 +N
 *     - outbound         出库 -N（实物出仓）
 *     - lock             下单/调拨 locked +N
 *     - unlock           取消 locked -N
 *     - stock_take_in    盘盈 +N
 *     - stock_take_out   盘亏 -N
 *     - transfer_out     调拨出 -N
 *     - transfer_in      调拨入 +N
 *
 * 调用方应在事务内调用 write()，本服务不开新事务。
 */
class WmsInventoryLogService
{
    /**
     * 写一条日志
     *
     * @param array{
     *   sku_code: string,
     *   location_code: string,
     *   batch_no: string,
     *   change_type: string,
     *   delta: int,
     *   before_quantity: int,
     *   after_quantity: int,
     *   before_locked: int,
     *   after_locked: int,
     *   ref_no?: string|null,
     *   operator?: string,
     *   remark?: string,
     * } $data
     */
    public function write(array $data): void
    {
        Db::name('inventory_log')->insert([
            'sku_code' => $data['sku_code'],
            'location_code' => $data['location_code'],
            'batch_no' => $data['batch_no'] ?? 'INIT',
            'change_type' => $data['change_type'],
            'delta' => (int)$data['delta'],
            'before_quantity' => (int)$data['before_quantity'],
            'after_quantity' => (int)$data['after_quantity'],
            'before_locked' => (int)$data['before_locked'],
            'after_locked' => (int)$data['after_locked'],
            'ref_no' => $data['ref_no'] ?? null,
            'operator' => $data['operator'] ?? 'system',
            'remark' => $data['remark'] ?? '',
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }
}
