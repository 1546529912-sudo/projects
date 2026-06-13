<?php
use think\migration\Migrator;

/**
 * 地址簿（iter-20）
 *   - 多地址 + is_default 标记
 *   - 兼容老 users.last_address_snapshot：地址簿空时仍允许下单回落
 */
class CreateAddresses extends Migrator
{
    public function change(): void
    {
        $this->table('addresses', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '用户地址簿',
        ])
            ->addColumn('user_id', 'biginteger', ['signed' => false])
            ->addColumn('name', 'string', ['limit' => 50])
            ->addColumn('phone', 'string', ['limit' => 20])
            ->addColumn('province', 'string', ['limit' => 50])
            ->addColumn('city', 'string', ['limit' => 50])
            ->addColumn('district', 'string', ['limit' => 50])
            ->addColumn('detail', 'string', ['limit' => 255])
            ->addColumn('is_default', 'boolean', ['default' => 0])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['user_id', 'is_default'], ['name' => 'idx_user_default'])
            ->create();
    }
}
