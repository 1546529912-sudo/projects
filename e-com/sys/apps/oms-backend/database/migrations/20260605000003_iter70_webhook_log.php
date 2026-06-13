<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-70 Q33-02 webhook 推送日志独立表（逐条投递记录）
 *   - 当前 WebhookService 只统计 total_sent/total_failed；这里加每次投递明细
 */
class Iter70WebhookLog extends Migrator
{
    public function change(): void
    {
        if (!$this->hasTable('webhook_delivery_log')) {
            $this->table('webhook_delivery_log', ['comment' => 'iter-70 Q33-02 逐条投递日志'])
                ->addColumn('endpoint_id', 'integer', ['null' => true])
                ->addColumn('endpoint_url', 'string', ['limit' => 500])
                ->addColumn('event', 'string', ['limit' => 100])
                ->addColumn('payload', 'text', ['null' => true])
                ->addColumn('http_status', 'integer', ['default' => 0])
                ->addColumn('response_excerpt', 'string', ['limit' => 500, 'null' => true])
                ->addColumn('duration_ms', 'integer', ['default' => 0])
                ->addColumn('success', 'integer', ['limit' => 1, 'default' => 0])
                ->addColumn('error', 'string', ['limit' => 500, 'null' => true])
                ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
                ->addIndex(['endpoint_id', 'created_at'], ['name' => 'idx_endpoint_time'])
                ->addIndex(['event', 'success'], ['name' => 'idx_event_ok'])
                ->create();
        }
    }
}
