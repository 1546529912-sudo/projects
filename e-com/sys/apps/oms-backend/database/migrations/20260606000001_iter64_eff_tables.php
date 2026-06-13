<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-64 效率深化：3 新结构
 *   - admin_views: Q42-02 高级搜索条件"我的视图"
 *   - stream_replay_policies: Q42-03 dead_letter 按 stream 配 max_retries
 *   - refund_orders / exchange_orders 加 second_review_note: Q43-02
 */
class Iter64EffTables extends Migrator
{
    public function change(): void
    {
        // Q42-02 admin_views
        if (!$this->hasTable('admin_views')) {
            $this->table('admin_views', ['comment' => 'iter-64 Q42-02 高级搜索我的视图'])
                ->addColumn('admin_user_id', 'integer')
                ->addColumn('scope', 'string', ['limit' => 32, 'comment' => 'orders/refunds/exchanges'])
                ->addColumn('name', 'string', ['limit' => 64])
                ->addColumn('filters_json', 'text', ['null' => true])
                ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
                ->addIndex(['admin_user_id', 'scope'], ['name' => 'idx_admin_scope'])
                ->create();
        }
        // Q42-03 stream_replay_policies
        if (!$this->hasTable('stream_replay_policies')) {
            $this->table('stream_replay_policies', ['comment' => 'iter-64 Q42-03 死信自动 replay 策略'])
                ->addColumn('stream', 'string', ['limit' => 64])
                ->addColumn('max_retries', 'integer', ['default' => 3])
                ->addColumn('enabled', 'integer', ['limit' => 1, 'default' => 1])
                ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
                ->addIndex(['stream'], ['unique' => true, 'name' => 'uk_stream'])
                ->create();
            // 默认策略
            $defaults = [
                ['oms.order.paid', 3], ['oms.order.cancelled', 3], ['oms.refund.approved', 3],
                ['oms.refund.refunded', 3], ['pim.sku.changed', 5], ['oms.exchange.completed', 3],
                ['wms.alert.critical', 1],
            ];
            foreach ($defaults as $d) {
                $this->execute("INSERT INTO stream_replay_policies (stream, max_retries, enabled) VALUES ('{$d[0]}', {$d[1]}, 1)");
            }
        }
        // Q43-02 refund/exchange 二审备注
        if ($this->hasTable('refund_orders') && !$this->table('refund_orders')->hasColumn('second_review_note')) {
            $this->table('refund_orders')->addColumn('second_review_note', 'string', ['limit' => 200, 'null' => true, 'comment' => 'super 二审意见'])->update();
        }
        if ($this->hasTable('exchange_orders') && !$this->table('exchange_orders')->hasColumn('second_review_note')) {
            $this->table('exchange_orders')->addColumn('second_review_note', 'string', ['limit' => 200, 'null' => true])->update();
        }
        // EFF-06 audit_log 加 reversed_at（用于撤销标记）
        if ($this->hasTable('admin_audit_log') && !$this->table('admin_audit_log')->hasColumn('reversed_at')) {
            $this->table('admin_audit_log')
                ->addColumn('reversed_at', 'datetime', ['null' => true])
                ->addColumn('reversed_by', 'string', ['limit' => 100, 'null' => true])
                ->update();
        }
    }
}
