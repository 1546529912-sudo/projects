<?php
use think\migration\Migrator;

/**
 * 退款明细：按 SKU + 数量拆分（支持部分退款）
 */
class CreateRefundItems extends Migrator
{
    public function change(): void
    {
        $this->table('refund_items', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '退款明细（按 SKU 拆）',
        ])
            ->addColumn('refund_no', 'string', ['limit' => 32])
            ->addColumn('order_no', 'string', ['limit' => 32])
            ->addColumn('sku_code', 'string', ['limit' => 64])
            ->addColumn('qty', 'integer', ['signed' => false])
            ->addColumn('sku_snapshot', 'json', ['null' => true, 'comment' => '退款时 SKU 快照（名 / 主图 / 单价）'])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['refund_no'], ['name' => 'idx_refund_no'])
            ->addIndex(['order_no'], ['name' => 'idx_order_no'])
            ->create();
    }
}
