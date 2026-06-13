<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AuditService;
use app\service\SkuChangedPublisher;
use think\Request;
use think\Response;
use think\facade\Db;

class Sku
{
    private SkuChangedPublisher $publisher;

    public function __construct()
    {
        $this->publisher = new SkuChangedPublisher();
    }

    /**
     * GET /api/v1/sku/:code
     * 返回 SKU 详情 + SPU 名/主图
     */
    public function detail(string $code): Response
    {
        $sku = Db::name('skus')
            ->where('sku_code', $code)
            ->whereNull('deleted_at')
            ->find();
        if (!$sku) {
            return json(['code' => 404, 'msg' => 'SKU 不存在', 'data' => null]);
        }
        $spu = Db::name('spus')->where('id', $sku['spu_id'])->find();
        $row = $this->formatSku($sku, $spu);
        return json(['code' => 0, 'msg' => 'ok', 'data' => $row]);
    }

    /**
     * POST /api/v1/sku/batch
     * body: { "sku_codes": ["SPU001-001", ...] }
     */
    public function batch(Request $request): Response
    {
        $codes = $request->param('sku_codes', []);
        if (!is_array($codes) || !$codes) {
            return json(['code' => 0, 'msg' => 'ok', 'data' => []]);
        }
        $skus = Db::name('skus')
            ->whereIn('sku_code', $codes)
            ->whereNull('deleted_at')
            ->select()->toArray();
        $spuIds = array_unique(array_column($skus, 'spu_id'));
        $spus = $spuIds ? Db::name('spus')->whereIn('id', $spuIds)->select()->toArray() : [];
        $spuMap = array_column($spus, null, 'id');

        $out = [];
        foreach ($skus as $sku) {
            $out[] = $this->formatSku($sku, $spuMap[$sku['spu_id']] ?? null);
        }
        return json(['code' => 0, 'msg' => 'ok', 'data' => $out]);
    }

    /**
     * GET /api/v1/spu/:id/skus  iter-57 Q34-02 公开列同 SPU 下 SKU
     */
    public function listBySpu(Request $request, int $id): Response
    {
        $rows = Db::name('skus')->where('spu_id', $id)
            ->whereNull('deleted_at')->where('status', 'enabled')
            ->field('sku_code, sales_attrs, price, status')
            ->order('id', 'asc')->select()->toArray();
        foreach ($rows as &$r) {
            $r['price_yuan'] = number_format(((int)$r['price']) / 100, 2, '.', '');
            $r['sales_attrs'] = $r['sales_attrs'] ? (json_decode($r['sales_attrs'], true) ?: []) : [];
        }
        return $this->ok(['list' => $rows]);
    }

    /**
     * POST /api/v1/admin/sku  新增 SKU
     */
    public function create(Request $request): Response
    {
        $code = trim((string)$request->param('sku_code'));
        $spuId = (int)$request->param('spu_id');
        $salesAttrs = $request->param('sales_attrs', []);
        $price = (int)$request->param('price', 0);
        $weight = $request->param('weight');

        if (!$code) return $this->err(400, 'sku_code 必传');
        if (!$spuId) return $this->err(400, 'spu_id 必传');
        if ($price <= 0) return $this->err(400, 'price 必须大于 0');
        $spu = Db::name('spus')->where('id', $spuId)->whereNull('deleted_at')->find();
        if (!$spu) return $this->err(400, 'spu_id 不存在');
        // iter-36 BIZ-08-2: 店铺隔离 — SKU 必须建在自己店的 SPU 下
        $storeIds = $request->store_ids ?? null;
        if ($storeIds !== null && !in_array((int)$spu['store_id'], $storeIds, true)) {
            return $this->err(403, '无权在此店铺的 SPU 下建 SKU');
        }
        if (Db::name('skus')->where('sku_code', $code)->whereNull('deleted_at')->find()) {
            return $this->err(409, 'sku_code 已存在: ' . $code);
        }

        $id = Db::name('skus')->insertGetId([
            'sku_code' => $code, 'spu_id' => $spuId,
            'store_id' => (int)$spu['store_id'], // 与 SPU 一致
            'sales_attrs' => json_encode(is_array($salesAttrs) ? $salesAttrs : [], JSON_UNESCAPED_UNICODE),
            'price' => $price, 'status' => 'enabled',
            'weight' => $weight !== null && $weight !== '' ? (float)$weight : null,
        ]);
        AuditService::log('sku.create', 'sku', $code, null, [
            'spu_id' => $spuId, 'price' => $price, 'status' => 'enabled',
        ]);
        $this->publisher->publishOne($code);
        return $this->ok(Db::name('skus')->where('id', $id)->find());
    }

