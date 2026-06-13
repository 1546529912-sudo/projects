<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AuditService;
use app\service\SkuChangedPublisher;
use app\service\SpuStatusLogService;
use think\Request;
use think\Response;
use think\facade\Db;

class Product
{
    private SkuChangedPublisher $publisher;

    public function __construct()
    {
        $this->publisher = new SkuChangedPublisher();
    }

    /**
     * iter-36 BIZ-08-2 辅助：把 store_ids 过滤套到 query 上
     *   - null：跨店访问（平台员工），不过滤
     *   - []：无关联店铺（数据隔离，返回空集）
     *   - [int]：限制到这些 store_id
     */
    private function applyStoreFilter($query, ?array $storeIds): void
    {
        if ($storeIds === null) return;
        if (!$storeIds) { $query->where('1=0'); return; }
        $query->whereIn('store_id', $storeIds);
    }

    /**
     * iter-36 BIZ-08-2 辅助：决定 SPU 创建时的 store_id
     *   - 平台员工（store_ids=null）：用 request.store_id 参数，缺省 1（平台店）
     *   - 单店关联：用关联的 store_id
     *   - 多店关联：必须传 store_id 参数且在关联列表内
     */
    private function resolveCreateStoreId(Request $request, ?array $storeIds): int
    {
        $paramSid = $request->param('store_id');
        if ($storeIds === null) {
            return $paramSid ? (int)$paramSid : 1;
        }
        if (!$storeIds) throw new \RuntimeException('当前账号未关联任何店铺，不可建商品');
        if (count($storeIds) === 1) return $storeIds[0];
        if (!$paramSid) throw new \RuntimeException('当前账号关联多个店铺，请传 store_id 参数');
        $sid = (int)$paramSid;
        if (!in_array($sid, $storeIds, true)) throw new \RuntimeException("store_id={$sid} 不在你关联店铺内");
        return $sid;
    }

    /**
     * iter-36 BIZ-08-2 辅助：店铺范围校验（写操作前），$row 必须含 store_id
     */
    private function assertStoreAccess(array $row, ?array $storeIds): void
    {
        if ($storeIds === null) return; // 跨店
        if (!in_array((int)($row['store_id'] ?? 0), $storeIds, true)) {
            throw new \RuntimeException('无权访问此店铺数据');
        }
    }

    /**
     * 商品列表（SPU + 默认 SKU）
     * GET /api/v1/product/list?page=&size=&category_id=&brand_id=&status=
     */
    public function list(Request $request): Response
    {
        $page = max(1, (int) $request->param('page', 1));
        $size = min(100, max(1, (int) $request->param('size', 20)));
        $categoryId = $request->param('category_id');
        $status = $request->param('status', 'published');

        $query = Db::name('spus')
            ->where('status', $status)
            ->whereNull('deleted_at')
            ->order('id', 'desc');

        if ($categoryId) {
            $query->where('category_id', (int) $categoryId);
        }

        $total = $query->count();
        $list = $query->page($page, $size)->select()->toArray();

        // 简化：每个 SPU 取第一条 SKU 作为默认
        foreach ($list as &$spu) {
            $spu['main_images'] = is_string($spu['main_images']) ? json_decode($spu['main_images'], true) : $spu['main_images'];
            $spu['attrs'] = is_string($spu['attrs'] ?? null) ? json_decode($spu['attrs'], true) : ($spu['attrs'] ?? null);
            $spu['selling_points'] = is_string($spu['selling_points'] ?? null) ? json_decode($spu['selling_points'], true) : ($spu['selling_points'] ?? null);

            $defaultSku = Db::name('skus')
                ->where('spu_id', $spu['id'])
                ->where('status', 'enabled')
                ->whereNull('deleted_at')
                ->order('id', 'asc')
                ->find();
            $spu['default_sku'] = $defaultSku;
        }

        return json([
            'code' => 0,
            'msg'  => 'ok',
            'data' => [
                'page'  => $page,
                'size'  => $size,
                'total' => $total,
                'list'  => $list,
            ],
        ]);
    }

