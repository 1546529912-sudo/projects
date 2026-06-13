<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 优惠券自动发放规则（iter-27 Q19-02）
 *   - admin CRUD 规则
 *   - grantForTrigger: 按 trigger 触发发放（shop-backend 在用户首次登录时调）
 *
 *   trigger_type:
 *     - user_register      首次创建用户时触发
 *     - order_completed    M3+ 留位
 *
 *   per_user_limit + granted_count 双限制防超发
 */
class CouponAutoRuleService
{
    /* ============= Admin CRUD ============= */

    public function listRules(): array
    {
        return Db::name('coupon_auto_rules')
            ->alias('r')
            ->leftJoin('coupons c', 'c.id = r.coupon_id')
            ->field('r.*, c.name AS coupon_name, c.type AS coupon_type')
            ->order('r.id', 'desc')
            ->select()->toArray();
    }

    public function createRule(array $data): array
    {
        $this->validateRule($data);
        $id = Db::name('coupon_auto_rules')->insertGetId([
            'name' => $data['name'],
            'trigger_type' => $data['trigger_type'],
            'coupon_id' => (int)$data['coupon_id'],
            'per_user_limit' => (int)($data['per_user_limit'] ?? 1),
            'granted_count' => 0,
            'enabled' => isset($data['enabled']) ? (int)$data['enabled'] : 1,
            'remark' => $data['remark'] ?? '',
            'created_by' => $data['created_by'] ?? 'system',
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return Db::name('coupon_auto_rules')->where('id', $id)->find();
    }

    public function updateRule(int $id, array $data): array
    {
        $row = Db::name('coupon_auto_rules')->where('id', $id)->find();
        if (!$row) throw new \RuntimeException('规则不存在');
        $update = [];
        foreach (['name', 'enabled', 'per_user_limit', 'remark'] as $k) {
            if (array_key_exists($k, $data)) $update[$k] = $data[$k];
        }
        if (!$update) throw new \RuntimeException('没有可更新字段');
        Db::name('coupon_auto_rules')->where('id', $id)->update($update);
        return Db::name('coupon_auto_rules')->where('id', $id)->find();
    }

    public function deleteRule(int $id): void
    {
        Db::name('coupon_auto_rules')->where('id', $id)->delete();
    }

    /* ============= 触发发放 ============= */

    /**
     * 按 trigger + userId 批量发券
     *   - 找所有 enabled 规则
     *   - 逐条事务发券（user_coupons.insert + coupons.claimed_count++ + rule.granted_count++）
     *   - per_user_limit 双校验
     *
     *   返回成功发放数
     */
    public function grantForTrigger(string $triggerType, int $userId): int
    {
        $rules = Db::name('coupon_auto_rules')
            ->where('trigger_type', $triggerType)
            ->where('enabled', 1)
            ->select()->toArray();
        if (!$rules) return 0;

        $granted = 0;
        foreach ($rules as $rule) {
            try {
                $ok = $this->grantSingle($rule, $userId);
                if ($ok) $granted++;
            } catch (\Throwable $e) {
                // 单条失败不影响其他规则
            }
        }
        return $granted;
    }

    private function grantSingle(array $rule, int $userId): bool
    {
        return (bool)Db::transaction(function () use ($rule, $userId) {
            // 用户已领数量
            $myCount = Db::name('user_coupons')
                ->where('user_id', $userId)
                ->where('coupon_id', $rule['coupon_id'])
                ->count();
            if ($myCount >= (int)$rule['per_user_limit']) return false;

            // 查券
            $coupon = Db::name('coupons')->where('id', $rule['coupon_id'])->lock(true)->find();
            if (!$coupon || $coupon['status'] !== 'active') return false;
            $now = date('Y-m-d H:i:s');
            if ($now > $coupon['valid_to']) return false;
            if ((int)$coupon['total_count'] > 0 && (int)$coupon['claimed_count'] >= (int)$coupon['total_count']) {
                return false;
            }

            // 发券
            Db::name('user_coupons')->insert([
                'user_id' => $userId,
                'coupon_id' => $rule['coupon_id'],
                'status' => 'unused',
                'received_at' => $now,
            ]);
            Db::name('coupons')->where('id', $coupon['id'])->update([
                'claimed_count' => (int)$coupon['claimed_count'] + 1,
            ]);
            Db::name('coupon_auto_rules')->where('id', $rule['id'])->update([
                'granted_count' => (int)$rule['granted_count'] + 1,
            ]);
            return true;
        });
    }

    private function validateRule(array $data): void
    {
        foreach (['name', 'trigger_type', 'coupon_id'] as $k) {
            if (empty($data[$k])) throw new \RuntimeException("{$k} 必传");
        }
        if (!in_array($data['trigger_type'], ['user_register', 'order_completed'], true)) {
            throw new \RuntimeException('trigger_type 仅支持 user_register/order_completed');
        }
        $coupon = Db::name('coupons')->where('id', (int)$data['coupon_id'])->find();
        if (!$coupon) throw new \RuntimeException('优惠券不存在');
    }
}
