<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 优惠券核心服务（iter-19）
 *   - 所有金额单位：分（bigint），与 orders 表一致
 *   - threshold 满减：goods_amount(分) ≥ min_amount(分) → discount = discount_value(分)
 *   - percent  折扣：discount = floor(goods_amount × discount_value / 100)，max_discount 封顶
 *                     discount_value 范围 1-99（15 = 减 15% = 8.5 折）
 */
class CouponService
{
    /* ============= Admin: 模板 CRUD ============= */

    public function adminList(int $page = 1, int $size = 20, string $status = ''): array
    {
        $q = Db::name('coupons');
        if ($status !== '') $q = $q->where('status', $status);
        $total = $q->count();
        $rows = (clone $q)
            ->order('id', 'desc')
            ->page($page, $size)
            ->select()
            ->toArray();
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    public function create(array $data): array
    {
        $this->validateInput($data);
        $now = date('Y-m-d H:i:s');
        // iter-27 Q19-01: scope
        $scopeType = $data['scope_type'] ?? 'all';
        if (!in_array($scopeType, ['all', 'spu', 'category'], true)) {
            throw new \RuntimeException('scope_type 仅支持 all/spu/category');
        }
        $scopeValue = null;
        if ($scopeType !== 'all') {
            $sv = $data['scope_value'] ?? [];
            if (!is_array($sv) || empty($sv)) {
                throw new \RuntimeException("scope_type={$scopeType} 需带 scope_value 数组");
            }
            $scopeValue = array_values(array_map('intval', $sv));
        }

        $id = Db::name('coupons')->insertGetId([
            'name' => $data['name'],
            'type' => $data['type'],
            'scope_type' => $scopeType,
            'scope_value' => $scopeValue ? json_encode($scopeValue) : null,
            'discount_value' => (int)$data['discount_value'],
            'min_amount' => (int)($data['min_amount'] ?? 0),
            'max_discount' => isset($data['max_discount']) && $data['max_discount'] !== null && $data['max_discount'] !== ''
                ? (int)$data['max_discount'] : null,
            'total_count' => (int)($data['total_count'] ?? 0),
            'per_user_limit' => (int)($data['per_user_limit'] ?? 1),
            'valid_from' => $data['valid_from'],
            'valid_to' => $data['valid_to'],
            'status' => 'active',
            'created_at' => $now,
        ]);
        return Db::name('coupons')->where('id', $id)->find();
    }

    public function update(int $id, array $data): array
    {
        $row = Db::name('coupons')->where('id', $id)->find();
        if (!$row) throw new \RuntimeException('优惠券不存在');

        $update = [];
        // 允许改的字段（不允许改 type / discount_value，避免运行中规则变更）
        foreach (['name', 'valid_to', 'total_count', 'per_user_limit', 'max_discount'] as $k) {
            if (array_key_exists($k, $data) && $data[$k] !== null) {
                $update[$k] = in_array($k, ['total_count', 'per_user_limit', 'max_discount'], true)
                    ? ($data[$k] === '' ? null : (int)$data[$k])
                    : $data[$k];
            }
        }
        if (!$update) throw new \RuntimeException('没有可更新字段');
        Db::name('coupons')->where('id', $id)->update($update);
        return Db::name('coupons')->where('id', $id)->find();
    }

    public function disable(int $id): array
    {
        $row = Db::name('coupons')->where('id', $id)->find();
        if (!$row) throw new \RuntimeException('优惠券不存在');
        Db::name('coupons')->where('id', $id)->update(['status' => 'disabled']);
        return Db::name('coupons')->where('id', $id)->find();
    }

    /* ============= 下单核销：纯计算（单位：分） ============= */

    public function calculateDiscount(array $coupon, int $goodsAmountCents, ?array $items = null): array
    {
        if ($coupon['status'] !== 'active') {
            throw new \RuntimeException('优惠券已停用');
        }
        $now = date('Y-m-d H:i:s');
        if ($now < $coupon['valid_from'] || $now > $coupon['valid_to']) {
            throw new \RuntimeException('优惠券不在有效期');
        }
        $minAmount = (int)$coupon['min_amount'];
        if ($goodsAmountCents < $minAmount) {
            $minYuan = number_format($minAmount / 100, 2);
            throw new \RuntimeException("商品金额未满 ¥{$minYuan}");
        }
        // iter-27 Q19-01: 商品券 / 品类券 scope 校验
        if ($items !== null && ($coupon['scope_type'] ?? 'all') !== 'all') {
            if (!$this->itemsMatchScope($coupon, $items)) {
                throw new \RuntimeException('订单商品不在优惠券适用范围');
            }
        }

        $discount = 0;
        if ($coupon['type'] === 'threshold') {
            $discount = (int)$coupon['discount_value'];
        } elseif ($coupon['type'] === 'percent') {
            $pct = (int)$coupon['discount_value']; // 15 = 15% off
            $discount = (int)floor($goodsAmountCents * $pct / 100);
            if ($coupon['max_discount'] !== null) {
                $discount = min($discount, (int)$coupon['max_discount']);
            }
        } else {
            throw new \RuntimeException('未知券类型');
        }
        $discount = min($discount, $goodsAmountCents);
        return [
            'discount' => $discount,
            'final' => $goodsAmountCents - $discount,
        ];
    }

    /**
     * iter-27 Q19-01: items[] 至少有 1 个 SKU 在 scope 内即视为命中
     *   items: [{sku_code, spu_id?, category_id?, ...}]
     */
    public function itemsMatchScope(array $coupon, array $items): bool
    {
        $scopeType = $coupon['scope_type'] ?? 'all';
        if ($scopeType === 'all') return true;
        $raw = $coupon['scope_value'] ?? null;
        $scope = is_string($raw) ? json_decode($raw, true) : (is_array($raw) ? $raw : []);
        if (!$scope) return false;
        foreach ($items as $it) {
            if ($scopeType === 'spu') {
                $sid = (int)($it['spu_id'] ?? 0);
                if ($sid > 0 && in_array($sid, $scope, true)) return true;
            } elseif ($scopeType === 'category') {
                $cid = (int)($it['category_id'] ?? 0);
                if ($cid > 0 && in_array($cid, $scope, true)) return true;
            }
        }
        return false;
    }

    /**
     * 单券核销：tx 内调用（userCoupon、coupon 应已 lock）
     *   iter-27: 增加可选 items 参数用于 scope 校验
     */
    public function applyInTransaction(array $userCoupon, array $coupon, string $orderNo, int $goodsAmountCents, int $userId, ?array $items = null): int
    {
        if ((int)$userCoupon['user_id'] !== $userId) {
            throw new \RuntimeException('优惠券不属于当前用户');
        }
        if ($userCoupon['status'] !== 'unused') {
            throw new \RuntimeException('优惠券已使用或已失效');
        }
        if ((int)$userCoupon['coupon_id'] !== (int)$coupon['id']) {
            throw new \RuntimeException('优惠券模板不匹配');
        }

        $calc = $this->calculateDiscount($coupon, $goodsAmountCents, $items);

        Db::name('user_coupons')->where('id', $userCoupon['id'])->update([
            'status' => 'used',
            'used_at' => date('Y-m-d H:i:s'),
            'order_no' => $orderNo,
        ]);
        Db::name('coupons')->where('id', $coupon['id'])->update([
            'used_count' => (int)$coupon['used_count'] + 1,
        ]);
        // iter-27 Q19-03: 写入 order_coupons 关联
        Db::name('order_coupons')->insert([
            'order_no' => $orderNo,
            'user_coupon_id' => (int)$userCoupon['id'],
            'coupon_id' => (int)$coupon['id'],
            'coupon_type' => $coupon['type'],
            'discount' => $calc['discount'],
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return $calc['discount'];
    }

    /**
     * iter-27 Q19-03: 多券核销
     *   规则：最多 1 张满减 + 1 张折扣；满减先算 → 折扣基于(goods - threshold) 算
     *
     *   $userCouponBundles: [['user_coupon' => row, 'coupon' => row], ...]
     *   返回总 discount
     */
    public function applyMultipleInTransaction(array $userCouponBundles, string $orderNo, int $goodsAmountCents, int $userId, ?array $items = null): int
    {
        // 按类型分组
        $byType = ['threshold' => null, 'percent' => null];
        foreach ($userCouponBundles as $b) {
            $type = $b['coupon']['type'] ?? '';
            if (!array_key_exists($type, $byType)) throw new \RuntimeException("未知券类型: {$type}");
            if ($byType[$type] !== null) {
                throw new \RuntimeException("同类型只能用 1 张：{$type}");
            }
            $byType[$type] = $b;
        }

        $totalDiscount = 0;
        $remaining = $goodsAmountCents;

        // 先算满减
        if ($byType['threshold'] !== null) {
            $b = $byType['threshold'];
            $d = $this->applyInTransaction($b['user_coupon'], $b['coupon'], $orderNo, $remaining, $userId, $items);
            $totalDiscount += $d;
            $remaining -= $d;
        }
        // 再算折扣（基于减后金额）
        if ($byType['percent'] !== null) {
            $b = $byType['percent'];
            if ($remaining <= 0) {
                throw new \RuntimeException('满减已抵扣全部，折扣券无法叠加');
            }
            $d = $this->applyInTransaction($b['user_coupon'], $b['coupon'], $orderNo, $remaining, $userId, $items);
            $totalDiscount += $d;
        }

        return $totalDiscount;
    }

    /* ============= 校验 ============= */

    private function validateInput(array $data): void
    {
        $required = ['name', 'type', 'discount_value', 'valid_from', 'valid_to'];
        foreach ($required as $k) {
            if (!isset($data[$k]) || $data[$k] === '') {
                throw new \RuntimeException("{$k} 必传");
            }
        }
        if (!in_array($data['type'], ['threshold', 'percent'], true)) {
            throw new \RuntimeException('type 仅支持 threshold/percent');
        }
        $v = (int)$data['discount_value'];
        if ($data['type'] === 'threshold' && $v <= 0) {
            throw new \RuntimeException('满减 discount_value 必须 > 0（单位:分）');
        }
        if ($data['type'] === 'percent' && ($v < 1 || $v > 99)) {
            throw new \RuntimeException('折扣 discount_value 必须 1-99（15 = 减 15%）');
        }
        if ($data['valid_from'] >= $data['valid_to']) {
            throw new \RuntimeException('valid_from 必须早于 valid_to');
        }
    }
}
