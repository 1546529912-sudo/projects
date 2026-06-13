<?php
use think\migration\Migrator;

/**
 * 订单券关联（iter-27 Q19-03 多券叠加）
 *   一订单可以挂 ≤2 张券：1 张满减 + 1 张折扣
 *   UNIQUE(order_no, coupon_type) DB 层强约束"同类不叠"
 */
class CreateOrderCoupons extends Migrator
{
    public function change(): void
    {
        $this->table('order_coupons', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '订单券关联（多券叠加）',
        ])
            ->addColumn('order_no', 'string', ['limit' => 32])
            ->addColumn('user_coupon_id', 'integer', ['signed' => false])
            ->addColumn('coupon_id', 'integer', ['signed' => false])
            ->addColumn('coupon_type', 'string', ['limit' => 16, 'comment' => 'threshold/percent'])
            ->addColumn('discount', 'biginteger', ['comment' => '该券实际抵扣分'])
            ->addColumn('created_at', 'datetime', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['order_no'], ['name' => 'idx_order_no'])
            ->addIndex(['order_no', 'coupon_type'], ['unique' => true, 'name' => 'uk_order_type'])
            ->create();
    }
}
