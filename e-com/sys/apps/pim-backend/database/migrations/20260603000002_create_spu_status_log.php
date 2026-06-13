<?php
use think\migration\Migrator;

/**
 * SPU 状态机日志（iter-29 P1-b）
 *   - SPU 状态：draft / published / offline
 *   - 触发时机：create (=>draft) / publish (draft|offline=>published) / offline (published=>offline) / delete (*=>deleted)
 *   - 与 pim_admin_audit_log 区别：只关心状态轨迹，便于"上下架曲线"图聚合
 */
class CreateSpuStatusLog extends Migrator
{
    public function change(): void
    {
        $this->table('spu_status_log', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'SPU 状态机日志',
        ])
            ->addColumn('spu_id', 'integer', ['signed' => false])
            ->addColumn('from_status', 'string', ['limit' => 20, 'null' => true])
            ->addColumn('to_status', 'string', ['limit' => 20])
            ->addColumn('operator', 'string', ['limit' => 64])
            ->addColumn('reason', 'string', ['limit' => 200, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['spu_id', 'created_at'], ['name' => 'idx_spu_time'])
            ->addIndex(['to_status', 'created_at'], ['name' => 'idx_to_status_time'])
            ->create();
    }
}
