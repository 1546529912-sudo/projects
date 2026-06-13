<?php
declare(strict_types=1);

namespace app\controller;

use app\service\UserCouponService;
use think\Request;
use think\Response;

/**
 * shop 优惠券（iter-19）
 *   - GET  /coupon/available   领券中心
 *   - POST /coupon/:id/claim   领券
 *   - GET  /coupon/my          我的优惠券
 *   - POST /coupon/check       结算预检
 */
class Coupon
{
    private UserCouponService $svc;
    public function __construct() { $this->svc = new UserCouponService(); }

    public function available(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        return $this->ok($this->svc->available($uid));
    }

    public function claim(Request $request, int $id): Response
    {
        $uid = (int)($request->user_id ?? 0);
        try {
            $row = $this->svc->claim($uid, $id);
            return $this->ok($row);
        } catch (\Throwable $e) {
            return $this->err(400, $e->getMessage());
        }
    }

    public function my(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $status = (string)$request->param('status', 'all');
        return $this->ok($this->svc->my($uid, $status));
    }

    public function check(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $userCouponId = (int)$request->param('user_coupon_id', 0);
        $goodsAmount = (int)$request->param('goods_amount', 0);  // 单位:分
        if (!$userCouponId || $goodsAmount <= 0) {
            return $this->err(400, 'user_coupon_id 和 goods_amount 必传');
        }
        try {
            return $this->ok($this->svc->check($uid, $userCouponId, $goodsAmount));
        } catch (\Throwable $e) {
            return $this->err(400, $e->getMessage());
        }
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
