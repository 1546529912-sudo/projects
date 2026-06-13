<?php
declare(strict_types=1);

namespace app\controller;

use app\service\CouponAutoRuleService;
use think\Request;
use think\Response;

/**
 * 优惠券自动规则管理（iter-27 Q19-02）
 *   - 路由层 super_admin + sales_ops
 */
class CouponRule
{
    private CouponAutoRuleService $svc;
    public function __construct() { $this->svc = new CouponAutoRuleService(); }

    public function list(Request $request): Response
    {
        return $this->ok(['list' => $this->svc->listRules()]);
    }

    public function create(Request $request): Response
    {
        $data = $request->only(['name', 'trigger_type', 'coupon_id', 'per_user_limit', 'enabled', 'remark']);
        $data['created_by'] = $request->admin['username'] ?? 'admin';
        try { return $this->ok($this->svc->createRule($data)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function update(Request $request, int $id): Response
    {
        $data = $request->only(['name', 'enabled', 'per_user_limit', 'remark']);
        try { return $this->ok($this->svc->updateRule($id, $data)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function delete(Request $request, int $id): Response
    {
        $this->svc->deleteRule($id);
        return $this->ok(['id' => $id]);
    }

    /**
     * 内部接口：shop-backend 调用触发发券（无 admin 鉴权，infra 层）
     *   POST /api/v1/coupon/auto-grant body: { trigger_type, user_id }
     */
    public function trigger(Request $request): Response
    {
        $triggerType = (string)$request->param('trigger_type');
        $userId = (int)$request->param('user_id', 0);
        if (!$triggerType || !$userId) return $this->err(400, 'trigger_type + user_id 必传');
        $cnt = $this->svc->grantForTrigger($triggerType, $userId);
        return $this->ok(['granted_count' => $cnt]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
