<?php
use think\migration\Migrator;

class CreateInventoryLog extends Migrator
{
    public function change(): void
    {
        $this->table('inventory_log', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'OMS 库存流水（append-only）',
        ])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('change_type', 'string', ['limit' => 20, 'comment' => 'lock/unlock/reserve/release_reserve/outbound/adjust'])
            ->addColumn('change_qty', 'integer', ['comment' => '正负'])
            ->addColumn('before_available', 'integer')
            ->addColumn('after_available', 'integer')
            ->addColumn('before_locked', 'integer')
            ->addColumn('after_locked', 'integer')
            ->addColumn('related_order', 'string', ['limit' => 32, 'null' => true])
            ->addColumn('operator', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['sku_code', 'created_at'], ['name' => 'idx_sku_time'])
            ->addIndex(['related_order'], ['name' => 'idx_related'])
            ->create();
    }
}
