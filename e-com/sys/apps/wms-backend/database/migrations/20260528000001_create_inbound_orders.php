<?php
use think\migration\Migrator;

class CreateInboundOrders extends Migrator
{
    public function change(): void
    {
        $this->table('inbound_orders', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '入库单',
        ])
            ->addColumn('inbound_no', 'string', ['limit' => 32])
            ->addColumn('warehouse_code', 'string', ['limit' => 32])
            ->addColumn('source_type', 'string', ['limit' => 20, 'default' => 'purchase', 'comment' => 'purchase/return/transfer/init'])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'pending', 'comment' => 'pending/receiving/received/shelved/cancelled'])
            ->addColumn('operator_id', 'biginteger', ['signed' => false, 'null' => true])
            ->addColumn('remark', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('idempotency_key', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('received_at', 'datetime', ['null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['inbound_no'], ['unique' => true, 'name' => 'uk_inbound_no'])
            ->addIndex(['idempotency_key'], ['unique' => true, 'name' => 'uk_idempotency'])
            ->addIndex(['warehouse_code', 'status'], ['name' => 'idx_wh_status'])
            ->addIndex(['created_at'], ['name' => 'idx_created'])
            ->create();
    }
}
