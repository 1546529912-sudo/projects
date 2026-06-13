<?php
use think\migration\Seeder;

class SeedWarehouse extends Seeder
{
    public function run(): void
    {
        $this->table('warehouses')->insert([
            ['warehouse_code' => 'WH-DEFAULT', 'warehouse_name' => '主仓', 'address' => '深圳市南山区科技园 1 号', 'status' => 'enabled'],
        ])->save();

        $this->table('locations')->insert([
            ['location_code' => 'A-01-01-01', 'warehouse_code' => 'WH-DEFAULT', 'zone' => 'A', 'rack' => '01', 'level' => '01', 'location_type' => 'storage', 'is_golden' => 1],
            ['location_code' => 'A-01-01-02', 'warehouse_code' => 'WH-DEFAULT', 'zone' => 'A', 'rack' => '01', 'level' => '02', 'location_type' => 'storage'],
            ['location_code' => 'A-01-02-01', 'warehouse_code' => 'WH-DEFAULT', 'zone' => 'A', 'rack' => '02', 'level' => '01', 'location_type' => 'storage'],
            ['location_code' => 'A-01-02-02', 'warehouse_code' => 'WH-DEFAULT', 'zone' => 'A', 'rack' => '02', 'level' => '02', 'location_type' => 'storage'],
            ['location_code' => 'STAGING-01', 'warehouse_code' => 'WH-DEFAULT', 'zone' => 'S', 'rack' => '01', 'level' => '01', 'location_type' => 'staging'],
        ])->save();

        // 与 OMS / PIM 5 SKU 对齐，初始 100 件
        $this->table('inventory')->insert([
            ['sku_code' => 'SPU001-001', 'location_code' => 'A-01-01-01', 'batch_no' => 'INIT', 'status' => 'normal', 'quantity' => 100, 'locked_quantity' => 0],
            ['sku_code' => 'SPU001-002', 'location_code' => 'A-01-01-02', 'batch_no' => 'INIT', 'status' => 'normal', 'quantity' => 100, 'locked_quantity' => 0],
            ['sku_code' => 'SPU002-001', 'location_code' => 'A-01-02-01', 'batch_no' => 'INIT', 'status' => 'normal', 'quantity' => 100, 'locked_quantity' => 0],
            ['sku_code' => 'SPU003-001', 'location_code' => 'A-01-02-02', 'batch_no' => 'INIT', 'status' => 'normal', 'quantity' => 100, 'locked_quantity' => 0],
            ['sku_code' => 'SPU003-002', 'location_code' => 'A-01-02-02', 'batch_no' => 'INIT', 'status' => 'normal', 'quantity' => 100, 'locked_quantity' => 0],
        ])->save();

        echo "[seed] 1 仓 + 5 库位 + 5 SKU × 100 实物已写入 wms_db\n";
    }
}
