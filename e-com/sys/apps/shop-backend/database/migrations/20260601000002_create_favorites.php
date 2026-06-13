<?php
use think\migration\Migrator;

/**
 * 收藏（iter-20）
 *   - SPU 维度（非 SKU），与详情页心标一致
 *   - UNIQUE(user_id, spu_id) 保证并发幂等
 */
class CreateFavorites extends Migrator
{
    public function change(): void
    {
        $this->table('favorites', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '用户收藏',
        ])
            ->addColumn('user_id', 'biginteger', ['signed' => false])
            ->addColumn('spu_id', 'integer', ['signed' => false])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['user_id', 'spu_id'], ['unique' => true, 'name' => 'uk_user_spu'])
            ->addIndex(['user_id'], ['name' => 'idx_user'])
            ->create();
    }
}
