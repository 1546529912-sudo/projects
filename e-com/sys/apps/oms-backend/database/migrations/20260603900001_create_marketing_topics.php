<?php
use think\migration\Migrator;

/**
 * 营销专题（iter-41 BIZ-09-2）
 *
 *   一个专题 = 一组商品 + 落地页 banner + 时间段
 *   例：618 大促 / 双 11 / 新人专享
 *
 *   关联商品在 marketing_topic_items
 */
class CreateMarketingTopics extends Migrator
{
    public function change(): void
    {
        $this->table('marketing_topics', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '营销专题',
        ])
            ->addColumn('code', 'string', ['limit' => 64])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('banner_image_url', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('description', 'string', ['limit' => 1000, 'null' => true])
            ->addColumn('start_at', 'datetime', ['null' => true])
            ->addColumn('end_at', 'datetime', ['null' => true])
            ->addColumn('sort', 'integer', ['default' => 0])
            ->addColumn('status', 'string', ['limit' => 16, 'default' => 'enabled'])
            ->addColumn('store_id', 'integer', ['signed' => false, 'null' => true, 'comment' => 'NULL=平台'])
            ->addColumn('created_by', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addColumn('deleted_at', 'datetime', ['null' => true])
            ->addIndex(['code'], ['unique' => true, 'name' => 'uk_code'])
            ->addIndex(['status', 'start_at'], ['name' => 'idx_status_start'])
            ->create();
    }
}
