<?php
declare(strict_types=1);

namespace app\controller;

use GuzzleHttp\Client;
use think\facade\Db;
use think\Request;
use think\Response;

/**
 * shop-backend Order：BFF 代理到 OMS
 *   - submit：从购物车选中项构造 items + 用户默认地址 + 转发 OMS
 *   - 其余接口：透传
 */
class Order
{
    /**
     * TP8 在某些场景下 $request->header('Custom-Header') 读不到 nginx 透传的自定义头。
     * 统一从 $_SERVER 兜底取。
     */
    private function getHeader(Request $request, string $name): string
    {
        $val = (string)$request->header($name, '');
        if ($val !== '') return $val;
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return (string)($_SERVER[$key] ?? '');
    }

    public function submit(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $idem = $this->getHeader($request, 'Idempotency-Key');
        $traceId = $this->getHeader($request, 'X-Trace-Id');
        if (!$idem) return $this->err(400, 'Idempotency-Key 必传');

        // iter-20: 优先收 request body 的 address（从地址簿选），其次回落 users.last_address_snapshot
        $address = $request->param('address');
        if (!is_array($address) || empty($address)) {
            $user = Db::name('users')->where('id', $uid)->find();
            if (!$user) return $this->err(401, '用户不存在');
            $address = json_decode($user['last_address_snapshot'] ?? '[]', true);
        }
        if (!$address || !is_array($address)) return $this->err(400, '请先设置收货地址');

        // 选中购物车项
        $cartItems = Db::name('cart')
            ->where('user_id', $uid)
            ->where('selected', 1)
            ->select()->toArray();
        if (!$cartItems) return $this->err(400, '请先勾选商品');

        $items = array_map(
            fn($r) => ['sku_code' => $r['sku_code'], 'qty' => (int)$r['qty']],
            $cartItems
        );

        try {
            $payload = [
                'user_id' => $uid,
                'items' => $items,
                'address' => $address,
                'remark' => $request->param('remark', ''),
            ];
            // iter-27 Q19-03: ids 数组优先
            $ucIds = $request->param('user_coupon_ids');
            if (is_array($ucIds) && $ucIds) {
                $payload['user_coupon_ids'] = array_values(array_filter(array_map('intval', $ucIds)));
            } else {
                $ucId = (int)$request->param('user_coupon_id', 0);
                if ($ucId > 0) $payload['user_coupon_id'] = $ucId;
            }
            $body = $this->post('/api/v1/order/create', $payload, $idem, $traceId);

            // 下单成功：清除已下单的购物车项
            if (($body['code'] ?? -1) === 0) {
                $cartIds = array_column($cartItems, 'id');
                Db::name('cart')->whereIn('id', $cartIds)->delete();
            }
            return json($body);
        } catch (\Throwable $e) {
            return $this->err(504, 'OMS 不可用: ' . $e->getMessage());
        }
    }

    public function list(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $status = $request->param('status');
        $page = (int)$request->param('page', 1);
        $size = (int)$request->param('size', 20);
        try {
            $body = $this->get('/api/v1/order/list', [
                'user_id' => $uid, 'status' => $status, 'page' => $page, 'size' => $size,
            ], $this->getHeader($request, 'X-Trace-Id'));
            return json($body);
        } catch (\Throwable $e) {
            return $this->err(504, $e->getMessage());
        }
    }

    public function detail(Request $request, string $orderNo): Response
    {
        try {
            $body = $this->get('/api/v1/order/' . $orderNo, [], $this->getHeader($request, 'X-Trace-Id'));
            return json($body);
        } catch (\Throwable $e) {
            return $this->err(504, $e->getMessage());
        }
    }

    public function cancel(Request $request, string $orderNo): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $idem = $this->getHeader($request, 'Idempotency-Key') ?: uniqid('idem-cancel-', true);
        try {
            $body = $this->post('/api/v1/order/' . $orderNo . '/cancel', [
                'user_id' => $uid,
                'reason' => $request->param('reason', '用户取消'),
            ], $idem, $this->getHeader($request, 'X-Trace-Id'));
            return json($body);
        } catch (\Throwable $e) {
            return $this->err(504, $e->getMessage());
        }
    }

    public function confirm(Request $request, string $orderNo): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $idem = $this->getHeader($request, 'Idempotency-Key') ?: uniqid('idem-confirm-', true);
        try {
            $body = $this->post('/api/v1/order/' . $orderNo . '/confirm', [
                'user_id' => $uid,
            ], $idem, $this->getHeader($request, 'X-Trace-Id'));
            return json($body);
        } catch (\Throwable $e) {
            return $this->err(504, $e->getMessage());
        }
    }

    private function get(string $path, array $query, string $traceId): array
    {
        $omsUrl = env('OMS_BACKEND_URL', 'http://oms-backend');
        $client = new Client(['timeout' => 5.0]);
        $resp = $client->get($omsUrl . $path, [
            'query' => array_filter($query, fn($v) => $v !== null && $v !== ''),
            'headers' => ['X-Trace-Id' => $traceId],
        ]);
        return json_decode((string)$resp->getBody(), true) ?: ['code' => 500, 'msg' => 'invalid OMS response', 'data' => null];
    }

    private function post(string $path, array $body, string $idem, string $traceId): array
    {
        $omsUrl = env('OMS_BACKEND_URL', 'http://oms-backend');
        $client = new Client(['timeout' => 5.0]);
        $resp = $client->post($omsUrl . $path, [
            'json' => $body,
            'headers' => [
                'Idempotency-Key' => $idem,
                'X-Trace-Id' => $traceId,
            ],
        ]);
        return json_decode((string)$resp->getBody(), true) ?: ['code' => 500, 'msg' => 'invalid OMS response', 'data' => null];
    }

    private function err(int $code, string $msg): Response
    {
        return json(['code' => $code, 'msg' => $msg, 'data' => null]);
    }
}
