<?php
declare(strict_types=1);

namespace app\controller;

use GuzzleHttp\Client;
use think\Request;
use think\Response;

/**
 * 公开店铺信息 BFF（iter-39 BIZ-08-5）
 *   小程序拉店铺主页用，无需鉴权
 *   GET /api/v1/store/:code → 透传 OMS
 */
class Store
{
    public function publicDetail(Request $request, string $code): Response
    {
        $traceId = (string)$request->header('X-Trace-Id', '');
        $omsUrl = env('OMS_BACKEND_URL', 'http://oms-backend');
        try {
            $client = new Client(['timeout' => 3.0]);
            $resp = $client->get($omsUrl . '/api/v1/store/' . $code, [
                'headers' => ['X-Trace-Id' => $traceId],
            ]);
            $body = json_decode((string)$resp->getBody(), true);
            return json($body ?: ['code' => 500, 'msg' => 'invalid OMS response', 'data' => null]);
        } catch (\Throwable $e) {
            return json(['code' => 504, 'msg' => $e->getMessage(), 'data' => null]);
        }
    }
}
