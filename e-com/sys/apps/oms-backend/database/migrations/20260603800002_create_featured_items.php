<?php
use think\migration\Migrator;

/**
 * 内容运营 · 推荐位（iter-40 BIZ-09-1）
 *
 *   position:
 *     home_hot      首页热门推荐
 *     home_new      首页新品推荐
 *     category_top  类目页置顶
 *     detail_related 详情页相关推荐（按 category）
 *
 *   一个 spu_id 可同时在多个 position（不同 row）
 */
class CreateFeaturedItems extends Migrator
{
    public function change(): void
    {
        $this->table('featured_items', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '内容运营 推荐位',
        ])
            ->addColumn('position', 'string', ['limit' => 32])
            ->addColumn('spu_id', 'integer', ['signed' => false])
            ->addColumn('sort', 'integer', ['default' => 0])
            ->addColumn('status', 'string', ['limit' => 16, 'default' => 'enabled'])
            ->addColumn('valid_from', 'datetime', ['null' => true])
            ->addColumn('valid_to', 'datetime', ['null' => true])
            ->addColumn('store_id', 'integer', ['signed' => false, 'null' => true])
            ->addColumn('created_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addColumn('deleted_at', 'datetime', ['null' => true])
            ->addIndex(['position', 'status'], ['name' => 'idx_pos_status'])
            ->addIndex(['spu_id'], ['name' => 'idx_spu'])
            ->create();
    }
}
