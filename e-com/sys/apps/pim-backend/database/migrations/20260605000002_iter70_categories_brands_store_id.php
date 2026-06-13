<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-70 Q36-01：categories / brands 加 store_id（店铺自定义类目）
 *   NULL = 平台公用；>0 = 该店专属
 */
class Iter70CategoriesBrandsStoreId extends Migrator
{
    public function change(): void
    {
        foreach (['categories', 'brands'] as $tbl) {
            if ($this->hasTable($tbl) && !$this->table($tbl)->hasColumn('store_id')) {
                $this->table($tbl)
                    ->addColumn('store_id', 'integer', ['null' => true, 'comment' => 'NULL=平台公用 / >0=该店专属'])
                    ->addIndex(['store_id'], ['name' => 'idx_store'])
                    ->update();
            }
        }
    }
}
