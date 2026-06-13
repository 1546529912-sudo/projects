<?php
declare(strict_types=1);

use think\migration\Migrator;

/**
 * iter-67 优惠券深化（oms-backend 端）
 *   - user_coupons: + referrer_user_id（推荐人；Q19-05）+ status='returned' 复用（Q19-04 退款返券）
 *   - coupon_auto_rules: + condition_type 加 'order_n_reached' 枚举（Q27-03）
 *   - coupons: 无新列（scope 已支持 SPU/category 自 iter-19）
 */
class Iter67CouponShareReferrer extends Migrator
{
    public function change(): void
    {
        if ($this->hasTable('user_coupons')) {
            $t = $this->table('user_coupons');
            if (!$t->hasColumn('referrer_user_id')) {
                $t->addColumn('referrer_user_id', 'integer', ['null' => true, 'comment' => 'Q19-05 分享 / 推荐链路']);
            }
            if (!$t->hasColumn('returned_at')) {
                $t->addColumn('returned_at', 'datetime', ['null' => true, 'comment' => 'Q19-04 退款返券时间']);
            }
            $t->update();
        }
        if ($this->hasTable('coupon_auto_rules')) {
            $t = $this->table('coupon_auto_rules');
            if (!$t->hasColumn('order_n_threshold')) {
                $t->addColumn('order_n_threshold', 'integer', ['default' => 0, 'comment' => 'Q27-03 已下单 N 单后赠条件，0=不启用'])->update();
            }
        }
    }
}
