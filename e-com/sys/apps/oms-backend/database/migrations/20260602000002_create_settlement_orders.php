<?php
use think\migration\Migrator;

/**
 * 财务结算单（iter-26 P0-3）
 *   - type: order（订单完成）/ refund（退款完成）
 *   - amount: 分。refund 用负数，方便统计 net
 *   - status: unsettled（自动落单时）→ settled（admin 手动确认）
 *   - UNIQUE (type, ref_no) 防重复
 */
class CreateSettlementOrders extends Migrator
{
    public function change(): void
    {
        $this->table('settlement_orders', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '财务结算单',
        ])
            ->addColumn('settlement_no', 'string', ['limit' => 32])
            ->addColumn('type', 'string', ['limit' => 16, 'comment' => 'order/refund'])
            ->addColumn('ref_no', 'string', ['limit' => 32, 'comment' => 'order_no/refund_no'])
            ->addColumn('user_id', 'integer', ['signed' => false])
            ->addColumn('amount', 'biginteger', ['comment' => '分；refund 为负'])
            ->addColumn('goods_amount', 'biginteger', ['default' => 0])
            ->addColumn('freight', 'biginteger', ['default' => 0])
            ->addColumn('discount', 'biginteger', ['default' => 0])
            ->addColumn('status', 'string', ['limit' => 16, 'default' => 'unsettled'])
            ->addColumn('remark', 'string', ['limit' => 255, 'default' => ''])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('settled_at', 'datetime', ['null' => true])
            ->addIndex(['settlement_no'], ['unique' => true, 'name' => 'uk_settlement_no'])
            ->addIndex(['type', 'ref_no'], ['unique' => true, 'name' => 'uk_type_ref'])
            ->addIndex(['type', 'status'], ['name' => 'idx_type_status'])
            ->addIndex(['created_at'], ['name' => 'idx_created'])
            ->create();
    }
}
