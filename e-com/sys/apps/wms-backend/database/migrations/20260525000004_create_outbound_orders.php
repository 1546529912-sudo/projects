<?php
use think\migration\Migrator;

class CreateOutboundOrders extends Migrator
{
    public function change(): void
    {
        $this->table('outbound_orders', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '出库单',
        ])
            ->addColumn('outbound_no', 'string', ['limit' => 32, 'comment' => '即来自 OMS 的 picking_no'])
            ->addColumn('oms_order_no', 'string', ['limit' => 32])
            ->addColumn('warehouse_code', 'string', ['limit' => 32])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'pending_alloc'])
            ->addColumn('idempotency_key', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('express_company', 'string', ['limit' => 50, 'null' => true])
            ->addColumn('express_no', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('address', 'json')
            ->addColumn('shipped_at', 'datetime', ['null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['outbound_no'], ['unique' => true, 'name' => 'uk_outbound_no'])
            ->addIndex(['idempotency_key'], ['unique' => true, 'name' => 'uk_idempotency'])
            ->addIndex(['status'], ['name' => 'idx_status'])
            ->create();
    }
}
