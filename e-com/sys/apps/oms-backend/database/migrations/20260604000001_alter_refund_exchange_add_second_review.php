<?php
use think\migration\Migrator;

/**
 * iter-43 EFF-03 审批流：refund_orders + exchange_orders 加二审字段
 *   - needs_second_review: TINYINT 1=待 super 二审 / 0=无需
 *   - first_approved_by:   一审人 username
 *   - first_approved_at:   一审时间
 *   阈值由 ENV OMS_REFUND_REVIEW_THRESHOLD_CENTS / OMS_EXCHANGE_REVIEW_THRESHOLD_CENTS 控制
 */
class AlterRefundExchangeAddSecondReview extends Migrator
{
    public function change(): void
    {
        $this->table('refund_orders')
            ->addColumn('needs_second_review', 'integer', ['limit' => 1, 'default' => 0, 'null' => false, 'after' => 'approved_by'])
            ->addColumn('first_approved_by', 'string', ['limit' => 64, 'null' => true, 'after' => 'needs_second_review'])
            ->addColumn('first_approved_at', 'datetime', ['null' => true, 'after' => 'first_approved_by'])
            ->update();

        $this->table('exchange_orders')
            ->addColumn('needs_second_review', 'integer', ['limit' => 1, 'default' => 0, 'null' => false, 'after' => 'approved_by'])
            ->addColumn('first_approved_by', 'string', ['limit' => 64, 'null' => true, 'after' => 'needs_second_review'])
            ->addColumn('first_approved_at', 'datetime', ['null' => true, 'after' => 'first_approved_by'])
            ->update();
    }
}
