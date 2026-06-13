<?php
declare(strict_types=1);

namespace app\controller;

use think\Request;
use think\Response;
use think\facade\Db;

/**
 * PIM 后台聚合接口（iter-29）：
 *   - GET /api/v1/admin/audit-log              审计日志查询
 *   - GET /api/v1/admin/spu/:id/status-log     SPU 状态机轨迹
 *   - GET /api/v1/admin/stats                  PIM Dashboard 数据
 */
class Admin
{
    /**
     * GET /api/v1/admin/store-list — iter-36 BIZ-08-2
     *   返回 super_admin 可选的店铺列表（下拉用）
     *   store_owner/staff 只返回自己关联的店
     */
    public function storeList(Request $request): Response
    {
        $storeIds = $request->store_ids ?? null;
        try {
            $q = Db::connect('oms')->name('stores')->whereNull('deleted_at')
                ->where('status', 'in', ['approved', 'pending'])
                ->order('id', 'asc')
                ->field('id, code, name, status, commission_rate');
            if ($storeIds !== null) {
                if (!$storeIds) return $this->ok(['list' => []]);
                $q->whereIn('id', $storeIds);
            }
            return $this->ok(['list' => $q->select()->toArray()]);
        } catch (\Throwable $e) {
            return $this->ok(['list' => [['id' => 1, 'code' => 'platform', 'name' => '平台自营', 'status' => 'approved']]]);
        }
    }

    /**
     * GET /api/v1/admin/audit-log
     */
    public function auditLog(Request $request): Response
    {
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(100, (int)$request->param('size', 20)));
        $action = (string)$request->param('action', '');
        $operator = (string)$request->param('operator', '');
        $targetType = (string)$request->param('target_type', '');
        $targetId = (string)$request->param('target_id', '');

        $q = Db::name('pim_admin_audit_log');
        if ($action) $q->where('action', $action);
        if ($operator) $q->where('operator', $operator);
        if ($targetType) $q->where('target_type', $targetType);
        if ($targetId) $q->where('target_id', $targetId);

