<?php
use think\migration\Migrator;

class CreateSpus extends Migrator
{
    public function change(): void
    {
        $this->table('spus', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'SPU',
        ])
            ->addColumn('code', 'string', ['limit' => 64])
            ->addColumn('name', 'string', ['limit' => 200])
            ->addColumn('category_id', 'biginteger', ['signed' => false])
            ->addColumn('brand_id', 'biginteger', ['signed' => false, 'null' => true])
            ->addColumn('selling_points', 'json', ['null' => true])
            ->addColumn('main_images', 'json')
            ->addColumn('detail_html', 'text', ['null' => true])
            ->addColumn('base_price', 'biginteger', ['signed' => false, 'default' => 0])
            ->addColumn('attrs', 'json', ['null' => true])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'draft'])
            ->addColumn('published_at', 'datetime', ['null' => true])
            ->addTimestamps()
            ->addColumn('deleted_at', 'datetime', ['null' => true])
            ->addIndex(['code'], ['unique' => true, 'name' => 'uk_code'])
            ->addIndex(['category_id'], ['name' => 'idx_category'])
            ->addIndex(['status'], ['name' => 'idx_status'])
            ->create();
    }
}
