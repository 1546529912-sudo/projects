<?php
use think\migration\Migrator;

/**
 * 盘点单（iter-22）
 *   scope_type: all / zone / location / sku
 *   status:     draft → in_progress → completed | cancelled
 */
class CreateStockTakes extends Migrator
{
    public function change(): void
    {
        $this->table('stock_takes', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '盘点单',
        ])
            ->addColumn('take_no', 'string', ['limit' => 32])
            ->addColumn('warehouse_code', 'string', ['limit' => 32])
            ->addColumn('scope_type', 'string', ['limit' => 20, 'default' => 'all', 'comment' => 'all/zone/location/sku'])
            ->addColumn('scope_value', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'draft'])
            ->addColumn('created_by', 'string', ['limit' => 64])
            ->addColumn('remark', 'string', ['limit' => 255, 'default' => ''])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('started_at', 'datetime', ['null' => true])
            ->addColumn('completed_at', 'datetime', ['null' => true])
            ->addIndex(['take_no'], ['unique' => true, 'name' => 'uk_take_no'])
            ->addIndex(['warehouse_code', 'status'], ['name' => 'idx_wh_status'])
            ->create();
    }
}