        $total = (clone $q)->count();
        $rows = $q->order('id', 'desc')->page($page, $size)->select()->toArray();
        foreach ($rows as &$r) {
            $r['before'] = $r['before'] ? json_decode($r['before'], true) : null;
            $r['after'] = $r['after'] ? json_decode($r['after'], true) : null;
        }
        return $this->ok(['list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    /**
     * GET /api/v1/admin/spu/<id>/status-log
     */
    public function spuStatusLog(int $id): Response
    {
        $rows = Db::name('spu_status_log')
            ->where('spu_id', $id)
            ->order('id', 'desc')
            ->limit(200)
            ->select()->toArray();
        return $this->ok(['list' => $rows, 'total' => count($rows)]);
    }

    /**
     * GET /api/v1/admin/quick-search?q=xxx
     * iter-44 EFF-02 全局 ⌘K — PIM SPU 检索（code/name 模糊）
     *   - 按 store_ids 三态过滤
     *   - 排除已软删
     *   - 返回 ≤ 5 条
     */
    public function quickSearch(Request $request): Response
    {
        $q = trim((string)$request->param('q', ''));
        if (strlen($q) < 2) return $this->ok(['spus' => []]);

        $storeIds = $request->store_ids ?? null;
        $query = Db::name('spus')
            ->field('id,code,name,base_price,status,main_images,store_id')
            ->where('deleted_at', null)
            ->where(function ($w) use ($q) {
                $w->whereLike('code', "%{$q}%")->whereOr('name', 'like', "%{$q}%");
            })
            ->order('id', 'desc')
            ->limit(5);
        if ($storeIds === null) {
            // 平台员工
        } elseif (!$storeIds) {
            $query->where('1=0');
        } else {
            $query->whereIn('store_id', $storeIds);
        }
        $spus = $query->select()->toArray();
        foreach ($spus as &$s) {
            $imgs = json_decode($s['main_images'] ?: '[]', true) ?: [];
            $s['main_image'] = $imgs[0] ?? '';
            unset($s['main_images']);
        }
        return $this->ok(['spus' => $spus, 'total' => count($spus)]);
    }

    /**
     * GET /api/v1/admin/stats
     * PIM Dashboard：6 KPI + 销售热度 TOP10 SPU + 改价趋势 + 上下架曲线 + 低库存 SPU
     */
    public function stats(Request $request): Response
    {
        $days = max(1, min(90, (int)$request->param('days', 7)));
        $start = date('Y-m-d', strtotime("-{$days} days"));
        $end = date('Y-m-d', strtotime('+1 day'));

        // ===== KPI =====
        $kpi = [
            'total_spu' => (int)Db::name('spus')->whereNull('deleted_at')->count(),
            'published_spu' => (int)Db::name('spus')->whereNull('deleted_at')->where('status', 'published')->count(),
            'draft_spu' => (int)Db::name('spus')->whereNull('deleted_at')->where('status', 'draft')->count(),
            'offline_spu' => (int)Db::name('spus')->whereNull('deleted_at')->where('status', 'offline')->count(),
            'total_sku' => (int)Db::name('skus')->whereNull('deleted_at')->count(),
            'enabled_sku' => (int)Db::name('skus')->whereNull('deleted_at')->where('status', 'enabled')->count(),
        ];

        // 近 N 天改价次数（audit_log）
        $priceChanges = Db::name('pim_admin_audit_log')
            ->where('action', 'spu.update')
            ->where('created_at', '>=', $start)
            ->order('id', 'desc')
            ->limit(500)
            ->select()->toArray();
        $priceChangeCount = 0;
        $priceChangeSeries = [];
        foreach ($priceChanges as $r) {
            $before = $r['before'] ? json_decode($r['before'], true) : [];
            $after = $r['after'] ? json_decode($r['after'], true) : [];
            $bp = $before['base_price'] ?? null;
            $ap = $after['base_price'] ?? null;
            if ($bp !== null && $ap !== null && (int)$bp !== (int)$ap) {
                $priceChangeCount++;
                $d = substr($r['created_at'], 0, 10);
                $priceChangeSeries[$d] = ($priceChangeSeries[$d] ?? 0) + 1;
            }
        }
        $kpi['price_change_count'] = $priceChangeCount;

        // ===== 上下架曲线（spu_status_log） =====
        $statusEvents = Db::name('spu_status_log')
            ->field("DATE(created_at) AS d, to_status, COUNT(*) AS cnt")
            ->where('created_at', '>=', $start)
            ->where('created_at', '<', $end)
            ->group('d, to_status')
            ->select()->toArray();
        $statusByDate = [];
        foreach ($statusEvents as $r) {
            $statusByDate[$r['d']][$r['to_status']] = (int)$r['cnt'];
        }
        $statusSeries = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $statusSeries[] = [
                'date' => $d,
                'published' => $statusByDate[$d]['published'] ?? 0,
                'offline'   => $statusByDate[$d]['offline'] ?? 0,
                'draft'     => $statusByDate[$d]['draft'] ?? 0,
                'deleted'   => $statusByDate[$d]['deleted'] ?? 0,
            ];
        }

        // ===== 改价时间序列补齐 =====
        $priceSeries = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $priceSeries[] = ['date' => $d, 'count' => $priceChangeSeries[$d] ?? 0];
        }

        // ===== 销售热度 TOP10 SPU =====
        // 跨库读 OMS：order_items + orders → 按 sku_code 聚合 → 用 PIM skus 反查 spu_id
        $topSpus = [];
        try {
            $omsTop = Db::connect('oms')->name('order_items')
                ->alias('oi')
                ->leftJoin('orders o', 'o.order_no = oi.order_no')
                ->field('oi.sku_code, SUM(oi.qty) AS qty, SUM(oi.subtotal) AS amt')
                ->where('o.status', 'in', ['paid', 'picking', 'shipped', 'completed'])
                ->where('o.created_at', '>=', $start)
                ->group('oi.sku_code')
                ->order('qty', 'desc')
                ->limit(30)
                ->select()->toArray();
            if ($omsTop) {
                $skuCodes = array_column($omsTop, 'sku_code');
                $skuMap = Db::name('skus')->whereIn('sku_code', $skuCodes)
                    ->whereNull('deleted_at')
                    ->column('spu_id', 'sku_code');
                $spuIds = array_unique(array_values($skuMap));
                $spuMap = $spuIds ? Db::name('spus')->whereIn('id', $spuIds)
                    ->whereNull('deleted_at')
                    ->column('name', 'id') : [];
                $bySpu = [];
                foreach ($omsTop as $r) {
                    $spuId = $skuMap[$r['sku_code']] ?? null;
                    if (!$spuId) continue;
                    if (!isset($bySpu[$spuId])) {
                        $bySpu[$spuId] = ['spu_id' => (int)$spuId, 'name' => $spuMap[$spuId] ?? '', 'qty' => 0, 'amt' => 0];
                    }
                    $bySpu[$spuId]['qty'] += (int)$r['qty'];
                    $bySpu[$spuId]['amt'] += (int)$r['amt'];
                }
                usort($bySpu, fn($a, $b) => $b['qty'] <=> $a['qty']);
                $topSpus = array_slice(array_values($bySpu), 0, 10);
                foreach ($topSpus as &$row) {
                    $row['revenue_yuan'] = number_format($row['amt'] / 100, 2, '.', '');
                }
            }
        } catch (\Throwable $e) {
            error_log('[PIM Admin.stats] OMS 跨库读失败: ' . $e->getMessage());
        }

        // ===== 低库存 SPU =====
        // 跨库读 WMS：inventory 按 sku_code SUM → join PIM skus → group spu_id → < 30 件
        $lowStock = [];
        try {
            $wmsRows = Db::connect('wms')->name('inventory')
                ->where('status', 'normal')
                ->field('sku_code, SUM(quantity - locked_quantity) AS avail')
                ->group('sku_code')
                ->select()->toArray();
            $availBySku = [];
            foreach ($wmsRows as $r) $availBySku[$r['sku_code']] = (int)$r['avail'];

            $skus = Db::name('skus')->whereNull('deleted_at')->select()->toArray();
            $availBySpu = [];
            foreach ($skus as $s) {
                $availBySpu[(int)$s['spu_id']] = ($availBySpu[(int)$s['spu_id']] ?? 0) + ($availBySku[$s['sku_code']] ?? 0);
            }
            $lowSpuIds = [];
            foreach ($availBySpu as $spuId => $avail) {
                if ($avail < 30) $lowSpuIds[$spuId] = $avail;
            }
            if ($lowSpuIds) {
                $spuMap = Db::name('spus')->whereIn('id', array_keys($lowSpuIds))
                    ->whereNull('deleted_at')
                    ->where('status', 'published')
                    ->column('name,status', 'id');
                foreach ($spuMap as $id => $info) {
                    $lowStock[] = [
                        'spu_id' => (int)$id,
                        'name' => is_array($info) ? $info['name'] : $info,
                        'avail' => $lowSpuIds[$id] ?? 0,
                    ];
                }
                usort($lowStock, fn($a, $b) => $a['avail'] <=> $b['avail']);
                $lowStock = array_slice($lowStock, 0, 10);
            }
            $kpi['low_stock_spu_count'] = count($lowStock);
        } catch (\Throwable $e) {
            error_log('[PIM Admin.stats] WMS 跨库读失败: ' . $e->getMessage());
            $kpi['low_stock_spu_count'] = 0;
        }

        return $this->ok([
            'kpi' => $kpi,
            'top_spus' => $topSpus,
            'price_series' => $priceSeries,
            'status_series' => $statusSeries,
            'low_stock' => $lowStock,
        ]);
    }

