<?php
declare(strict_types=1);

namespace app\controller;

use GuzzleHttp\Client;
use think\Request;
use think\Response;

class Payment
{
    /**
     * POST /api/v1/payment/wxpay
     * mock：返回伪造的支付参数，前端展示后调 callback/mock 完成
     */
    public function wxpay(Request $request): Response
    {
        $orderNo = (string)$request->param('order_no');
        if (!$orderNo) return json(['code' => 400, 'msg' => 'order_no 必传', 'data' => null]);
        return json([
            'code' => 0, 'msg' => 'ok',
            'data' => [
                'order_no' => $orderNo,
                'prepay_id' => 'wx_prepay_' . uniqid(),
                'mock' => true,
                'note' => '调用 /payment/callback/mock { order_no } 即可触发支付成功',
            ],
        ]);
    }

    /**
     * POST /api/v1/payment/callback/mock
     * 小程序"已支付"按钮触发；转发到 OMS /payment/callback
     */
    public function callbackMock(Request $request): Response
    {
        $orderNo = (string)$request->param('order_no');
        if (!$orderNo) return json(['code' => 400, 'msg' => 'order_no 必传', 'data' => null]);

        try {
            $omsUrl = env('OMS_BACKEND_URL', 'http://oms-backend');
            $client = new Client(['timeout' => 5.0]);
            $traceId = (string)$request->header('X-Trace-Id', '') ?: (string)($_SERVER['HTTP_X_TRACE_ID'] ?? '');
            $resp = $client->post($omsUrl . '/api/v1/payment/callback', [
                'json' => ['order_no' => $orderNo, 'source' => 'mock'],
                'headers' => ['X-Trace-Id' => $traceId],
            ]);
            $body = json_decode((string)$resp->getBody(), true);
            return json($body);
        } catch (\Throwable $e) {
            return json(['code' => 504, 'msg' => 'OMS 不可用: ' . $e->getMessage(), 'data' => null]);
        }
    }
}
