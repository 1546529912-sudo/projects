<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-72 中优 4 项支撑结构
 *   - store_pages: Q35-01/Q39-02 店铺装修
 *   - settlements + approval_status / approved_by / approved_at / rejected_reason: Q26-02 审批流
 */
class Iter72StorePagesSettlementApproval extends Migrator
{
    public function change(): void
    {
        if (!$this->hasTable('store_pages')) {
            $this->table('store_pages', ['comment' => 'iter-72 Q35-01 店铺装修 / 自定义首页'])
                ->addColumn('store_id', 'integer')
                ->addColumn('page_type', 'string', ['limit' => 32, 'default' => 'home', 'comment' => 'home/about/list'])
                ->addColumn('layout_json', 'text', ['null' => true, 'comment' => '{blocks:[{type:"banner|grid|spu_list|text", ...}]}'])
                ->addColumn('status', 'string', ['limit' => 20, 'default' => 'draft', 'comment' => 'draft/published'])
                ->addColumn('version', 'integer', ['default' => 1])
                ->addColumn('updated_by', 'string', ['limit' => 100, 'null' => true])
                ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
                ->addColumn('updated_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
                ->addIndex(['store_id', 'page_type'], ['unique' => true, 'name' => 'uk_store_page'])
                ->create();
        }
        // settlements 加审批字段（iter-26 settlements 已存在）
        if ($this->hasTable('settlements')) {
            $t = $this->table('settlements');
            if (!$t->hasColumn('approval_status')) {
                $t->addColumn('approval_status', 'string', ['limit' => 20, 'default' => 'pending', 'comment' => 'pending/approved/rejected']);
            }
            if (!$t->hasColumn('approved_by')) {
                $t->addColumn('approved_by', 'string', ['limit' => 100, 'null' => true]);
            }
            if (!$t->hasColumn('approved_at')) {
                $t->addColumn('approved_at', 'datetime', ['null' => true]);
            }
            if (!$t->hasColumn('rejection_reason')) {
                $t->addColumn('rejection_reason', 'string', ['limit' => 200, 'null' => true]);
            }
            $t->update();
        }
    }
}
