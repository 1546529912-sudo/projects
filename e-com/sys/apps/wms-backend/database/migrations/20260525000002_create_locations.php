<?php
use think\migration\Migrator;

class CreateLocations extends Migrator
{
    public function change(): void
    {
        $this->table('locations', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '库位',
        ])
            ->addColumn('location_code', 'string', ['limit' => 32, 'null' => false])
            ->addColumn('warehouse_code', 'string', ['limit' => 32])
            ->addColumn('zone', 'string', ['limit' => 10])
            ->addColumn('rack', 'string', ['limit' => 10])
            ->addColumn('level', 'string', ['limit' => 10])
            ->addColumn('location_type', 'string', ['limit' => 20, 'default' => 'storage'])
            ->addColumn('max_weight', 'decimal', ['precision' => 10, 'scale' => 3, 'default' => '1000'])
            ->addColumn('is_golden', 'boolean', ['default' => 0])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'available'])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['location_code'], ['unique' => true, 'name' => 'uk_location_code'])
            ->addIndex(['warehouse_code', 'zone'], ['name' => 'idx_warehouse_zone'])
            ->create();
    }
}
