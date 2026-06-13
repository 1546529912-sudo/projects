<?php
use think\migration\Migrator;

class CreateCart extends Migrator
{
    public function change(): void
    {
        $this->table('cart', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '购物车',
        ])
            ->addColumn('user_id', 'biginteger', ['signed' => false])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('qty', 'integer', ['signed' => false])
            ->addColumn('selected', 'boolean', ['default' => 1])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['user_id', 'sku_code'], ['unique' => true, 'name' => 'uk_user_sku'])
            ->addIndex(['user_id'], ['name' => 'idx_user'])
            ->create();
    }
}
