<?php
use think\migration\Migrator;

/**
 * Token 黑名单（iter-58 M3-21）
 *   admin 改密 / 角色变更 / 状态变 disabled 时 — 把当前 token 加黑
 *   AdminAuth middleware verify 时查黑名单
 */
class CreateTokenBlacklist extends Migrator
{
    public function change(): void
    {
        $this->table('token_blacklist', [
            'engine' => 'InnoDB', 'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'JWT 黑名单',
        ])
            ->addColumn('jti', 'string', ['limit' => 100, 'comment' => 'JWT id 或 sub:exp 拼合'])
            ->addColumn('admin_user_id', 'integer', ['signed' => false])
            ->addColumn('reason', 'string', ['limit' => 100])
            ->addColumn('blacklisted_until', 'datetime')
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['jti'], ['unique' => true, 'name' => 'uk_jti'])
            ->addIndex(['blacklisted_until'], ['name' => 'idx_until'])
            ->create();
    }
}
