<?php
declare(strict_types=1);

namespace app\controller;

use app\service\OrderService;
use think\Request;
use think\Response;

class Order
{
    public function __construct(private OrderService $service = new OrderService()) {}

    public function create(Request $request): Response
    {
        $idem = (string)$request->header('Idempotency-Key', '')
            ?: (string)($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '');
        $traceId = (string)$request->header('X-Trace-Id', '')
            ?: (string)($_SERVER['HTTP_X_TRACE_ID'] ?? '');
        if (!$idem) return $this->err(400, 'Idempotency-Key 必传');

        try {
            $payload = [
                'user_id' => (int)$request->param('user_id'),
                'items' => $request->param('items', []),
                'address' => $request->param('address', []),
                'remark' => $request->param('remark'),
                'user_coupon_id' => (int)$request->param('user_coupon_id', 0),
            ];
            // iter-27 Q19-03: 多券 ids 数组
            $ucIds = $request->param('user_coupon_ids');
            if (is_array($ucIds) && $ucIds) $payload['user_coupon_ids'] = $ucIds;
            $data = $this->service->create($payload, $idem, $traceId);
            return $this->ok($data);
        } catch (\InvalidArgumentException $e) {
            return $this->err(400, $e->getMessage());
        } catch (\Throwable $e) {
            return $this->err(500, $e->getMessage());
        }
    }

    public function detail(string $orderNo): Response
    {
        try {
            return $this->ok($this->service->detail($orderNo));
        } catch (\Throwable $e) {
            return $this->err(404, $e->getMessage());
        }
    }

    public function list(Request $request): Response
    {
        $userId = (int)$request->param('user_id');
        if (!$userId) return $this->err(400, 'user_id 必传');
        $status = $request->param('status');
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(100, (int)$request->param('size', 20)));
        return $this->ok($this->service->listByUser($userId, $status, $page, $size));
    }

    public function cancel(Request $request, string $orderNo): Response
    {
        $userId = (int)$request->param('user_id');
        $reason = (string)$request->param('reason', '用户取消');
        try {
            return $this->ok($this->service->cancel($orderNo, $userId, $reason));
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
    }

    public function confirm(Request $request, string $orderNo): Response
    {
        $userId = (int)$request->param('user_id');
        try {
            return $this->ok($this->service->confirm($orderNo, $userId));
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
    }

    /**
     * POST /api/v1/order/:no/wms-shipped
     * WMS 出库回传：paid → picking → shipped + 实物库存扣减
     */
    public function wmsShipped(Request $request, string $orderNo): Response
    {
        $expressNo = (string)$request->param('express_no', '');
        $items = $request->param('items', []);
        if (!$expressNo) return $this->err(400, 'express_no 必传');
        if (!is_array($items) || !$items) return $this->err(400, 'items 不能为空');
        try {
            return $this->ok($this->service->markShipped($orderNo, $expressNo, $items));
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
    }

    private function ok(mixed $data): Response
    {
        return json(['code' => 0, 'msg' => 'ok', 'data' => $data]);
    }

    private function err(int $code, string $msg): Response
    {
        return json(['code' => $code, 'msg' => $msg, 'data' => null], $code >= 500 ? 500 : 200);
    }
}
