<?php
use think\migration\Migrator;

class CreateOrderStatusLog extends Migrator
{
    public function change(): void
    {
        $this->table('order_status_log', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '订单状态变更日志',
        ])
            ->addColumn('order_no', 'string', ['limit' => 32])
            ->addColumn('from_status', 'string', ['limit' => 20])
            ->addColumn('to_status', 'string', ['limit' => 20])
            ->addColumn('operator', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('source', 'string', ['limit' => 50, 'null' => true])
            ->addColumn('remark', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['order_no', 'created_at'], ['name' => 'idx_order'])
            ->create();
    }
}
