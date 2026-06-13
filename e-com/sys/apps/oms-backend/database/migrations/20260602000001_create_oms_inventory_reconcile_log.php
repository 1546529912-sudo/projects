<?php
use think\migration\Migrator;

/**
 * OMS 视角库存对账日志（iter-26 P0-2）
 *   对偶 wms_db.inventory_reconcile_log（iter-24 P1-2）
 *   OMS 拉 WMS.inventory GROUP BY sku → SUM(quantity-locked) vs 本地 inventory_status.available
 */
class CreateOmsInventoryReconcileLog extends Migrator
{
    public function change(): void
    {
        $this->table('inventory_reconcile_log', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'OMS 视角库存对账日志',
        ])
            ->addColumn('reconcile_no', 'string', ['limit' => 32])
            ->addColumn('scope_type', 'string', ['limit' => 16, 'default' => 'all'])
            ->addColumn('scope_value', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('total_skus', 'integer', ['default' => 0])
            ->addColumn('diff_count', 'integer', ['default' => 0])
            ->addColumn('status', 'string', ['limit' => 16, 'default' => 'pending'])
            ->addColumn('details', 'json', ['null' => true])
            ->addColumn('created_by', 'string', ['limit' => 64])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('confirmed_at', 'datetime', ['null' => true])
            ->addIndex(['reconcile_no'], ['unique' => true, 'name' => 'uk_reconcile_no'])
            ->create();
    }
}