    /**
     * PUT /api/v1/admin/sku/:code 编辑 SKU
     */
    public function update(Request $request, string $code): Response
    {
        $sku = Db::name('skus')->where('sku_code', $code)->whereNull('deleted_at')->find();
        if (!$sku) return $this->err(404, 'SKU 不存在');
        // iter-36 BIZ-08-2: 店铺隔离
        $storeIds = $request->store_ids ?? null;
        if ($storeIds !== null && !in_array((int)$sku['store_id'], $storeIds, true)) {
            return $this->err(403, '无权访问此店铺数据');
        }

        $update = [];
        if ($request->has('price')) {
            $price = (int)$request->param('price');
            if ($price <= 0) return $this->err(400, 'price 必须大于 0');
            $update['price'] = $price;
        }
        if ($request->has('status')) {
            $status = (string)$request->param('status');
            if (!in_array($status, ['enabled', 'disabled'], true)) {
                return $this->err(400, 'status 只能 enabled/disabled');
            }
            $update['status'] = $status;
        }
        if ($request->has('weight')) {
            $w = $request->param('weight');
            $update['weight'] = $w !== null && $w !== '' ? (float)$w : null;
        }
        if ($request->has('sales_attrs')) {
            $sa = $request->param('sales_attrs');
            $update['sales_attrs'] = json_encode(is_array($sa) ? $sa : [], JSON_UNESCAPED_UNICODE);
        }
        if (!$update) return $this->err(400, '无可更新字段');

        Db::name('skus')->where('sku_code', $code)->update($update);
        AuditService::log('sku.update', 'sku', $code,
            array_intersect_key($sku, array_flip(['price', 'status', 'weight', 'sales_attrs'])),
            $update);
        $this->publisher->publishOne($code);
        return $this->ok(Db::name('skus')->where('sku_code', $code)->find());
    }

    /**
     * DELETE /api/v1/admin/sku/:code 软删
     */
    public function softDelete(Request $request, string $code): Response
    {
        $sku = Db::name('skus')->where('sku_code', $code)->whereNull('deleted_at')->find();
        if (!$sku) return $this->err(404, 'SKU 不存在');
        $storeIds = $request->store_ids ?? null;
        if ($storeIds !== null && !in_array((int)$sku['store_id'], $storeIds, true)) {
            return $this->err(403, '无权访问此店铺数据');
        }
        Db::name('skus')->where('sku_code', $code)->update(['deleted_at' => date('Y-m-d H:i:s')]);
        AuditService::log('sku.delete', 'sku', $code, $sku, null);
        $this->publisher->publishOne($code);
        return $this->ok(['sku_code' => $code]);
    }

    private function formatSku(array $sku, ?array $spu): array
    {
        $images = [];
        if ($spu && !empty($spu['main_images'])) {
            $images = is_string($spu['main_images']) ? json_decode($spu['main_images'], true) : $spu['main_images'];
        }
        $salesAttrs = is_string($sku['sales_attrs'] ?? null) ? json_decode($sku['sales_attrs'], true) : ($sku['sales_attrs'] ?? null);
        return [
            'sku_code' => $sku['sku_code'],
            'spu_id' => (int)$sku['spu_id'],
            'spu_name' => $spu['name'] ?? '',
            'main_image' => $images[0] ?? '',
            'price' => (int)$sku['price'],
            'price_yuan' => number_format($sku['price'] / 100, 2, '.', ''),
            'status' => $sku['status'],
            'weight' => $sku['weight'] ?? null,
            'sales_attrs' => $salesAttrs,
        ];
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