    /**
     * GET /api/v1/product/:sku
     */
    public function detail(string $sku): Response
    {
        $skuRow = Db::name('skus')
            ->where('sku_code', $sku)
            ->whereNull('deleted_at')
            ->find();

        if (!$skuRow) {
            return json(['code' => 404, 'msg' => 'SKU 不存在', 'data' => null], 404);
        }

        $spu = Db::name('spus')->where('id', $skuRow['spu_id'])->find();

        return json([
            'code' => 0,
            'msg'  => 'ok',
            'data' => [
                'sku' => $skuRow,
                'spu' => $spu,
            ],
        ]);
    }

    /**
     * GET /api/v1/admin/spu/list 后台 SPU 列表（含所有状态）
     */
    public function adminList(Request $request): Response
    {
        $page = max(1, (int) $request->param('page', 1));
        $size = min(100, max(1, (int) $request->param('size', 20)));
        $status = (string) $request->param('status', '');
        $categoryId = $request->param('category_id');
        $brandId = $request->param('brand_id');
        $keyword = trim((string) $request->param('keyword', ''));

        $query = Db::name('spus')->whereNull('deleted_at')->order('id', 'desc');
        // iter-36 BIZ-08-2: 店铺过滤（store_owner/store_staff 仅看自己店；super 看全部）
        $this->applyStoreFilter($query, $request->store_ids ?? null);
        // 支持 super_admin 手动按 store_id 筛选
        if ($sid = (int)$request->param('store_id', 0)) $query->where('store_id', $sid);

        if ($status) $query->where('status', $status);
        if ($categoryId) $query->where('category_id', (int)$categoryId);
        if ($brandId) $query->where('brand_id', (int)$brandId);
        if ($keyword) {
            $query->where(function ($q) use ($keyword) {
                $q->whereLike('name', "%{$keyword}%")
                    ->whereOr('code', 'like', "%{$keyword}%");
            });
        }

        $total = (clone $query)->count();
        $list = $query->page($page, $size)->select()->toArray();
        foreach ($list as &$spu) {
            $this->decodeJsonFields($spu);
        }

        // iter-31 Q29-04: 批量回填"可用库存 + 近 30 天销量"
        // 一次查所有当前页 SPU 的 SKU，再各跨库一次聚合，最后按 SPU 累加 — 避免 N+1
        $spuIds = array_column($list, 'id');
        if ($spuIds) {
            $skuRows = Db::name('skus')->whereIn('spu_id', $spuIds)
                ->whereNull('deleted_at')->field('sku_code, spu_id')->select()->toArray();
            $skuToSpu = [];
            $skuCodes = [];
            foreach ($skuRows as $r) {
                $skuToSpu[$r['sku_code']] = (int)$r['spu_id'];
                $skuCodes[] = $r['sku_code'];
            }

            $stockBySpu = []; $salesBySpu = [];
            if ($skuCodes) {
                // WMS 可用库存（跨库容错）
                try {
                    $wmsRows = Db::connect('wms')->name('inventory')
                        ->whereIn('sku_code', $skuCodes)
                        ->where('status', 'normal')
                        ->field('sku_code, SUM(quantity - locked_quantity) AS avail')
                        ->group('sku_code')->select()->toArray();
                    foreach ($wmsRows as $r) {
                        $sid = $skuToSpu[$r['sku_code']] ?? 0;
                        if ($sid) $stockBySpu[$sid] = ($stockBySpu[$sid] ?? 0) + (int)$r['avail'];
                    }
                } catch (\Throwable $e) {
                    error_log('[Product.adminList] WMS 跨库读失败: ' . $e->getMessage());
                }

                // OMS 近 30 天销量
                try {
                    $since = date('Y-m-d', strtotime('-30 days'));
                    $omsRows = Db::connect('oms')->name('order_items')
                        ->alias('oi')
                        ->leftJoin('orders o', 'o.order_no = oi.order_no')
                        ->whereIn('oi.sku_code', $skuCodes)
                        ->where('o.status', 'in', ['paid', 'picking', 'shipped', 'completed'])
                        ->where('o.created_at', '>=', $since)
                        ->field('oi.sku_code, SUM(oi.qty) AS qty')
                        ->group('oi.sku_code')->select()->toArray();
                    foreach ($omsRows as $r) {
                        $sid = $skuToSpu[$r['sku_code']] ?? 0;
                        if ($sid) $salesBySpu[$sid] = ($salesBySpu[$sid] ?? 0) + (int)$r['qty'];
                    }
                } catch (\Throwable $e) {
                    error_log('[Product.adminList] OMS 跨库读失败: ' . $e->getMessage());
                }
            }

            foreach ($list as &$spu) {
                $sid = (int)$spu['id'];
                $spu['stock_avail'] = $stockBySpu[$sid] ?? 0;
                $spu['month_sales_qty'] = $salesBySpu[$sid] ?? 0;
            }
        }

        return $this->ok(['list' => $list, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    /**
     * GET /api/v1/admin/spu/:id SPU 详情含 SKU 列表
     */
    /**
     * POST /api/v1/spu/batch — 批量取 SPU 简略信息（iter-20 收藏列表用）
     */
    public function batchSpus(Request $request): Response
    {
        $ids = $request->param('ids', []);
        if (!is_array($ids) || !$ids) return $this->ok([]);
        $spus = Db::name('spus')->whereIn('id', $ids)->whereNull('deleted_at')->select()->toArray();
        $out = [];
        foreach ($spus as $spu) {
            $imgs = is_string($spu['main_images']) ? json_decode($spu['main_images'], true) : ($spu['main_images'] ?? []);
            $defaultSku = Db::name('skus')
                ->where('spu_id', $spu['id'])
                ->where('status', 'enabled')
                ->whereNull('deleted_at')
                ->order('id', 'asc')
                ->find();
            $out[] = [
                'id' => (int)$spu['id'],
                'name' => $spu['name'],
                'main_image' => $imgs[0] ?? '',
                'price' => $defaultSku ? (int)$defaultSku['price'] : 0,
                'price_yuan' => $defaultSku ? number_format($defaultSku['price'] / 100, 2, '.', '') : '0.00',
                'status' => $spu['status'],
                'default_sku_code' => $defaultSku['sku_code'] ?? null,
            ];
        }
        return $this->ok($out);
    }

    public function spuDetail(Request $request, int $id): Response
    {
        $spu = Db::name('spus')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$spu) return $this->err(404, 'SPU 不存在');
        // iter-36 BIZ-08-2: 店铺隔离 — 非本店 store_owner 看不到
        try { $this->assertStoreAccess($spu, $request->store_ids ?? null); }
        catch (\Throwable $e) { return $this->err(403, $e->getMessage()); }
        $this->decodeJsonFields($spu);
        $skus = Db::name('skus')
            ->where('spu_id', $id)
            ->whereNull('deleted_at')
            ->select()->toArray();
        foreach ($skus as &$s) {
            if (isset($s['sales_attrs']) && is_string($s['sales_attrs'])) {
                $s['sales_attrs'] = json_decode($s['sales_attrs'], true);
            }
        }
        return $this->ok(['spu' => $spu, 'skus' => $skus]);
    }

    /**
     * POST /api/v1/admin/spu
     */
    public function create(Request $request): Response
    {
        $code = trim((string)$request->param('code'));
        $name = trim((string)$request->param('name'));
        $categoryId = (int)$request->param('category_id');
        $brandId = (int)$request->param('brand_id', 0);
        $basePrice = (int)$request->param('base_price', 0);
        $mainImages = $request->param('main_images', []);
        $sellingPoints = $request->param('selling_points', []);
        $attrs = $request->param('attrs', []);
        $detailHtml = (string)$request->param('detail_html', '');

        if (!$code || !$name) return $this->err(400, 'code/name 必传');
        if (!$categoryId) return $this->err(400, 'category_id 必传');
        if (Db::name('spus')->where('code', $code)->whereNull('deleted_at')->find()) {
            return $this->err(409, 'code 已存在: ' . $code);
        }
        if (!is_array($mainImages) || !$mainImages) return $this->err(400, 'main_images 至少 1 张');

        // iter-36 BIZ-08-2: 确定 store_id
        try { $storeId = $this->resolveCreateStoreId($request, $request->store_ids ?? null); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }

        $id = Db::name('spus')->insertGetId([
            'store_id' => $storeId,
            'code' => $code, 'name' => $name,
            'category_id' => $categoryId, 'brand_id' => $brandId ?: null,
            'base_price' => $basePrice,
            'main_images' => json_encode($mainImages, JSON_UNESCAPED_UNICODE),
            'selling_points' => json_encode(is_array($sellingPoints) ? $sellingPoints : [], JSON_UNESCAPED_UNICODE),
            'attrs' => json_encode(is_array($attrs) ? $attrs : [], JSON_UNESCAPED_UNICODE),
            'detail_html' => $detailHtml ?: null,
            'status' => 'draft',
        ]);
        AuditService::log('spu.create', 'spu', (string)$id, null, [
            'code' => $code, 'name' => $name, 'category_id' => $categoryId, 'base_price' => $basePrice,
        ]);
        SpuStatusLogService::log($id, null, 'draft', 'create');
        // iter-71 Q30-01 spu_attributes 反范式同步
        $this->syncSpuAttributes($id, is_array($attrs) ? $attrs : []);
        return $this->spuDetail($request, $id);
    }

    /** iter-71 Q30-01：把 spus.attrs JSON 拍平到 spu_attributes 强索引表 */
    private function syncSpuAttributes(int $spuId, array $attrs): void
    {
        try {
            Db::name('spu_attributes')->where('spu_id', $spuId)->delete();
            $rows = [];
            foreach ($attrs as $k => $v) {
                if (is_scalar($v)) $rows[] = ['spu_id' => $spuId, 'attr_key' => (string)$k, 'attr_value' => (string)$v];
            }
            if ($rows) Db::name('spu_attributes')->insertAll($rows);
        } catch (\Throwable $e) { /* 表未建时跳 */ }
    }

    /**
     * PUT /api/v1/admin/spu/:id
     */
    public function update(Request $request, int $id): Response
    {
        $spu = Db::name('spus')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$spu) return $this->err(404, 'SPU 不存在');
        // iter-36 BIZ-08-2: 店铺隔离
        try { $this->assertStoreAccess($spu, $request->store_ids ?? null); }
        catch (\Throwable $e) { return $this->err(403, $e->getMessage()); }

        $update = [];
        if ($request->has('name')) $update['name'] = trim((string)$request->param('name'));
        if ($request->has('category_id')) $update['category_id'] = (int)$request->param('category_id');
        if ($request->has('brand_id')) {
            $brandId = (int)$request->param('brand_id');
            $update['brand_id'] = $brandId ?: null;
        }
        if ($request->has('base_price')) $update['base_price'] = (int)$request->param('base_price');
        if ($request->has('main_images')) {
            $imgs = $request->param('main_images');
            if (!is_array($imgs) || !$imgs) return $this->err(400, 'main_images 至少 1 张');
            $update['main_images'] = json_encode($imgs, JSON_UNESCAPED_UNICODE);
        }
        if ($request->has('selling_points')) {
            $sp = $request->param('selling_points');
            $update['selling_points'] = json_encode(is_array($sp) ? $sp : [], JSON_UNESCAPED_UNICODE);
        }
        $attrsChanged = false; $newAttrs = [];
        if ($request->has('attrs')) {
            $a = $request->param('attrs');
            $newAttrs = is_array($a) ? $a : [];
            $update['attrs'] = json_encode($newAttrs, JSON_UNESCAPED_UNICODE);
            $attrsChanged = true;
        }
        if ($request->has('detail_html')) {
            $update['detail_html'] = (string)$request->param('detail_html') ?: null;
        }
        if (!$update) return $this->err(400, '无可更新字段');

        Db::name('spus')->where('id', $id)->update($update);
        AuditService::log('spu.update', 'spu', (string)$id,
            array_intersect_key($spu, array_flip(['name', 'category_id', 'brand_id', 'base_price'])),
            array_intersect_key($update, array_flip(['name', 'category_id', 'brand_id', 'base_price'])));
        // iter-71 Q30-01 同步反范式
        if ($attrsChanged) $this->syncSpuAttributes($id, $newAttrs);
        $this->publisher->publishBySpu($id);
        return $this->spuDetail($request, $id);
    }

    /**
     * DELETE /api/v1/admin/spu/:id
     */
    public function softDelete(Request $request, int $id): Response
    {
        $spu = Db::name('spus')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$spu) return $this->err(404, 'SPU 不存在');
        // iter-36 BIZ-08-2: 店铺隔离
        try { $this->assertStoreAccess($spu, $request->store_ids ?? null); }
        catch (\Throwable $e) { return $this->err(403, $e->getMessage()); }

        // 引用保护：order_items 引用了 SKU，SKU 属于 SPU
        $skuCodes = Db::name('skus')->where('spu_id', $id)->whereNull('deleted_at')->column('sku_code');
        // 跨库查 order_items 不可行；这里只做软删，订单仍能查 sku_snapshot
        Db::startTrans();
        try {
            Db::name('spus')->where('id', $id)->update(['deleted_at' => date('Y-m-d H:i:s')]);
            if ($skuCodes) {
                Db::name('skus')->whereIn('sku_code', $skuCodes)
                    ->update(['deleted_at' => date('Y-m-d H:i:s')]);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            return $this->err(500, $e->getMessage());
        }
        $this->publisher->publishDelete($skuCodes);
        AuditService::log('spu.delete', 'spu', (string)$id, $spu, null, '软删 ' . count($skuCodes) . ' 个 SKU');
        SpuStatusLogService::log($id, $spu['status'] ?? null, 'deleted', '软删');
        return $this->ok(['id' => $id, 'deleted_sku_count' => count($skuCodes)]);
    }

    /**
     * POST /api/v1/admin/spu/:id/publish
     */
    public function publish(Request $request, int $id): Response
    {
        $spu = Db::name('spus')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$spu) return $this->err(404, 'SPU 不存在');
        try { $this->assertStoreAccess($spu, $request->store_ids ?? null); }
        catch (\Throwable $e) { return $this->err(403, $e->getMessage()); }
        if ($spu['status'] === 'published') return $this->ok($spu);

        $skuCount = Db::name('skus')->where('spu_id', $id)->whereNull('deleted_at')->count();
        if ($skuCount === 0) return $this->err(409, '发布前请至少创建 1 个 SKU');

        $from = $spu['status'];
        Db::name('spus')->where('id', $id)->update([
            'status' => 'published',
            'published_at' => date('Y-m-d H:i:s'),
        ]);
        AuditService::log('spu.publish', 'spu', (string)$id, ['status' => $from], ['status' => 'published']);
        SpuStatusLogService::log($id, $from, 'published');
        $this->publisher->publishBySpu($id);
        return $this->spuDetail($request, $id);
    }

