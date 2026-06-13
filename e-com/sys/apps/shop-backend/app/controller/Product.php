<?php
declare(strict_types=1);

namespace app\controller;

use app\service\ReviewService;
use GuzzleHttp\Client;
use think\Request;
use think\Response;

/**
 * 商城 → PIM/OMS 商品代理（BFF）
 */
class Product
{
    public function list(Request $request): Response
    {
        $page = (int) $request->param('page', 1);
        $size = (int) $request->param('size', 20);

        $pimUrl = env('PIM_BACKEND_URL', 'http://pim-backend');
        $omsUrl = env('OMS_BACKEND_URL', 'http://oms-backend');
        $traceId = $request->header('X-Trace-Id', uniqid('trace-', true));

        try {
            $client = new Client(['timeout' => 3.0]);
            $resp = $client->get($pimUrl . '/api/v1/product/list', [
                'query' => ['page' => $page, 'size' => $size],
                'headers' => ['X-Trace-Id' => $traceId, 'Accept' => 'application/json'],
            ]);
            $body = json_decode((string) $resp->getBody(), true);
            $data = $body['data'] ?? ['list' => []];

            // 聚合 OMS 库存（取每条 SPU 的默认 SKU）
            $skuCodes = [];
            foreach ($data['list'] ?? [] as $spu) {
                if (!empty($spu['default_sku']['sku_code'])) {
                    $skuCodes[] = $spu['default_sku']['sku_code'];
                }
            }
            $invMap = $this->fetchInventory($omsUrl, $skuCodes, $traceId);
            foreach ($data['list'] ?? [] as &$spu) {
                $sc = $spu['default_sku']['sku_code'] ?? '';
                $spu['available'] = (int)($invMap[$sc]['available'] ?? 0);
            }

            return json([
                'code' => $body['code'] ?? 0, 'msg' => $body['msg'] ?? 'ok',
                'data' => $data,
                'source' => 'shop-backend → pim-backend + oms-backend',
            ]);
        } catch (\Throwable $e) {
            return json(['code' => 504, 'msg' => '上游服务不可用: ' . $e->getMessage(), 'data' => null], 504);
        }
    }

    /**
     * GET /api/v1/sku/by-spu?spu_id=N
     * iter-57 Q34-02 — 列同 SPU 下所有 SKU（换货下拉用）
     */
    public function skusBySpu(Request $request): Response
    {
        $spuId = (int)$request->param('spu_id', 0);
        if (!$spuId) return json(['code' => 400, 'msg' => 'spu_id 必填', 'data' => null]);
        $pimUrl = env('PIM_BACKEND_URL', 'http://pim-backend');
        try {
            $client = new \GuzzleHttp\Client(['timeout' => 5]);
            $resp = $client->get($pimUrl . "/api/v1/spu/{$spuId}/skus");
            $body = json_decode($resp->getBody()->getContents(), true);
            return json($body ?: ['code' => 0, 'data' => ['list' => []]]);
        } catch (\Throwable $e) {
            return json(['code' => 503, 'msg' => 'PIM 不可达: ' . $e->getMessage(), 'data' => null]);
        }
    }

    /**
     * GET /api/v1/product/:sku
     */
    public function detail(Request $request, string $sku): Response
    {
        $pimUrl = env('PIM_BACKEND_URL', 'http://pim-backend');
        $omsUrl = env('OMS_BACKEND_URL', 'http://oms-backend');
        $traceId = $request->header('X-Trace-Id', uniqid('trace-', true));

        try {
            $client = new Client(['timeout' => 3.0]);
            $skuResp = $client->get($pimUrl . '/api/v1/sku/' . $sku, [
                'headers' => ['X-Trace-Id' => $traceId],
            ]);
            $skuBody = json_decode((string)$skuResp->getBody(), true);
            if (($skuBody['code'] ?? 0) !== 0) {
                return json($skuBody);
            }
            $skuData = $skuBody['data'];

            // SPU 详情（含富文本）
            $spuResp = $client->get($pimUrl . '/api/v1/product/' . $sku, [
                'headers' => ['X-Trace-Id' => $traceId],
            ]);
            $spuBody = json_decode((string)$spuResp->getBody(), true);
            $spuData = $spuBody['data']['spu'] ?? null;
            if ($spuData) {
                foreach (['main_images', 'selling_points', 'attrs'] as $k) {
                    if (isset($spuData[$k]) && is_string($spuData[$k])) {
                        $spuData[$k] = json_decode($spuData[$k], true);
                    }
                }
            }

            $invMap = $this->fetchInventory($omsUrl, [$sku], $traceId);
            $available = (int)($invMap[$sku]['available'] ?? 0);

            // iter-20 评价聚合（前 3 条 + count + avg）
            $reviewPreview = ['count' => 0, 'avg_rating' => 0.0, 'list' => []];
            if (!empty($spuData['id'])) {
                try {
                    $reviewPreview = (new ReviewService())->preview((int)$spuData['id'], 3);
                } catch (\Throwable) { /* 评价系统失败不阻塞详情 */ }
            }

            return json([
                'code' => 0, 'msg' => 'ok',
                'data' => [
                    'sku' => $skuData,
                    'spu' => $spuData,
                    'available' => $available,
                    'review_count' => $reviewPreview['count'],
                    'rating_avg' => $reviewPreview['avg_rating'],
                    'reviews' => $reviewPreview['list'],
                ],
            ]);
        } catch (\Throwable $e) {
            return json(['code' => 504, 'msg' => '上游服务不可用: ' . $e->getMessage(), 'data' => null], 504);
        }
    }

    private function fetchInventory(string $omsUrl, array $skus, string $traceId): array
    {
        if (!$skus) return [];
        try {
            $client = new Client(['timeout' => 2.0]);
            $resp = $client->post($omsUrl . '/api/v1/inventory/batch', [
                'json' => ['sku_codes' => $skus],
                'headers' => ['X-Trace-Id' => $traceId],
            ]);
            $body = json_decode((string)$resp->getBody(), true);
            return $body['data'] ?? [];
        } catch (\Throwable) {
            return [];
        }
    }
}