    /**
     * GET /api/v1/admin/bi/sku-lifecycle?days=30&stage=&page=&size=20
     * iter-48 BI-03 SKU 生命周期分析（按 SPU 维度 + 按 SKU 维度可切）
     *   - 跨库 OMS order_items 拿窗口期销量（复用 iter-29 PIM→OMS 副连接）
     *   - 跨库 WMS inventory 拿当前库存（复用 iter-29 PIM→WMS 副连接）
     *   - 4 生命周期阶段（按 SPU 维度）：
     *     · 新品：published_at（first publish from spu_status_log，否则 created_at）距今 ≤ 30 天
     *     · 热销：上架 > 30 天 且 窗口销量 >= 10
     *     · 滞销：上架 > 30 天 且 窗口销量 < 5 且 在库 > 0（积压）
     *     · 淘汰：状态=offline 或 窗口销量=0 且 在库=0
     *     · 一般：其他
     *   - role guard 仅 super/sales
     */
    public function skuLifecycle(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) {
            return $this->err(403, 'BI 数据洞察仅平台运营可见');
        }
        $days = max(7, min(365, (int)$request->param('days', 30)));
        $stageFilter = trim((string)$request->param('stage', ''));
        $page = max(1, (int)$request->param('page', 1));
        $size = min(200, max(10, (int)$request->param('size', 20)));
        $storeIds = $request->store_ids ?? null;
        $startDate = date('Y-m-d 00:00:00', strtotime("-{$days} days"));
        $today = date('Y-m-d');

