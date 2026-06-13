<?php
use think\migration\Migrator;

/**
 * stock_alert_rules 加 webhook 通知字段（iter-32 A）
 *   - notify_webhook_url：外部接收 URL（如企业微信/钉钉/飞书机器人），为空则不推
 *   - notify_cooldown_minutes：冷却时间，避免触发后反复推送（默认 60 分钟）
 *   - last_notified_at：最近一次推送时间，调度时算冷却
 */
class AlterStockAlertRulesAddWebhook extends Migrator
{
    public function change(): void
    {
        $this->table('stock_alert_rules')
            ->addColumn('notify_webhook_url', 'string', ['limit' => 500, 'null' => true, 'after' => 'remark'])
            ->addColumn('notify_cooldown_minutes', 'integer', ['default' => 60, 'after' => 'notify_webhook_url'])
            ->addColumn('last_notified_at', 'datetime', ['null' => true, 'after' => 'notify_cooldown_minutes'])
            ->update();
    }
}
