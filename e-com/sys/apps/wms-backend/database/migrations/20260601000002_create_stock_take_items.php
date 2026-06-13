<?php
use think\migration\Migrator;

/**
 * 盘点明细（iter-22）
 *   起盘时 snapshot inventory 当时的 quantity 为 system_qty
 *   完成时按 actual_qty - system_qty 计 diff，写 inventory_log change_type='stock_take_adjust'
 */
class CreateStockTakeItems extends Migrator
{
    public function change(): void
    {
        $this->table('stock_take_items', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '盘点明细',
        ])
            ->addColumn('take_no', 'string', ['limit' => 32])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('location_code', 'string', ['limit' => 32])
            ->addColumn('batch_no', 'string', ['limit' => 64, 'default' => 'INIT'])
            ->addColumn('system_qty', 'integer')
            ->addColumn('actual_qty', 'integer', ['null' => true])
            ->addColumn('diff', 'integer', ['null' => true])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'pending', 'comment' => 'pending/counted'])
            ->addIndex(['take_no'], ['name' => 'idx_take_no'])
            ->create();
    }
}