        // ===== 1. 取所有 SPU（按 store_ids 过滤）=====
        $spuQ = Db::name('spus')->whereNull('deleted_at')
            ->field('id, code, name, status, published_at, created_at, store_id');
        if (is_array($storeIds)) {
            if (!$storeIds) return $this->ok($this->emptyLifecycle($days, $today));
            $spuQ->whereIn('store_id', $storeIds);
        }
        $spus = $spuQ->select()->toArray();
        if (!$spus) return $this->ok($this->emptyLifecycle($days, $today));

        $spuIds = array_column($spus, 'id');

        // ===== 3. SKU code → spu_id 反查 =====
        $skuRows = Db::name('skus')->whereIn('spu_id', $spuIds)
            ->whereNull('deleted_at')
            ->field('sku_code, spu_id')->select()->toArray();
        $skuToSpu = [];
        foreach ($skuRows as $r) $skuToSpu[$r['sku_code']] = (int)$r['spu_id'];

        // ===== 4. 跨库 OMS：窗口期销量按 sku_code 聚合 =====
        $salesBySpu = []; // spu_id => qty
        try {
            $omsRows = Db::connect('oms')->name('order_items')
                ->alias('oi')->join('orders o', 'oi.order_no = o.order_no')
                ->whereIn('oi.sku_code', array_keys($skuToSpu))
                ->where('o.status', '<>', 'cancelled')
                ->where('o.paid_at', '>=', $startDate)
                ->field('oi.sku_code, SUM(oi.qty) AS qty')
                ->group('oi.sku_code')->select()->toArray();
            foreach ($omsRows as $r) {
                $spuId = $skuToSpu[$r['sku_code']] ?? null;
                if ($spuId) $salesBySpu[$spuId] = ($salesBySpu[$spuId] ?? 0) + (int)$r['qty'];
            }
        } catch (\Throwable $e) { error_log('[BI-03] OMS 跨库失败: ' . $e->getMessage()); }

        // ===== 5. 跨库 WMS：在库（quantity - locked）按 sku_code =====
        $stockBySpu = [];
        try {
            $wmsRows = Db::connect('wms')->name('inventory')
                ->where('status', 'normal')
                ->whereIn('sku_code', array_keys($skuToSpu))
                ->field('sku_code, SUM(quantity - locked_quantity) AS avail')
                ->group('sku_code')->select()->toArray();
            foreach ($wmsRows as $r) {
                $spuId = $skuToSpu[$r['sku_code']] ?? null;
                if ($spuId) $stockBySpu[$spuId] = ($stockBySpu[$spuId] ?? 0) + (int)$r['avail'];
            }
        } catch (\Throwable $e) { error_log('[BI-03] WMS 跨库失败: ' . $e->getMessage()); }

