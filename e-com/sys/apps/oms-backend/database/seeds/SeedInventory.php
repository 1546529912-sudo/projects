<?php
use think\migration\Seeder;

class SeedInventory extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['sku_code' => 'SPU001-001', 'available' => 100, 'locked' => 0, 'reserved' => 0, 'buffer_qty' => 0],
            ['sku_code' => 'SPU001-002', 'available' => 100, 'locked' => 0, 'reserved' => 0, 'buffer_qty' => 0],
            ['sku_code' => 'SPU002-001', 'available' => 100, 'locked' => 0, 'reserved' => 0, 'buffer_qty' => 0],
            ['sku_code' => 'SPU003-001', 'available' => 100, 'locked' => 0, 'reserved' => 0, 'buffer_qty' => 0],
            ['sku_code' => 'SPU003-002', 'available' => 100, 'locked' => 0, 'reserved' => 0, 'buffer_qty' => 0],
        ];
        $this->table('inventory_status')->insert($rows)->save();
        echo "[seed] 5 SKU available=100 已写入 oms_db.inventory_status\n";
    }
}
