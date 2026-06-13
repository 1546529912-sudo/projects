<?php
use think\migration\Migrator;

class CreateOrderItems extends Migrator
{
    public function change(): void
    {
        $this->table('order_items', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '订单明细',
        ])
            ->addColumn('order_no', 'string', ['limit' => 32])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('sku_snapshot', 'json', ['comment' => '下单时 SKU 快照'])
            ->addColumn('qty', 'integer', ['signed' => false])
            ->addColumn('unit_price', 'biginteger', ['signed' => false])
            ->addColumn('subtotal', 'biginteger', ['signed' => false])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['order_no'], ['name' => 'idx_order_no'])
            ->addIndex(['sku_code'], ['name' => 'idx_sku'])
            ->create();
    }
}
