<?php
use think\migration\Migrator;

/**
 * 退款主表
 *   type: refund_only（仅退款，未发货）/ return_refund（退货退款，已发货）
 *   status 状态机:
 *     pending_approve → approved → received_back → refunded
 *                     ↘ rejected
 *     (type=refund_only 时跳过 received_back，approved 直接 → refunded)
 */
class CreateRefundOrders extends Migrator
{
    public function change(): void
    {
        $this->table('refund_orders', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '退款主表',
        ])
            ->addColumn('refund_no', 'string', ['limit' => 32])
            ->addColumn('order_no', 'string', ['limit' => 32])
            ->addColumn('user_id', 'biginteger', ['signed' => false])
            ->addColumn('type', 'string', ['limit' => 20, 'comment' => 'refund_only/return_refund'])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'pending_approve'])
            ->addColumn('reason', 'string', ['limit' => 200])
            ->addColumn('amount', 'biginteger', ['signed' => false, 'comment' => '分'])
            ->addColumn('approved_at', 'datetime', ['null' => true])
            ->addColumn('approved_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('rejected_at', 'datetime', ['null' => true])
            ->addColumn('reject_reason', 'string', ['limit' => 200, 'null' => true])
            ->addColumn('received_back_at', 'datetime', ['null' => true])
            ->addColumn('refunded_at', 'datetime', ['null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['refund_no'], ['unique' => true, 'name' => 'uk_refund_no'])
            ->addIndex(['order_no'], ['name' => 'idx_order_no'])
            ->addIndex(['user_id', 'status'], ['name' => 'idx_user_status'])
            ->addIndex(['status', 'created_at'], ['name' => 'idx_status_created'])
            ->create();
    }
}
