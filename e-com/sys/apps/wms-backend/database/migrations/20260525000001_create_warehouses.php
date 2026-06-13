<?php
use think\migration\Migrator;

class CreateWarehouses extends Migrator
{
    public function change(): void
    {
        $this->table('warehouses', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '仓库',
        ])
            ->addColumn('warehouse_code', 'string', ['limit' => 32, 'null' => false])
            ->addColumn('warehouse_name', 'string', ['limit' => 100])
            ->addColumn('address', 'string', ['limit' => 255])
            ->addColumn('contact', 'string', ['limit' => 50, 'null' => true])
            ->addColumn('phone', 'string', ['limit' => 20, 'null' => true])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'enabled'])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['warehouse_code'], ['unique' => true, 'name' => 'uk_warehouse_code'])
            ->create();
    }
}
