<?php
use think\migration\Migrator;

/**
 * webhook 订阅 + 投递统计合并表（iter-28 A1）
 *   - events JSON 数组：['order.completed', 'order.cancelled', 'refund.refunded']
 *   - secret: HMAC-SHA256 签名密钥（admin 可重置）
 *   - 投递统计：total_fired / total_success / total_failed + last_*
 */
class CreateWebhookSubscriptions extends Migrator
{
    public function change(): void
    {
        $this->table('webhook_subscriptions', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'Webhook 订阅',
        ])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('url', 'string', ['limit' => 500])
            ->addColumn('events', 'json')
            ->addColumn('secret', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('enabled', 'boolean', ['default' => 1])
            ->addColumn('retry_max', 'integer', ['default' => 3])
            ->addColumn('total_fired', 'integer', ['default' => 0])
            ->addColumn('total_success', 'integer', ['default' => 0])
            ->addColumn('total_failed', 'integer', ['default' => 0])
            ->addColumn('last_fired_at', 'datetime', ['null' => true])
            ->addColumn('last_status', 'integer', ['null' => true])
            ->addColumn('last_error', 'string', ['limit' => 500, 'default' => ''])
            ->addColumn('created_by', 'string', ['limit' => 64])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['enabled'], ['name' => 'idx_enabled'])
            ->create();
    }
}
