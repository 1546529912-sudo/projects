<?php
use think\migration\Migrator;

/**
 * 商家仓入库审核（iter-58 Q38-02）
 *   商家仓（warehouse_type=merchant）的入库单 needs_review=1
 *   super_admin/sales_ops 审核后才能 autoComplete
 */
class AlterInboundAddNeedsReview extends Migrator
{
    public function change(): void
    {
        $this->table('inbound_orders')
            ->addColumn('needs_review', 'boolean', ['default' => 0, 'after' => 'status'])
            ->addColumn('reviewed_by', 'string', ['limit' => 64, 'null' => true, 'after' => 'needs_review'])
            ->addColumn('reviewed_at', 'datetime', ['null' => true, 'after' => 'reviewed_by'])
            ->update();
    }
}
