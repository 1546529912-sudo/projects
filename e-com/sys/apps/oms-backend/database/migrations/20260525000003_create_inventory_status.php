<?php
use think\migration\Migrator;

class CreateInventoryStatus extends Migrator
{
    public function change(): void
    {
        $this->table('inventory_status', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'OMS 库存四态',
            'id' => false,
            'primary_key' => ['sku_code'],
        ])
            ->addColumn('sku_code', 'string', ['limit' => 64, 'null' => false])
            ->addColumn('available', 'integer', ['default' => 0, 'comment' => '可用'])
            ->addColumn('locked', 'integer', ['default' => 0, 'comment' => '下单锁定'])
            ->addColumn('reserved', 'integer', ['default' => 0, 'comment' => '换货预留'])
            ->addColumn('buffer_qty', 'integer', ['default' => 0, 'comment' => '安全垫'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->create();
    }
}
