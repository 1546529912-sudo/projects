<?php
use think\migration\Migrator;

/**
 * skus 加 store_id（iter-36 BIZ-08-2）
 *   冗余便利查询：与所属 SPU 的 store_id 应一致（service 层保证）
 */
class AlterSkusAddStoreId extends Migrator
{
    public function change(): void
    {
        $this->table('skus')
            ->addColumn('store_id', 'integer', [
                'signed' => false,
                'default' => 1,
                'null' => false,
                'after' => 'spu_id',
                'comment' => '所属店铺，与 SPU 一致',
            ])
            ->addIndex(['store_id'], ['name' => 'idx_store'])
            ->update();
    }
}
