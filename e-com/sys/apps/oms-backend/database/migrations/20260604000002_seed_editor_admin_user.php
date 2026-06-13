<?php
use think\migration\Migrator;
use think\facade\Db;

/**
 * iter-43 EFF-04 PIM editor 角色测试账号
 *   - editor 角色：可 PIM CRUD（draft/update/delete/SKU/上传图）不可 publish/offline
 *   - 共用 admin_users 表（OMS 主表，PIM/WMS 同 secret 自己 verify）
 */
class SeedEditorAdminUser extends Migrator
{
    public function change(): void
    {
        $now = date('Y-m-d H:i:s');
        // 幂等：已存在则跳过
        $exists = Db::name('admin_users')->where('username', 'editor')->find();
        if (!$exists) {
            $this->table('admin_users')->insert([
                'username' => 'editor',
                'password_hash' => password_hash('editor123', PASSWORD_BCRYPT),
                'name' => '商品编辑',
                'role' => 'editor',
                'created_at' => $now,
            ])->saveData();
        }
    }
}
