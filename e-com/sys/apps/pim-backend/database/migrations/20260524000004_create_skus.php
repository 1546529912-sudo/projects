<?php
use think\migration\Migrator;

class CreateSkus extends Migrator
{
    public function change(): void
    {
        $this->table('skus', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'SKU',
        ])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('spu_id', 'biginteger', ['signed' => false])
            ->addColumn('sales_attrs', 'json')
            ->addColumn('price', 'biginteger', ['signed' => false, 'default' => 0])
            ->addColumn('image_url', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('barcode', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('weight', 'decimal', ['precision' => 10, 'scale' => 3, 'null' => true])
            ->addColumn('volume', 'decimal', ['precision' => 10, 'scale' => 3, 'null' => true])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'enabled'])
            ->addTimestamps()
            ->addColumn('deleted_at', 'datetime', ['null' => true])
            ->addIndex(['sku_code'], ['unique' => true, 'name' => 'uk_sku_code'])
            ->addIndex(['spu_id'], ['name' => 'idx_spu'])
            ->create();
    }
}