    /**
     * POST /api/v1/admin/spu/:id/offline
     */
    public function offline(Request $request, int $id): Response
    {
        $spu = Db::name('spus')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$spu) return $this->err(404, 'SPU 不存在');
        try { $this->assertStoreAccess($spu, $request->store_ids ?? null); }
        catch (\Throwable $e) { return $this->err(403, $e->getMessage()); }
        $from = $spu['status'];
        Db::name('spus')->where('id', $id)->update(['status' => 'offline']);
        AuditService::log('spu.offline', 'spu', (string)$id, ['status' => $from], ['status' => 'offline']);
        SpuStatusLogService::log($id, $from, 'offline');
        $this->publisher->publishBySpu($id);
        return $this->spuDetail($request, $id);
    }

    private function decodeJsonFields(array &$spu): void
    {
        foreach (['main_images', 'attrs', 'selling_points'] as $k) {
            if (isset($spu[$k]) && is_string($spu[$k])) {
                $spu[$k] = json_decode($spu[$k], true);
            }
        }
    }

    /**
     * GET /api/v1/admin/spu/export — 导出 SPU CSV（iter-30 A）
     * 可选筛选：status / category_id / brand_id / keyword（沿用 adminList 过滤）
     */
    public function exportCsv(Request $request): Response
    {
        $query = Db::name('spus')->whereNull('deleted_at')->order('id', 'asc');
        // iter-36 BIZ-08-2: 店铺过滤
        $this->applyStoreFilter($query, $request->store_ids ?? null);
        if ($sid = (int)$request->param('store_id', 0)) $query->where('store_id', $sid);
        if ($status = (string)$request->param('status', '')) $query->where('status', $status);
        if ($cid = (int)$request->param('category_id', 0)) $query->where('category_id', $cid);
        if ($bid = (int)$request->param('brand_id', 0)) $query->where('brand_id', $bid);
        if ($kw = trim((string)$request->param('keyword', ''))) {
            $query->where(function ($q) use ($kw) {
                $q->whereLike('name', "%{$kw}%")->whereOr('code', 'like', "%{$kw}%");
            });
        }
        $rows = $query->select()->toArray();

        $headers = ['code', 'name', 'category_id', 'brand_id', 'base_price', 'status', 'main_images', 'selling_points'];
        $out = [];
        foreach ($rows as $r) {
            $imgs = is_string($r['main_images']) ? (json_decode($r['main_images'], true) ?: []) : ($r['main_images'] ?: []);
            $sp = is_string($r['selling_points'] ?? '') ? (json_decode($r['selling_points'] ?? '', true) ?: []) : ($r['selling_points'] ?: []);
            $out[] = [
                $r['code'], $r['name'],
                (int)$r['category_id'], (int)($r['brand_id'] ?: 0),
                (int)$r['base_price'], $r['status'],
                implode(';', $imgs), implode(';', $sp),
            ];
        }

        $fh = fopen('php://temp', 'r+');
        fwrite($fh, "\xEF\xBB\xBF");
        fputcsv($fh, $headers);
        foreach ($out as $row) fputcsv($fh, $row);
        rewind($fh);
        $csv = stream_get_contents($fh);
        fclose($fh);

        \app\service\AuditService::log('spu.export', 'spu', '*', null, ['count' => count($rows)]);

        $filename = 'spus-' . date('Ymd-His') . '.csv';
        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * POST /api/v1/admin/spu/import — 导入 SPU CSV（iter-30 A）
     *   - 按 code 幂等：已存在则 update（name/base_price/main_images/selling_points）；不存在则 create draft
     *   - 不接 status（避免误发布/误下架）；status 转换走专门 publish/offline 接口
     *   - 校验：code/name/category_id 必填，category 必须存在
     *   - 返回：{ created, updated, errors[] }
     */
    public function importCsv(Request $request): Response
    {
        if (empty($_FILES['file'])) return $this->err(400, '请上传 file 字段');
        $f = $_FILES['file'];
        if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) return $this->err(400, '上传错误码: ' . $f['error']);
        $tmp = (string)($f['tmp_name'] ?? '');
        if (!$tmp || !is_uploaded_file($tmp)) return $this->err(400, '临时文件无效');

        $fh = fopen($tmp, 'r');
        if (!$fh) return $this->err(500, '无法读文件');

        // 跳 BOM
        $first = fread($fh, 3);
        if ($first !== "\xEF\xBB\xBF") rewind($fh);

        $headers = fgetcsv($fh);
        if (!$headers) { fclose($fh); return $this->err(400, 'CSV 空文件'); }

        $expected = ['code', 'name', 'category_id', 'brand_id', 'base_price', 'status', 'main_images', 'selling_points'];
        foreach (['code', 'name', 'category_id', 'base_price'] as $must) {
            if (!in_array($must, $headers, true)) {
                fclose($fh);
                return $this->err(400, "CSV header 缺少必填列: {$must}");
            }
        }
        $idx = array_flip($headers);

        // iter-36 BIZ-08-2: 确定本批导入归属哪家店（一次导入只属一店）
        try { $importStoreId = $this->resolveCreateStoreId($request, $request->store_ids ?? null); }
        catch (\Throwable $e) { fclose($fh); return $this->err(400, $e->getMessage()); }

        $created = 0; $updated = 0; $errors = [];
        $lineNo = 1;
        Db::startTrans();
        try {
            while (($row = fgetcsv($fh)) !== false) {
                $lineNo++;
                if (count($row) === 1 && trim($row[0]) === '') continue;
                $code = trim((string)($row[$idx['code']] ?? ''));
                $name = trim((string)($row[$idx['name']] ?? ''));
                $cid = (int)($row[$idx['category_id']] ?? 0);
                $bid = isset($idx['brand_id']) ? (int)($row[$idx['brand_id']] ?? 0) : 0;
                $bp = (int)($row[$idx['base_price']] ?? 0);
                $imgs = isset($idx['main_images']) ? (string)($row[$idx['main_images']] ?? '') : '';
                $sp = isset($idx['selling_points']) ? (string)($row[$idx['selling_points']] ?? '') : '';

                if (!$code || !$name) { $errors[] = "L{$lineNo}: code/name 必填"; continue; }
                if (!$cid) { $errors[] = "L{$lineNo}: category_id 必填"; continue; }
                if (!Db::name('categories')->where('id', $cid)->whereNull('deleted_at')->find()) {
                    $errors[] = "L{$lineNo}: category_id={$cid} 不存在"; continue;
                }
                if ($bid && !Db::name('brands')->where('id', $bid)->whereNull('deleted_at')->find()) {
                    $errors[] = "L{$lineNo}: brand_id={$bid} 不存在"; continue;
                }

                $imgArr = $imgs === '' ? [] : array_values(array_filter(array_map('trim', explode(';', $imgs))));
                $spArr = $sp === '' ? [] : array_values(array_filter(array_map('trim', explode(';', $sp))));
                if (!$imgArr) { $errors[] = "L{$lineNo}: main_images 至少 1 张"; continue; }

                $exist = Db::name('spus')->where('code', $code)->whereNull('deleted_at')->find();
                if ($exist) {
                    // iter-36: 已存在 SPU 必须在本批 store 范围内才允许 update
                    if ((int)$exist['store_id'] !== $importStoreId) {
                        $errors[] = "L{$lineNo}: code={$code} 属于其他店铺，不可更新"; continue;
                    }
                    Db::name('spus')->where('id', $exist['id'])->update([
                        'name' => $name,
                        'base_price' => $bp,
                        'main_images' => json_encode($imgArr, JSON_UNESCAPED_UNICODE),
                        'selling_points' => json_encode($spArr, JSON_UNESCAPED_UNICODE),
                    ]);
                    \app\service\AuditService::log('spu.import_update', 'spu', (string)$exist['id'],
                        ['name' => $exist['name'], 'base_price' => $exist['base_price']],
                        ['name' => $name, 'base_price' => $bp]);
                    $this->publisher->publishBySpu((int)$exist['id']);
                    $updated++;
                } else {
                    $newId = Db::name('spus')->insertGetId([
                        'store_id' => $importStoreId,
                        'code' => $code, 'name' => $name,
                        'category_id' => $cid, 'brand_id' => $bid ?: null,
                        'base_price' => $bp,
                        'main_images' => json_encode($imgArr, JSON_UNESCAPED_UNICODE),
                        'selling_points' => json_encode($spArr, JSON_UNESCAPED_UNICODE),
                        'status' => 'draft',
                    ]);
                    \app\service\AuditService::log('spu.import_create', 'spu', (string)$newId, null,
                        ['code' => $code, 'name' => $name, 'category_id' => $cid]);
                    \app\service\SpuStatusLogService::log((int)$newId, null, 'draft', 'csv import');
                    $created++;
                }
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            fclose($fh);
            return $this->err(500, '导入失败: ' . $e->getMessage());
        }
        fclose($fh);

        return $this->ok([
            'created' => $created, 'updated' => $updated,
            'errors' => $errors, 'total_processed' => $lineNo - 1,
        ]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