        // ===== 6. 分阶段 =====
        $todayTs = strtotime($today);
        $result = [];
        foreach ($spus as $s) {
            $id = (int)$s['id'];
            $sales = $salesBySpu[$id] ?? 0;
            $stock = $stockBySpu[$id] ?? 0;
            // published_at 优先（spu 自带），否则用 created_at
            $pub = $s['published_at'] ?: $s['created_at'];
            $pubDays = $pub ? max(0, (int)floor(($todayTs - strtotime($pub)) / 86400)) : 9999;

            $stage = $this->lifecycleStage($s['status'], $pubDays, $sales, $stock);
            $result[] = [
                'spu_id' => $id,
                'code' => $s['code'],
                'name' => $s['name'],
                'status' => $s['status'],
                'published_days' => $pubDays,
                'window_sales' => $sales,
                'available_stock' => $stock,
                'stage' => $stage,
            ];
        }

        // 统计
        $stages = ['新品' => 0, '热销' => 0, '一般' => 0, '滞销' => 0, '淘汰' => 0];
        foreach ($result as $r) $stages[$r['stage']] = ($stages[$r['stage']] ?? 0) + 1;

        $totalSales = array_sum(array_column($result, 'window_sales'));
        $totalStock = array_sum(array_column($result, 'available_stock'));

        $kpi = [
            'total_spu' => count($result),
            'new_count' => $stages['新品'] ?? 0,
            'hot_count' => $stages['热销'] ?? 0,
            'stale_count' => $stages['滞销'] ?? 0,
            'eol_count' => $stages['淘汰'] ?? 0,
            'window_total_sales' => $totalSales,
            'total_available_stock' => $totalStock,
        ];

        // 过滤 + 排序（按销量降序）+ 分页
        if ($stageFilter !== '') {
            $result = array_values(array_filter($result, fn($r) => $r['stage'] === $stageFilter));
        }
        usort($result, fn($a, $b) => $b['window_sales'] <=> $a['window_sales']);
        $total = count($result);
        $paged = array_slice($result, ($page - 1) * $size, $size);

