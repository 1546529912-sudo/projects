<?php
use think\migration\Migrator;

/**
 * 内容运营 · Banner（iter-40 BIZ-09-1）
 *
 *   position:
 *     home    首页轮播位
 *     category 类目页 banner
 *     detail   商品详情页 banner
 *
 *   link_type:
 *     spu      点击跳转 SPU 详情（link_value=spu_id）
 *     category 跳转类目（link_value=category_id）
 *     url      跳转外链（link_value=URL）
 *     none     仅展示，不可点
 */
class CreateBanners extends Migrator
{
    public function change(): void
    {
        $this->table('banners', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '内容运营 Banner',
        ])
            ->addColumn('code', 'string', ['limit' => 64])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('position', 'string', ['limit' => 32])
            ->addColumn('image_url', 'string', ['limit' => 500])
            ->addColumn('link_type', 'string', ['limit' => 16, 'default' => 'none'])
            ->addColumn('link_value', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('sort', 'integer', ['default' => 0, 'comment' => '同位置内排序，小在前'])
            ->addColumn('status', 'string', ['limit' => 16, 'default' => 'enabled'])
            ->addColumn('valid_from', 'datetime', ['null' => true])
            ->addColumn('valid_to', 'datetime', ['null' => true])
            ->addColumn('store_id', 'integer', ['signed' => false, 'null' => true, 'comment' => 'NULL=平台 banner'])
            ->addColumn('created_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addColumn('deleted_at', 'datetime', ['null' => true])
            ->addIndex(['code'], ['unique' => true, 'name' => 'uk_code'])
            ->addIndex(['position', 'status'], ['name' => 'idx_pos_status'])
            ->addIndex(['store_id'], ['name' => 'idx_store'])
            ->create();
    }
}
