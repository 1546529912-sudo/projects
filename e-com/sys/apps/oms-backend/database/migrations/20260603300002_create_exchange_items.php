<?php
use think\migration\Migrator;

/**
 * 换货明细（iter-34 BIZ-07）
 *   - 一个换货单可换多个订单项
 *   - 每行：用 old_sku 换 new_sku（限同 SPU 下其他 SKU，v1 不限）
 *   - 限制：UNIQUE(order_no, order_item_id, exchange_no)防同一行被重复加进同一换货单
 */
class CreateExchangeItems extends Migrator
{
    public function change(): void
    {
        $this->table('exchange_items', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '换货明细',
        ])
            ->addColumn('exchange_no', 'string', ['limit' => 32])
            ->addColumn('order_no', 'string', ['limit' => 32])
            ->addColumn('order_item_id', 'biginteger', ['signed' => false])
            ->addColumn('old_sku_code', 'string', ['limit' => 64])
            ->addColumn('old_sku_snapshot', 'json', ['null' => true])
            ->addColumn('new_sku_code', 'string', ['limit' => 64])
            ->addColumn('new_sku_snapshot', 'json', ['null' => true])
            ->addColumn('qty', 'integer', ['signed' => false, 'default' => 1])
            ->addColumn('item_reason', 'string', ['limit' => 200, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['exchange_no'], ['name' => 'idx_exchange_no'])
            ->addIndex(['order_no', 'order_item_id'], ['name' => 'idx_order_item'])
            ->create();
    }
}
