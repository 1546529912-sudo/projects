<?php
use think\migration\Migrator;

/**
 * WMS 库存变动日志（iter-24 P0-1）
 *   - 每次 quantity 或 locked_quantity 任一改动都写 1 条
 *   - before/after 都存，方便审计
 *   - change_type 与流程语义一致
 */
class CreateInventoryLog extends Migrator
{
    public function change(): void
    {
        $this->table('inventory_log', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'WMS 库存变动日志',
            'id' => false,
            'primary_key' => ['id'],
        ])
            ->addColumn('id', 'biginteger', ['signed' => false, 'identity' => true])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('location_code', 'string', ['limit' => 32])
            ->addColumn('batch_no', 'string', ['limit' => 64, 'default' => 'INIT'])
            ->addColumn('change_type', 'string', ['limit' => 32,
                'comment' => 'inbound/outbound/stock_take_in/stock_take_out/transfer_out/transfer_in/lock/unlock'])
            ->addColumn('delta', 'integer')
            ->addColumn('before_quantity', 'integer')
            ->addColumn('after_quantity', 'integer')
            ->addColumn('before_locked', 'integer')
            ->addColumn('after_locked', 'integer')
            ->addColumn('ref_no', 'string', ['limit' => 64, 'null' => true,
                'comment' => 'inbound_no/outbound_no/take_no/transfer_no/order_no'])
            ->addColumn('operator', 'string', ['limit' => 64, 'default' => 'system'])
            ->addColumn('remark', 'string', ['limit' => 255, 'default' => ''])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['sku_code'], ['name' => 'idx_sku'])
            ->addIndex(['location_code'], ['name' => 'idx_location'])
            ->addIndex(['ref_no'], ['name' => 'idx_ref'])
            ->addIndex(['change_type', 'created_at'], ['name' => 'idx_ct_time'])
            ->create();
    }
}
