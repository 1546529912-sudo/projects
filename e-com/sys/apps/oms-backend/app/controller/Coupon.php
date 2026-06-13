<?php
declare(strict_types=1);

namespace app\controller;

use app\service\CouponService;
use app\service\AuditService;
use think\Request;
use think\Response;

/**
 * 后台优惠券管理（iter-19）
 *   路由层 middleware：super_admin + sales_ops
 */
class Coupon
{
    private CouponService $svc;
    public function __construct() { $this->svc = new CouponService(); }

    public function list(Request $request): Response
    {
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(100, (int)$request->param('size', 20)));
        $status = (string)$request->param('status', '');
        return $this->ok($this->svc->adminList($page, $size, $status));
    }

    public function create(Request $request): Response
    {
        $data = [
            'name' => trim((string)$request->param('name')),
            'type' => (string)$request->param('type'),
            'scope_type' => (string)$request->param('scope_type', 'all'),
            'scope_value' => $request->param('scope_value', []),
            'discount_value' => $request->param('discount_value'),
            'min_amount' => $request->param('min_amount', 0),
            'max_discount' => $request->param('max_discount', null),
            'total_count' => (int)$request->param('total_count', 0),
            'per_user_limit' => (int)$request->param('per_user_limit', 1),
            'valid_from' => (string)$request->param('valid_from'),
            'valid_to' => (string)$request->param('valid_to'),
        ];
        try {
            $row = $this->svc->create($data);
            $this->audit($request, 'coupon.create', (string)$row['id'], null, $row);
            return $this->ok($row);
        } catch (\Throwable $e) {
            return $this->err(400, $e->getMessage());
        }
    }

    public function update(Request $request, int $id): Response
    {
        $data = [];
        foreach (['name', 'valid_to', 'total_count', 'per_user_limit', 'max_discount'] as $k) {
            if ($request->has($k)) $data[$k] = $request->param($k);
        }
        try {
            $before = \think\facade\Db::name('coupons')->where('id', $id)->find();
            $after = $this->svc->update($id, $data);
            $this->audit($request, 'coupon.update', (string)$id, $before, $after);
            return $this->ok($after);
        } catch (\Throwable $e) {
            return $this->err(400, $e->getMessage());
        }
    }

    public function disable(Request $request, int $id): Response
    {
        try {
            $before = \think\facade\Db::name('coupons')->where('id', $id)->find();
            $after = $this->svc->disable($id);
            $this->audit($request, 'coupon.disable', (string)$id, $before, $after);
            return $this->ok($after);
        } catch (\Throwable $e) {
            return $this->err(400, $e->getMessage());
        }
    }

    private function audit(Request $request, string $action, string $targetId, ?array $before, ?array $after): void
    {
        $op = $request->admin['username'] ?? 'admin';
        AuditService::log($action, 'coupon', $targetId, $before, $after, null, $op);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
