<?php
use think\migration\Migrator;

/**
 * 调拨单（iter-22，单 SKU 简化版）
 *   status: draft → in_transit → completed | cancelled
 *   同仓库不同库位 = 移库；不同仓库 = 跨仓库调拨
 */
class CreateTransfers extends Migrator
{
    public function change(): void
    {
        $this->table('transfers', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '调拨单（单 SKU 简化）',
        ])
            ->addColumn('transfer_no', 'string', ['limit' => 32])
            ->addColumn('from_warehouse', 'string', ['limit' => 32])
            ->addColumn('to_warehouse', 'string', ['limit' => 32])
            ->addColumn('from_location', 'string', ['limit' => 32])
            ->addColumn('to_location', 'string', ['limit' => 32])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('batch_no', 'string', ['limit' => 64, 'default' => 'INIT'])
            ->addColumn('qty', 'integer')
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'draft'])
            ->addColumn('created_by', 'string', ['limit' => 64])
            ->addColumn('remark', 'string', ['limit' => 255, 'default' => ''])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('shipped_at', 'datetime', ['null' => true])
            ->addColumn('completed_at', 'datetime', ['null' => true])
            ->addIndex(['transfer_no'], ['unique' => true, 'name' => 'uk_transfer_no'])
            ->addIndex(['from_warehouse', 'to_warehouse', 'status'], ['name' => 'idx_wh_status'])
            ->create();
    }
}
