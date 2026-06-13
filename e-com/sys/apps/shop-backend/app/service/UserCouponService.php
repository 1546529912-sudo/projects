<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 用户优惠券服务（iter-19）
 *   - 所有金额单位：分
 *   - 表 coupons / user_coupons 在 oms_db；通过 'oms' 连接读写（详 config/database.php）
 *   - available / claim / my / check
 *   - check 是结算预检（试算，不改库）
 */
class UserCouponService
{
    private function tbl(string $name)
    {
        return Db::connect('oms')->name($name);
    }

    public function available(int $userId): array
    {
        $now = date('Y-m-d H:i:s');
        $rows = $this->tbl('coupons')
            ->where('status', 'active')
            ->where('valid_to', '>=', $now)
            ->where('valid_from', '<=', $now)
            ->order('id', 'desc')
            ->select()
            ->toArray();
        $couponIds = array_column($rows, 'id');
        $myCounts = [];
        if ($couponIds) {
            $myCounts = $this->tbl('user_coupons')
                ->where('user_id', $userId)
                ->whereIn('coupon_id', $couponIds)
                ->field('coupon_id, count(*) as c')
                ->group('coupon_id')
                ->select()->toArray();
            $myCounts = array_column($myCounts, 'c', 'coupon_id');
        }
        foreach ($rows as &$r) {
            $r['my_claimed'] = (int)($myCounts[$r['id']] ?? 0);
            $r['claimable'] = ($r['total_count'] == 0 || $r['claimed_count'] < $r['total_count'])
                && ($r['my_claimed'] < $r['per_user_limit']);
        }
        return $rows;
    }

    /**
     * 领券（事务 + 双 lock，在 oms 连接的事务内）
     */
    public function claim(int $userId, int $couponId): array
    {
        return Db::connect('oms')->transaction(function () use ($userId, $couponId) {
            $coupon = $this->tbl('coupons')->where('id', $couponId)->lock(true)->find();
            if (!$coupon) throw new \RuntimeException('优惠券不存在');
            if ($coupon['status'] !== 'active') throw new \RuntimeException('优惠券已停用');

            $now = date('Y-m-d H:i:s');
            if ($now < $coupon['valid_from'] || $now > $coupon['valid_to']) {
                throw new \RuntimeException('优惠券不在有效期');
            }
            if ($coupon['total_count'] > 0 && $coupon['claimed_count'] >= $coupon['total_count']) {
                throw new \RuntimeException('优惠券已领完');
            }

            $myCount = $this->tbl('user_coupons')
                ->where('user_id', $userId)
                ->where('coupon_id', $couponId)
                ->lock(true)
                ->count();
            if ($myCount >= $coupon['per_user_limit']) {
                throw new \RuntimeException('已达每人限领次数');
            }

            $id = $this->tbl('user_coupons')->insertGetId([
                'user_id' => $userId,
                'coupon_id' => $couponId,
                'status' => 'unused',
                'received_at' => $now,
            ]);
            $this->tbl('coupons')->where('id', $couponId)->update([
                'claimed_count' => (int)$coupon['claimed_count'] + 1,
            ]);
            return $this->tbl('user_coupons')->where('id', $id)->find();
        });
    }

    public function my(int $userId, string $status = 'all'): array
    {
        $now = date('Y-m-d H:i:s');
        $rows = $this->tbl('user_coupons')
            ->alias('uc')
            ->join('coupons c', 'uc.coupon_id = c.id')
            ->where('uc.user_id', $userId)
            ->field('uc.*, c.name, c.type, c.discount_value, c.min_amount, c.max_discount, c.valid_from, c.valid_to')
            ->order('uc.id', 'desc')
            ->select()
            ->toArray();
        foreach ($rows as &$r) {
            if ($r['status'] === 'unused' && $now > $r['valid_to']) {
                $r['status'] = 'expired';
            }
        }
        if ($status !== 'all') {
            $rows = array_values(array_filter($rows, fn($r) => $r['status'] === $status));
        }
        return $rows;
    }

    /**
     * 预检：user_coupon_id + goods_amount(分) → discount(分) / final(分)
     */
    public function check(int $userId, int $userCouponId, int $goodsAmountCents): array
    {
        $uc = $this->tbl('user_coupons')->where('id', $userCouponId)->find();
        if (!$uc) throw new \RuntimeException('优惠券不存在');
        if ((int)$uc['user_id'] !== $userId) throw new \RuntimeException('优惠券不属于当前用户');
        if ($uc['status'] !== 'unused') throw new \RuntimeException('优惠券已使用或已失效');

        $coupon = $this->tbl('coupons')->where('id', $uc['coupon_id'])->find();
        if (!$coupon) throw new \RuntimeException('优惠券模板已删除');

        $now = date('Y-m-d H:i:s');
        if ($coupon['status'] !== 'active') throw new \RuntimeException('优惠券已停用');
        if ($now < $coupon['valid_from'] || $now > $coupon['valid_to']) {
            throw new \RuntimeException('优惠券不在有效期');
        }
        $minAmount = (int)$coupon['min_amount'];
        if ($goodsAmountCents < $minAmount) {
            $minYuan = number_format($minAmount / 100, 2);
            throw new \RuntimeException("商品金额未满 ¥{$minYuan}");
        }

        $discount = 0;
        if ($coupon['type'] === 'threshold') {
            $discount = (int)$coupon['discount_value'];
        } elseif ($coupon['type'] === 'percent') {
            $pct = (int)$coupon['discount_value'];
            $discount = (int)floor($goodsAmountCents * $pct / 100);
            if ($coupon['max_discount'] !== null) {
                $discount = min($discount, (int)$coupon['max_discount']);
            }
        }
        $discount = min($discount, $goodsAmountCents);
        return [
            'discount' => $discount,
            'final' => $goodsAmountCents - $discount,
            'coupon_name' => $coupon['name'],
        ];
    }
}
