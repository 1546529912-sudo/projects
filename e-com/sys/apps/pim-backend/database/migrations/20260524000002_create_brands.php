<?php
use think\migration\Migrator;

class CreateBrands extends Migrator
{
    public function change(): void
    {
        $this->table('brands', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '品牌',
        ])
            ->addColumn('code', 'string', ['limit' => 64])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('logo_url', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('desc', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('sort', 'integer', ['default' => 0])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'enabled'])
            ->addTimestamps()
            ->addColumn('deleted_at', 'datetime', ['null' => true])
            ->addIndex(['code'], ['unique' => true, 'name' => 'uk_code'])
            ->create();
    }
}
