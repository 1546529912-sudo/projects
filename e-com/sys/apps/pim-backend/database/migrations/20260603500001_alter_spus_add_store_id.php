<?php
use think\migration\Migrator;

/**
 * spus 加 store_id（iter-36 BIZ-08-2 PIM 多店化）
 *
 *   DEFAULT 1 NOT NULL —— 存量数据全归 id=1 平台店
 *   联表权威：oms_db.stores（跨库引用）
 */
class AlterSpusAddStoreId extends Migrator
{
    public function change(): void
    {
        $this->table('spus')
            ->addColumn('store_id', 'integer', [
                'signed' => false,
                'default' => 1,
                'null' => false,
                'after' => 'id',
                'comment' => '所属店铺，参考 oms_db.stores.id',
            ])
            ->addIndex(['store_id', 'status'], ['name' => 'idx_store_status'])
            ->update();
    }
}
