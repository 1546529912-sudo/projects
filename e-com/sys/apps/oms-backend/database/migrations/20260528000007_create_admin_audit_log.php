<?php
use think\migration\Migrator;

/**
 * 后台操作审计日志（iter-15）
 *   - operator: 谁（admin 用户名 / system）
 *   - action: 动作语义（如 refund.approve / order.force_cancel / inventory.adjust）
 *   - target_type / target_id: 操作对象（refund_no / order_no / sku_code）
 *   - before / after: 变更前后状态（JSON，方便回放）
 *   - reason: 操作理由
 *   - ip / trace_id: 来源追踪
 */
class CreateAdminAuditLog extends Migrator
{
    public function change(): void
    {
        $this->table('admin_audit_log', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '后台操作审计日志（append-only）',
        ])
            ->addColumn('operator', 'string', ['limit' => 64])
            ->addColumn('action', 'string', ['limit' => 64])
            ->addColumn('target_type', 'string', ['limit' => 32])
            ->addColumn('target_id', 'string', ['limit' => 64])
            ->addColumn('before', 'json', ['null' => true])
            ->addColumn('after', 'json', ['null' => true])
            ->addColumn('reason', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('ip', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('trace_id', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['operator', 'created_at'], ['name' => 'idx_op_time'])
            ->addIndex(['action', 'created_at'], ['name' => 'idx_action_time'])
            ->addIndex(['target_type', 'target_id'], ['name' => 'idx_target'])
            ->create();
    }
}
