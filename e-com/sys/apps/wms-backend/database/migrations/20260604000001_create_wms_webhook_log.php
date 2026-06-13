<?php
use think\migration\Migrator;

/**
 * WMS webhook 推送日志（iter-54 Q32-01）
 */
class CreateWmsWebhookLog extends Migrator
{
    public function change(): void
    {
        $this->table('wms_webhook_log', [
            'engine' => 'InnoDB', 'collation' => 'utf8mb4_unicode_ci',
            'comment' => 'WMS webhook 推送日志',
        ])
            ->addColumn('rule_id', 'integer', ['signed' => false])
            ->addColumn('sku_code', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('webhook_url', 'string', ['limit' => 500])
            ->addColumn('payload', 'text', ['null' => true])
            ->addColumn('http_code', 'integer', ['null' => true])
            ->addColumn('response_body', 'text', ['null' => true])
            ->addColumn('success', 'boolean', ['default' => 0])
            ->addColumn('error_msg', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['rule_id', 'created_at'], ['name' => 'idx_rule_created'])
            ->addIndex(['success', 'created_at'], ['name' => 'idx_success_created'])
            ->create();
    }
}
