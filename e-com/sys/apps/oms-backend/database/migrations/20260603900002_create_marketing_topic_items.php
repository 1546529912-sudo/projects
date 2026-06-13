<?php
use think\migration\Migrator;

/**
 * 营销专题关联 SPU（iter-41 BIZ-09-2）
 *   topic ↔ N spu，sort 控制专题落地页商品顺序
 *   UNIQUE(topic_id, spu_id) 防重复
 */
class CreateMarketingTopicItems extends Migrator
{
    public function change(): void
    {
        $this->table('marketing_topic_items', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '专题关联 SPU',
        ])
            ->addColumn('topic_id', 'integer', ['signed' => false])
            ->addColumn('spu_id', 'integer', ['signed' => false])
            ->addColumn('sort', 'integer', ['default' => 0])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['topic_id', 'spu_id'], ['unique' => true, 'name' => 'uk_topic_spu'])
            ->addIndex(['topic_id', 'sort'], ['name' => 'idx_topic_sort'])
            ->create();
    }
}
