<?php
use think\migration\Migrator;

class CreateUsers extends Migrator
{
    public function change(): void
    {
        $table = $this->table('users', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '商城用户',
        ]);

        $table->addColumn('phone', 'string', ['limit' => 20, 'comment' => '手机号'])
              ->addColumn('nickname', 'string', ['limit' => 50, 'null' => true])
              ->addColumn('avatar_url', 'string', ['limit' => 500, 'null' => true])
              ->addColumn('last_address_snapshot', 'json', ['null' => true])
              ->addColumn('status', 'string', ['limit' => 20, 'default' => 'active'])
              ->addColumn('last_login_at', 'datetime', ['null' => true])
              ->addTimestamps()
              ->addColumn('deleted_at', 'datetime', ['null' => true])
              ->addIndex(['phone'], ['unique' => true, 'name' => 'uk_phone'])
              ->create();
    }
}
