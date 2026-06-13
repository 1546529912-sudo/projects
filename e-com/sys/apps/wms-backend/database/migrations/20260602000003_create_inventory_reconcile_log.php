<?php
use think\migration\Migrator;

/**
 * WMS-OMS 库存对账日志（iter-24 P1-2）
 *   每次触发对账存一条头记录 + details JSON
 *   不自动修复，仅记录 + 提供 admin 确认机制
 */
class CreateInventoryReconcileLog extends Migrator
{
    public function change(): void
    {
        $this->table('inventory_reconcile_log', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'WMS-OMS 库存对账日志',
        ])
            ->addColumn('reconcile_no', 'string', ['limit' => 32])
            ->addColumn('scope_type', 'string', ['limit' => 16, 'default' => 'all'])
            ->addColumn('scope_value', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('total_skus', 'integer', ['default' => 0])
            ->addColumn('diff_count', 'integer', ['default' => 0])
            ->addColumn('status', 'string', ['limit' => 16, 'default' => 'pending', 'comment' => 'pending/confirmed'])
            ->addColumn('details', 'json', ['null' => true])
            ->addColumn('created_by', 'string', ['limit' => 64])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('confirmed_at', 'datetime', ['null' => true])
            ->addIndex(['reconcile_no'], ['unique' => true, 'name' => 'uk_reconcile_no'])
            ->create();
    }
}
