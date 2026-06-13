<?php
use think\migration\Migrator;

/**
 * WMS 端记录 OMS 推过来的事件（iter-26 P0-1 接收侧）
 *   - 当前仅 audit，不做业务联动
 *   - 后续 hook：可以扩展为按 event_type 触发业务（例 cancel → 释放 reserved）
 */
class CreateOmsEventAuditLog extends Migrator
{
    public function change(): void
    {
        $this->table('oms_event_audit_log', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'WMS 端 OMS 事件审计',
        ])
            ->addColumn('event_type', 'string', ['limit' => 32])
            ->addColumn('ref_no', 'string', ['limit' => 32])
            ->addColumn('payload', 'json', ['null' => true])
            ->addColumn('received_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['event_type'], ['name' => 'idx_event_type'])
            ->addIndex(['ref_no'], ['name' => 'idx_ref_no'])
            ->create();
    }
}
