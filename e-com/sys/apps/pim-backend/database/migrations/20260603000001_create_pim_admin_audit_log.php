<?php
use think\migration\Migrator;

/**
 * PIM 后台操作审计日志（iter-29 P1-a，对齐 OMS iter-15）
 *   - action 取值：spu.create / spu.update / spu.publish / spu.offline / spu.delete
 *                  sku.create / sku.update / sku.delete
 *                  brand.create / brand.update / brand.delete
 *                  category.create / category.update / category.delete / category.reorder
 *                  upload.image
 *   - target_type / target_id：spu / sku / brand / category（id 或 code）
 */
class CreatePimAdminAuditLog extends Migrator
{
    public function change(): void
    {
        $this->table('pim_admin_audit_log', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'PIM 后台操作审计日志（append-only）',
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
