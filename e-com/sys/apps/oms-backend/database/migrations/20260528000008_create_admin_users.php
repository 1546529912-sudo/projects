<?php
use think\migration\Migrator;

/**
 * 后台管理员用户表（iter-16）
 *   - role: super_admin / warehouse / sales_ops
 *   - password 用 bcrypt
 *   - 自动 seed 3 个默认账号：admin / warehouse / sales
 */
class CreateAdminUsers extends Migrator
{
    public function change(): void
    {
        $this->table('admin_users', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '后台管理员',
        ])
            ->addColumn('username', 'string', ['limit' => 64])
            ->addColumn('password_hash', 'string', ['limit' => 255])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('role', 'string', ['limit' => 32, 'comment' => 'super_admin/warehouse/sales_ops'])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'enabled'])
            ->addColumn('last_login_at', 'datetime', ['null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['username'], ['unique' => true, 'name' => 'uk_username'])
            ->create();

        // seed 3 默认账号
        $now = date('Y-m-d H:i:s');
        $rows = [
            ['username' => 'admin',     'password_hash' => password_hash('admin123', PASSWORD_BCRYPT), 'name' => '超级管理员',  'role' => 'super_admin', 'created_at' => $now],
            ['username' => 'warehouse', 'password_hash' => password_hash('wh123',    PASSWORD_BCRYPT), 'name' => '仓管员',     'role' => 'warehouse',   'created_at' => $now],
            ['username' => 'sales',     'password_hash' => password_hash('sales123', PASSWORD_BCRYPT), 'name' => '销售运营',   'role' => 'sales_ops',   'created_at' => $now],
        ];
        $this->table('admin_users')->insert($rows)->saveData();
    }
}
