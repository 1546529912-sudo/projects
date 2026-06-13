<?php
use think\migration\Migrator;

class CreateInventory extends Migrator
{
    public function change(): void
    {
        $this->table('inventory', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'WMS 实物库存',
        ])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('location_code', 'string', ['limit' => 32])
            ->addColumn('batch_no', 'string', ['limit' => 64, 'default' => 'INIT'])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'normal'])
            ->addColumn('quantity', 'integer', ['default' => 0])
            ->addColumn('locked_quantity', 'integer', ['default' => 0])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['sku_code', 'location_code', 'batch_no', 'status'], ['unique' => true, 'name' => 'uk_sku_loc_batch_status'])
            ->addIndex(['sku_code'], ['name' => 'idx_sku'])
            ->addIndex(['location_code'], ['name' => 'idx_location'])
            ->create();
    }
}
