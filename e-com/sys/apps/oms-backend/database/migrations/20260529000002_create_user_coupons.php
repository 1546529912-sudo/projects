<?php
use think\migration\Migrator;

/**
 * 用户已领券（iter-19）
 *   - status: unused / used / expired
 *   - 领取时 insert，下单核销时 status=used + order_no + used_at
 *   - expired 仅查询时由调用方判断（不主动跑 cron）
 */
class CreateUserCoupons extends Migrator
{
    public function change(): void
    {
        $this->table('user_coupons', [
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'comment' => '用户已领优惠券',
        ])
            ->addColumn('user_id', 'integer', ['signed' => false])
            ->addColumn('coupon_id', 'integer', ['signed' => false])
            ->addColumn('status', 'string', ['limit' => 16, 'default' => 'unused'])
            ->addColumn('received_at', 'datetime')
            ->addColumn('used_at', 'datetime', ['null' => true])
            ->addColumn('order_no', 'string', ['limit' => 32, 'null' => true])
            ->addIndex(['user_id', 'status'], ['name' => 'idx_user_status'])
            ->addIndex(['coupon_id'], ['name' => 'idx_coupon'])
            ->create();
    }
}
