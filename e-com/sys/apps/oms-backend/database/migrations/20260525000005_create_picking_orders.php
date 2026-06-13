<?php
use think\migration\Migrator;

class CreatePickingOrders extends Migrator
{
    public function change(): void
    {
        $this->table('picking_orders', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'OMS 拣货单（下发 WMS）',
        ])
            ->addColumn('picking_no', 'string', ['limit' => 32])
            ->addColumn('order_no', 'string', ['limit' => 32])
            ->addColumn('warehouse_code', 'string', ['limit' => 32])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'sent'])
            ->addColumn('retry_count', 'integer', ['default' => 0])
            ->addColumn('last_error', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['picking_no'], ['unique' => true, 'name' => 'uk_picking_no'])
            ->addIndex(['order_no'], ['name' => 'idx_order_no'])
            ->create();
    }
}
