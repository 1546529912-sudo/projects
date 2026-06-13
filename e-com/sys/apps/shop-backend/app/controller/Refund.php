<?php
declare(strict_types=1);

namespace app\controller;

use GuzzleHttp\Client;
use think\Request;
use think\Response;

/**
 * 用户侧退款 BFF：透传到 OMS /api/v1/refund，附 user_id（鉴权后从 token 解出）
 */
class Refund
{
    private function getHeader(Request $request, string $name): string
    {
        return (string)$request->header($name, '') ?: (string)($_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $name))] ?? '');
    }

    public function apply(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $idem = $this->getHeader($request, 'Idempotency-Key') ?: uniqid('idem-refund-', true);
        try {
            $body = $this->post('/api/v1/refund', [
                'user_id' => $uid,
                'order_no' => (string)$request->param('order_no'),
                'type' => (string)$request->param('type', 'refund_only'),
                'items' => $request->param('items', []),
                'reason' => (string)$request->param('reason', ''),
                'amount' => (int)$request->param('amount', 0),
                'evidence_images' => $request->param('evidence_images', []),
            ], $idem, $this->getHeader($request, 'X-Trace-Id'));
            return json($body);
        } catch (\Throwable $e) {
            return $this->err(504, $e->getMessage());
        }
    }

    public function list(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        try {
            $body = $this->get('/api/v1/refund/list', [
                'user_id' => $uid,
                'page' => (int)$request->param('page', 1),
                'size' => (int)$request->param('size', 20),
            ], $this->getHeader($request, 'X-Trace-Id'));
            return json($body);
        } catch (\Throwable $e) {
            return $this->err(504, $e->getMessage());
        }
    }

    public function detail(Request $request, string $refundNo): Response
    {
        try {
            $body = $this->get('/api/v1/refund/' . $refundNo, [], $this->getHeader($request, 'X-Trace-Id'));
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
