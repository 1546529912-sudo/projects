<?php
use think\migration\Migrator;

/**
 * 评价（iter-20）
 *   - rating 1-5
 *   - images JSON 数组（相对路径，复用 iter-15 /uploads/ 机制）
 *   - status active/hidden，admin 软删隐藏不物理删
 *   - 一单一评：UNIQUE(order_no, sku_code)
 */
class CreateReviews extends Migrator
{
    public function change(): void
    {
        $this->table('reviews', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '商品评价',
        ])
            ->addColumn('user_id', 'biginteger', ['signed' => false])
            ->addColumn('order_no', 'string', ['limit' => 32])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('spu_id', 'integer', ['signed' => false])
            ->addColumn('rating', 'tinyinteger', ['comment' => '1-5'])
            ->addColumn('content', 'string', ['limit' => 1000, 'default' => ''])
            ->addColumn('images', 'json', ['null' => true])
            ->addColumn('status', 'string', ['limit' => 16, 'default' => 'active'])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['spu_id', 'status'], ['name' => 'idx_spu_status'])
            ->addIndex(['user_id'], ['name' => 'idx_user'])
            ->addIndex(['order_no'], ['name' => 'idx_order'])
            ->addIndex(['order_no', 'sku_code'], ['unique' => true, 'name' => 'uk_order_sku'])
            ->create();
    }
}
