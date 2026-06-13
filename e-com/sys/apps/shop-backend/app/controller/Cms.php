<?php
declare(strict_types=1);

namespace app\controller;

use GuzzleHttp\Client;
use think\Request;
use think\Response;

/**
 * 内容运营 BFF（iter-40 BIZ-09-1）
 *   /banner/list?position=  → OMS
 *   /featured/list?position= → OMS
 */
class Cms
{
    public function banner(Request $request): Response
    {
        return $this->forward('/api/v1/banner/list', $request->only(['position']), $request);
    }

    public function featured(Request $request): Response
    {
        return $this->forward('/api/v1/featured/list', $request->only(['position', 'limit']), $request);
    }

    public function topicList(Request $request): Response
    {
        return $this->forward('/api/v1/topic/list', $request->only(['limit']), $request);
    }

    public function topicDetail(Request $request, string $code): Response
    {
        return $this->forward('/api/v1/topic/' . $code, [], $request);
    }

    private function forward(string $path, array $query, Request $request): Response
    {
        $traceId = (string)$request->header('X-Trace-Id', '');
        $omsUrl = env('OMS_BACKEND_URL', 'http://oms-backend');
        try {
            $client = new Client(['timeout' => 3.0]);
            $resp = $client->get($omsUrl . $path, [
                'query' => array_filter($query, fn($v) => $v !== null && $v !== ''),
                'headers' => ['X-Trace-Id' => $traceId],
            ]);
            $body = json_decode((string)$resp->getBody(), true);
            return json($body ?: ['code' => 500, 'msg' => 'invalid OMS response', 'data' => null]);
        } catch (\Throwable $e) {
            return json(['code' => 504, 'msg' => $e->getMessage(), 'data' => null]);
        }
    }
}
