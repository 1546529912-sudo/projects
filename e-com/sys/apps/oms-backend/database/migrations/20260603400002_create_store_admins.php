<?php
use think\migration\Migrator;

/**
 * 店铺 ↔ admin_user 关联表（iter-35 BIZ-08-1）
 *
 *   多对多：一个 admin 可绑多个店；一个店有多个 admin
 *   role:
 *     store_owner 店主：完整权限（改店铺信息 / 添加店员 / 看财务）
 *     store_staff 店员：受限权限（不能改店铺设置 / 不能加店员）
 *
 *   super_admin / sales_ops / warehouse 是平台员工，**不**在此表内（跨店访问）
 */
class CreateStoreAdmins extends Migrator
{
    public function change(): void
    {
        $this->table('store_admins', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '店铺 admin 关联',
        ])
            ->addColumn('store_id', 'integer', ['signed' => false])
            ->addColumn('admin_user_id', 'integer', ['signed' => false])
            ->addColumn('role', 'string', ['limit' => 20, 'default' => 'store_owner'])
            ->addColumn('created_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['store_id', 'admin_user_id'], ['unique' => true, 'name' => 'uk_store_admin'])
            ->addIndex(['admin_user_id'], ['name' => 'idx_admin'])
            ->create();
    }
}
