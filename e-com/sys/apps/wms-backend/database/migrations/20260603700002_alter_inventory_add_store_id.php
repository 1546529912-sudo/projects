<?php
use think\migration\Migrator;

/**
 * inventory 加 store_id（iter-38 BIZ-08-4）
 *   冗余便利查询：与所属 warehouse 的 store_id 一致（service 层保证）
 *   主要还是按 warehouse_code 关联店，但 inventory.store_id 让"按店统计实物量"快很多
 */
class AlterInventoryAddStoreId extends Migrator
{
    public function change(): void
    {
        $this->table('inventory')
            ->addColumn('store_id', 'integer', [
                'signed' => false, 'default' => 1, 'null' => false,
                'after' => 'sku_code', 'comment' => '所属店铺，与 warehouse 一致',
            ])
            ->addIndex(['store_id', 'sku_code'], ['name' => 'idx_store_sku'])
            ->update();
    }
}
