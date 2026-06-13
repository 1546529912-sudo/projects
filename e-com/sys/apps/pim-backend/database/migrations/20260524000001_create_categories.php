<?php
use think\migration\Migrator;

class CreateCategories extends Migrator
{
    public function change(): void
    {
        $this->table('categories', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '类目',
        ])
            ->addColumn('code', 'string', ['limit' => 64])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('parent_id', 'biginteger', ['signed' => false, 'default' => 0])
            ->addColumn('level', 'tinyinteger', ['signed' => false, 'default' => 1])
            ->addColumn('sort', 'integer', ['default' => 0])
            ->addColumn('attr_template_id', 'biginteger', ['signed' => false, 'null' => true])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'enabled'])
            ->addColumn('icon_url', 'string', ['limit' => 500, 'null' => true])
            ->addTimestamps()
            ->addColumn('deleted_at', 'datetime', ['null' => true])
            ->addIndex(['code'], ['unique' => true, 'name' => 'uk_code'])
            ->addIndex(['parent_id'], ['name' => 'idx_parent'])
            ->create();
    }
}
