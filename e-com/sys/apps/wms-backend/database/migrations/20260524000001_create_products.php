<?php
use think\migration\Migrator;

class CreateProducts extends Migrator
{
    public function change(): void
    {
        $this->table('products', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'WMS SKU 主数据（订阅 PIM）',
        ])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('sku_name', 'string', ['limit' => 200])
            ->addColumn('category', 'string', ['limit' => 100, 'null' => true])
            ->addColumn('unit', 'string', ['limit' => 20, 'default' => '件'])
            ->addColumn('spec', 'string', ['limit' => 200, 'null' => true])
            ->addColumn('weight', 'decimal', ['precision' => 10, 'scale' => 3])
            ->addColumn('volume', 'decimal', ['precision' => 10, 'scale' => 3, 'null' => true])
            ->addColumn('price', 'biginteger', ['signed' => false, 'null' => true])
            ->addColumn('shelf_life_days', 'integer', ['default' => 0])
            ->addColumn('abc_level', 'string', ['limit' => 1, 'default' => 'B'])
            ->addColumn('safety_stock', 'integer', ['default' => 0])
            ->addColumn('golden_location_priority', 'boolean', ['default' => false])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'enabled'])
            ->addTimestamps()
            ->addIndex(['sku_code'], ['unique' => true, 'name' => 'uk_sku_code'])
            ->create();
    }
}
