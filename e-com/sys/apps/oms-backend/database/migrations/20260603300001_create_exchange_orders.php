<?php
use think\migration\Migrator;

/**
 * 换货主表（iter-34 BIZ-07）
 *
 *   状态机：
 *     pending_approve → approved → received_old → sent_new → completed
 *                     ↘ rejected
 *                     ↘ cancelled（用户在 pending_approve 时取消）
 *
 *   v1 设计：工作流跟踪 + 时间戳 + 凭证图，**不自动联动库存**（运营线下/走标准入出库流程）
 *   v2 候选：approved 锁旧 SKU reserved；received_old 旧 SKU reserved→available；sent_new 新 SKU available→deducted
 */
class CreateExchangeOrders extends Migrator
{
    public function change(): void
    {
        $this->table('exchange_orders', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '换货主表',
        ])
            ->addColumn('exchange_no', 'string', ['limit' => 32])
            ->addColumn('order_no', 'string', ['limit' => 32])
            ->addColumn('user_id', 'biginteger', ['signed' => false])
            ->addColumn('status', 'string', ['limit' => 24, 'default' => 'pending_approve'])
            ->addColumn('reason', 'string', ['limit' => 200])
            ->addColumn('evidence_images', 'json', ['null' => true])

            ->addColumn('approved_at', 'datetime', ['null' => true])
            ->addColumn('approved_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('rejected_at', 'datetime', ['null' => true])
            ->addColumn('reject_reason', 'string', ['limit' => 200, 'null' => true])
            ->addColumn('cancelled_at', 'datetime', ['null' => true])

            ->addColumn('tracking_no_old', 'string', ['limit' => 64, 'null' => true, 'comment' => '用户寄回旧货单号'])
            ->addColumn('received_old_at', 'datetime', ['null' => true])
            ->addColumn('received_old_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('received_old_note', 'string', ['limit' => 200, 'null' => true])

            ->addColumn('tracking_no_new', 'string', ['limit' => 64, 'null' => true, 'comment' => '寄出新货单号'])
            ->addColumn('sent_new_at', 'datetime', ['null' => true])
            ->addColumn('sent_new_by', 'string', ['limit' => 64, 'null' => true])

            ->addColumn('completed_at', 'datetime', ['null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['exchange_no'], ['unique' => true, 'name' => 'uk_exchange_no'])
            ->addIndex(['order_no'], ['name' => 'idx_order_no'])
            ->addIndex(['user_id', 'status'], ['name' => 'idx_user_status'])
            ->addIndex(['status', 'created_at'], ['name' => 'idx_status_created'])
            ->create();
    }
}
