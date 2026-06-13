<?php
declare(strict_types=1);

namespace app\controller;

use GuzzleHttp\Client;
use think\Request;
use think\Response;

/**
 * 用户侧换货 BFF（iter-34 BIZ-07）：透传到 OMS /api/v1/exchange*，附 user_id
 */
class Exchange
{
    private function getHeader(Request $request, string $name): string
    {
        return (string)$request->header($name, '') ?: (string)($_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $name))] ?? '');
    }

    public function apply(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $idem = $this->getHeader($request, 'Idempotency-Key') ?: uniqid('idem-exchange-', true);
        try {
            $body = $this->post('/api/v1/exchange', [
                'user_id' => $uid,
                'order_no' => (string)$request->param('order_no'),
                'items' => $request->param('items', []),
                'reason' => (string)$request->param('reason', ''),
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
            $body = $this->get('/api/v1/exchange/list', [
                'user_id' => $uid,
                'page' => (int)$request->param('page', 1),
                'size' => (int)$request->param('size', 20),
            ], $this->getHeader($request, 'X-Trace-Id'));
            return json($body);
        } catch (\Throwable $e) {
            return $this->err(504, $e->getMessage());
        }
    }

    public function detail(Request $request, string $no): Response
    {
        try {
            $body = $this->get('/api/v1/exchange/' . $no, [], $this->getHeader($request, 'X-Trace-Id'));
            return json($body);
        } catch (\Throwable $e) {
            return $this->err(504, $e->getMessage());
        }
    }

    public function cancel(Request $request, string $no): Response
    {
        $uid = (int)($request->user_id ?? 0);
        try {
            $body = $this->post('/api/v1/exchange/' . $no . '/cancel',
                ['user_id' => $uid],
                uniqid('idem-exc-cancel-', true),
                $this->getHeader($request, 'X-Trace-Id'));
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
