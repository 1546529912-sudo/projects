<?php
use think\migration\Migrator;

class CreateOrders extends Migrator
{
    public function change(): void
    {
        $this->table('orders', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '订单主表',
        ])
            ->addColumn('order_no', 'string', ['limit' => 32])
            ->addColumn('user_id', 'biginteger', ['signed' => false])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'pending_pay'])
            ->addColumn('total_amount', 'biginteger', ['signed' => false])
            ->addColumn('goods_amount', 'biginteger', ['signed' => false])
            ->addColumn('freight', 'biginteger', ['signed' => false, 'default' => 1000])
            ->addColumn('discount', 'biginteger', ['signed' => false, 'default' => 0])
            ->addColumn('address', 'json')
            ->addColumn('remark', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('idempotency_key', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('paid_at', 'datetime', ['null' => true])
            ->addColumn('shipped_at', 'datetime', ['null' => true])
            ->addColumn('completed_at', 'datetime', ['null' => true])
            ->addColumn('cancelled_at', 'datetime', ['null' => true])
            ->addColumn('cancel_reason', 'string', ['limit' => 50, 'null' => true])
            ->addColumn('express_no', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('trace_id', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['order_no'], ['unique' => true, 'name' => 'uk_order_no'])
            ->addIndex(['idempotency_key'], ['unique' => true, 'name' => 'uk_idempotency'])
            ->addIndex(['user_id', 'status'], ['name' => 'idx_user_status'])
            ->addIndex(['status', 'created_at'], ['name' => 'idx_status_created'])
            ->create();
    }
}