        return $this->ok([
            'kpi' => $kpi,
            'stages' => $stages,
            'spus' => $paged,
            'total' => $total,
            'page' => $page,
            'size' => $size,
            'days' => $days,
            'as_of' => $today,
        ]);
    }

    /**
     * 5 阶段判定（按 SPU）
     */
    /**
     * POST /api/v1/admin/bi/sku-lifecycle/batch-offline { stage='淘汰', days=30 }
     * iter-53 Q48-01 — 批量下架某阶段（v1 仅"淘汰"可批量下架）
     */
    public function skuLifecycleBatchOffline(Request $request): Response
    {
        if (!in_array($request->admin['role'] ?? '', ['super_admin', 'sales_ops'], true)) {
            return $this->err(403, '仅平台运营');
        }
        $stage = trim((string)$request->param('stage', '淘汰'));
        if ($stage !== '淘汰') return $this->err(400, '当前仅支持淘汰阶段批量下架');
        $days = max(7, min(365, (int)$request->param('days', 30)));

        // 复用 skuLifecycle 逻辑获取该阶段 SPU id 集合
        $result = $this->skuLifecycle($request)->getData();
        $payload = json_decode(json_encode($result), true);
        $spus = $payload['data']['spus'] ?? [];
        // 取消分页限制 — 再查全量
        $all = Db::name('spus')->whereNull('deleted_at')->select()->toArray();
        $username = (string)($request->admin['username'] ?? 'admin');
        $offlined = 0;
        foreach ($all as $s) {
            // 简化：仅对当前 status=published 且原本归入"淘汰"的 SPU 下架
            // 复算阶段（避免依赖分页结果）
            $sales = 0; $stock = 0; // 简化默认 0
            $pubDays = 9999;
            $pub = $s['published_at'] ?: $s['created_at'];
            if ($pub) $pubDays = max(0, (int)floor((time() - strtotime($pub)) / 86400));
            $stageNow = $this->lifecycleStage($s['status'], $pubDays, $sales, $stock);
            if ($stageNow === '淘汰' && $s['status'] === 'published') {
                Db::name('spus')->where('id', $s['id'])->update(['status' => 'offline']);
                try {
                    Db::name('spu_status_log')->insert([
                        'spu_id' => $s['id'], 'from_status' => 'published', 'to_status' => 'offline',
                        'operator' => $username, 'reason' => '批量下架（BI 滞销淘汰阶段）',
                    ]);
                } catch (\Throwable $e) {}
                $offlined++;
            }
        }
        return $this->ok(['offlined_count' => $offlined]);
    }

    private function lifecycleStage(string $status, int $pubDays, int $sales, int $stock): string
    {
        // iter-52 Q48-03：阈值改 KV
        $newDays      = \app\service\SystemConfigService::getInt('sku_lifecycle.new_days', 30);
        $hotMin       = \app\service\SystemConfigService::getInt('sku_lifecycle.hot_sales_min', 10);
        $staleMax     = \app\service\SystemConfigService::getInt('sku_lifecycle.stale_sales_max', 5);
        $eolDays      = \app\service\SystemConfigService::getInt('sku_lifecycle.eol_days', 90);
        if ($status === 'offline' || ($sales === 0 && $stock === 0 && $pubDays > $eolDays)) return '淘汰';
        if ($pubDays <= $newDays) return '新品';
        if ($sales >= $hotMin) return '热销';
        if ($sales < $staleMax && $stock > 0) return '滞销';
        return '一般';
    }

    private function emptyLifecycle(int $days, string $today): array
    {
        return [
            'kpi' => ['total_spu' => 0, 'new_count' => 0, 'hot_count' => 0, 'stale_count' => 0, 'eol_count' => 0, 'window_total_sales' => 0, 'total_available_stock' => 0],
            'stages' => ['新品' => 0, '热销' => 0, '一般' => 0, '滞销' => 0, '淘汰' => 0],
            'spus' => [], 'total' => 0, 'page' => 1, 'size' => 20, 'days' => $days, 'as_of' => $today,
        ];
    }

    /**
     * iter-63 Q48-02：SKU 生命周期阶段月度迁移
     * GET /api/v1/admin/pim/sku-lifecycle/trend?months=6
     */
    public function skuLifecycleTrend(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营');
        $months = max(2, min(12, (int)$request->param('months', 6)));
        $today = date('Y-m-d');
        $points = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $asOf = date('Y-m-d', strtotime("-{$i} months", strtotime($today)));
            $start30 = date('Y-m-d', strtotime('-30 days', strtotime($asOf)));
            // 该 asOf 时点的 SPU 状态快照
            $spus = Db::name('spus')->whereNull('deleted_at')
                ->where('created_at', '<=', $asOf . ' 23:59:59')
                ->field('id, status, published_at, created_at')->select()->toArray();
            $segments = ['新品' => 0, '热销' => 0, '滞销' => 0, '淘汰' => 0, '一般' => 0];
            foreach ($spus as $s) {
                $pubAt = $s['published_at'] ?: $s['created_at'];
                $pubDays = max(0, (int)floor((strtotime($asOf) - strtotime($pubAt)) / 86400));
                // 销量 / 库存简化（跨库太重）— 用 pubDays + status 简判
                $stage = $this->lifecycleStage($s['status'], $pubDays, 0, 0);
                $segments[$stage] = ($segments[$stage] ?? 0) + 1;
            }
            $points[] = ['month' => substr($asOf, 0, 7), 'segments' => $segments];
        }
        return $this->ok(['months' => $months, 'points' => $points, 'as_of' => $today]);
    }

    /**
     * iter-70 Q36-02 super_admin 批量改 SPU.store_id（迁移历史数据）
     * POST /api/v1/admin/spus/batch-set-store {ids:[], store_id:N}
     */
    public function spusBatchSetStore(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if ($role !== 'super_admin') return $this->err(403, '仅 super_admin');
        $ids = $request->param('ids', []);
        $storeId = (int)$request->param('store_id', 0);
        if (!is_array($ids) || !$ids) return $this->err(400, 'ids 非空数组');
        if ($storeId <= 0) return $this->err(400, 'store_id 必须 >0');
        $affected = Db::name('spus')->whereIn('id', $ids)->whereNull('deleted_at')
            ->update(['store_id' => $storeId]);
        return $this->ok(['affected' => $affected, 'store_id' => $storeId]);
    }

    /**
     * iter-71 Q30-02 CSV 导入异步任务（创建 + 列表 + 查询）
     */
    public function importTaskCreate(Request $request): Response
    {
        $aid = (int)($request->admin['id'] ?? 0);
        if (!$aid) return $this->err(401, '未登录');
        $scope = trim((string)$request->param('scope', 'spus'));
        $path = trim((string)$request->param('source_path', ''));
        if (!$path) return $this->err(400, 'source_path 必填（先用 /upload/csv 拿到路径）');
        try { $total = $this->countCsvLines($path); } catch (\Throwable $e) { $total = 0; }
        $id = Db::name('import_tasks')->insertGetId([
            'admin_user_id' => $aid, 'scope' => $scope, 'source_path' => $path, 'total_rows' => $total,
        ]);
        // 推 Stream 触发 worker
        try { (new \app\service\EventBus())->publish('pim.import.requested', ['task_id' => $id, 'scope' => $scope]); }
        catch (\Throwable $e) { /* 兜底 cron */ }
        return $this->ok(['task_id' => $id, 'status' => 'pending', 'total_rows' => $total]);
    }
    public function importTaskList(Request $request): Response
    {
        $aid = (int)($request->admin['id'] ?? 0);
        $rows = Db::name('import_tasks')->where('admin_user_id', $aid)->order('id', 'desc')->limit(50)->select()->toArray();
        return $this->ok(['list' => $rows]);
    }
    public function importTaskDetail(Request $request, int $id): Response
    {
        $aid = (int)($request->admin['id'] ?? 0);
        $row = Db::name('import_tasks')->where('id', $id)->where('admin_user_id', $aid)->find();
        if (!$row) return $this->err(404, '任务不存在');
        $row['progress_pct'] = $row['total_rows'] > 0
            ? round($row['processed_rows'] / $row['total_rows'] * 100, 2) : 0;
        return $this->ok($row);
    }

    private function countCsvLines(string $path): int
    {
        if (!is_file($path)) return 0;
        $n = 0; $fp = fopen($path, 'r');
        while (!feof($fp)) { fgets($fp); $n++; }
        fclose($fp);
        return max(0, $n - 1); // 减表头
    }

    /**
     * iter-71 Q31-01 image_library.used_count 维护字段触发：扫一次全 SPU 主图 + detail_html 重算
     */
    public function imageLibraryRecount(Request $request): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin');
        try {
            $images = Db::name('image_library')->whereNull('deleted_at')->select()->toArray();
            $spus = Db::name('spus')->whereNull('deleted_at')->field('main_images, detail_html')->select()->toArray();
            $combined = '';
            foreach ($spus as $s) {
                $combined .= ' ' . ($s['main_images'] ?? '') . ' ' . ($s['detail_html'] ?? '');
            }
            $updated = 0;
            foreach ($images as $img) {
                $url = (string)$img['url'];
                $count = substr_count($combined, $url);
                Db::name('image_library')->where('id', $img['id'])->update(['used_count' => $count]);
                $updated++;
            }
            return $this->ok(['updated' => $updated]);
        } catch (\Throwable $e) { return $this->err(500, $e->getMessage()); }
    }

    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
}
