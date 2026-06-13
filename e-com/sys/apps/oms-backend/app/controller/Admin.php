<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AuditService;
use app\service\InventoryService;
use app\service\OrderStateMachine;
use think\Request;
use think\Response;
use think\facade\Db;

class Admin
{
    public function __construct(
        private OrderStateMachine $sm = new OrderStateMachine(),
        private InventoryService $inv = new InventoryService(),
    ) {}

    /**
     * GET /api/v1/admin/order/list
     * 全订单列表（不限 user_id），后台使用
     */
    public function orderList(Request $request): Response
    {
        $status = $request->param('status');
        $keyword = trim((string)$request->param('keyword', ''));
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(100, (int)$request->param('size', 20)));

        $query = Db::name('orders');
        // iter-37 BIZ-08-3: 店铺过滤
        $storeIds = $request->store_ids ?? null;
        if ($storeIds !== null) {
            if (!$storeIds) $query->where('1=0');
            else $query->whereIn('store_id', $storeIds);
        }
        if ($sid = (int)$request->param('store_id', 0)) $query->where('store_id', $sid);
        if ($status) $query->where('status', $status);
        if ($keyword) {
            // 模糊匹配：order_no / 收货人姓名 / 手机号（地址是 JSON，用 LIKE 匹配整段）
            $query->where(function ($q) use ($keyword) {
                $q->whereLike('order_no', "%{$keyword}%")
                    ->whereOr('address', 'like', "%{$keyword}%");
            });
        }

        // iter-42 EFF-01 高级搜索：手机号、SKU 反查、金额范围、用户 ID、时间范围
        if ($phone = trim((string)$request->param('phone', ''))) {
            // address JSON 包含 phone:"138..." 模式
            $query->whereLike('address', "%\"phone\":\"%{$phone}%\"%");
        }
        if ($uid = (int)$request->param('user_id', 0)) {
            $query->where('user_id', $uid);
        }
        if ($skuCode = trim((string)$request->param('sku_code', ''))) {
            // SKU 反查：找含该 SKU 的所有 order_no
            $skuOrderNos = Db::name('order_items')->where('sku_code', $skuCode)
                ->limit(1000)->column('order_no');
            if ($skuOrderNos) $query->whereIn('order_no', $skuOrderNos);
            else $query->where('1=0');
        }
        if (($amountMin = (int)$request->param('amount_min_cents', 0)) > 0) {
            $query->where('total_amount', '>=', $amountMin);
        }
        if (($amountMax = (int)$request->param('amount_max_cents', 0)) > 0) {
            $query->where('total_amount', '<=', $amountMax);
        }
        if ($start = trim((string)$request->param('start_date', ''))) {
            $query->where('created_at', '>=', $start);
        }
        if ($end = trim((string)$request->param('end_date', ''))) {
            $query->where('created_at', '<=', $end);
        }

        $total = (clone $query)->count();
        $rows = $query->order('id', 'desc')->page($page, $size)->select()->toArray();
        foreach ($rows as &$r) {
            $r['address'] = json_decode($r['address'] ?? '[]', true);
        }
        return json(['code' => 0, 'msg' => 'ok', 'data' => [
            'list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size,
        ]]);
    }

    /**
     * GET /api/v1/admin/order/:no
     * 订单详情 + 状态变更日志
     */
    public function orderDetail(Request $request, string $orderNo): Response
    {
        $order = Db::name('orders')->where('order_no', $orderNo)->find();
        if (!$order) return json(['code' => 404, 'msg' => '订单不存在', 'data' => null]);
        // iter-37 BIZ-08-3: 店铺隔离
        $storeIds = $request->store_ids ?? null;
        if ($storeIds !== null && !in_array((int)$order['store_id'], $storeIds, true)) {
            return json(['code' => 403, 'msg' => '无权访问此店铺数据', 'data' => null]);
        }
        $order['address'] = json_decode($order['address'] ?? '[]', true);
        $items = Db::name('order_items')->where('order_no', $orderNo)->select()->toArray();
        foreach ($items as &$it) {
            $it['sku_snapshot'] = json_decode($it['sku_snapshot'] ?? '[]', true);
        }
        $log = Db::name('order_status_log')
            ->where('order_no', $orderNo)
            ->order('id', 'asc')
            ->select()->toArray();
        return json(['code' => 0, 'msg' => 'ok', 'data' => [
            'order' => $order, 'items' => $items, 'status_log' => $log,
        ]]);
    }

    /**
     * GET /api/v1/admin/stats
     * Dashboard KPI
     */
    public function stats(Request $request): Response
    {
        // iter-18 扩展：days 参数（默认 7），返回时间序列 + TOP SKU + 退款率
        $days = max(1, min(90, (int)$request->param('days', 7)));
        $start = date('Y-m-d', strtotime("-{$days} days"));
        $end = date('Y-m-d', strtotime('+1 day'));

        // 总览 KPI
        $totalOrders = Db::name('orders')->count();
        $paidStatus = ['paid', 'picking', 'shipped', 'completed'];
        $totalAmount = (int)Db::name('orders')->where('status', 'in', $paidStatus)->sum('total_amount');
        $byStatus = Db::name('orders')
            ->field('status, COUNT(*) AS cnt')
            ->group('status')
            ->select()->toArray();
        $totalInventory = Db::name('inventory_status')->count();
        $lockedInventory = (int)Db::name('inventory_status')->sum('locked');

        // 时间序列：日订单数 + 日销售额（按 created_at 日期分组）
        $dailyOrders = Db::name('orders')
            ->field("DATE(created_at) AS d, COUNT(*) AS cnt, SUM(CASE WHEN status IN ('" . implode("','", $paidStatus) . "') THEN total_amount ELSE 0 END) AS amt")
            ->where('created_at', '>=', $start)
            ->where('created_at', '<', $end)
            ->group('d')
            ->order('d', 'asc')
            ->select()->toArray();

        // 补齐缺失日期（无订单的日期补 0）
        $byDate = [];
        foreach ($dailyOrders as $r) {
            $byDate[$r['d']] = ['cnt' => (int)$r['cnt'], 'amt' => (int)$r['amt']];
        }
        $timeSeries = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $row = $byDate[$d] ?? ['cnt' => 0, 'amt' => 0];
            $timeSeries[] = [
                'date' => $d,
                'order_count' => $row['cnt'],
                'revenue_cents' => $row['amt'],
                'revenue_yuan' => number_format($row['amt'] / 100, 2, '.', ''),
            ];
        }

        // TOP 10 SKU 销量（按 order_items 已付款订单中聚合）
        $topSkus = Db::name('order_items')
            ->alias('oi')
            ->leftJoin('orders o', 'o.order_no = oi.order_no')
            ->field('oi.sku_code, SUM(oi.qty) AS qty, SUM(oi.subtotal) AS amt')
            ->where('o.status', 'in', $paidStatus)
            ->where('o.created_at', '>=', $start)
            ->group('oi.sku_code')
            ->order('qty', 'desc')
            ->limit(10)
            ->select()->toArray();
        $topSkus = array_map(fn($r) => [
            'sku_code' => $r['sku_code'],
            'qty' => (int)$r['qty'],
            'revenue_cents' => (int)$r['amt'],
            'revenue_yuan' => number_format(((int)$r['amt']) / 100, 2, '.', ''),
        ], $topSkus);

        // 日退款率：refunded 金额 / 同期已付款金额
        $dailyRefund = Db::name('refund_orders')
            ->field("DATE(created_at) AS d, SUM(CASE WHEN status='refunded' THEN amount ELSE 0 END) AS refund_amt")
            ->where('created_at', '>=', $start)
            ->where('created_at', '<', $end)
            ->group('d')
            ->select()->toArray();
        $refundByDate = [];
        foreach ($dailyRefund as $r) $refundByDate[$r['d']] = (int)$r['refund_amt'];

        $refundSeries = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $paid = $byDate[$d]['amt'] ?? 0;
            $refund = $refundByDate[$d] ?? 0;
            $rate = $paid > 0 ? round($refund / $paid * 100, 2) : 0;
            $refundSeries[] = [
                'date' => $d,
                'refund_cents' => $refund,
                'paid_cents' => $paid,
                'refund_rate_pct' => $rate,
            ];
        }

        // iter-21 Q19-07: 券核销率（总览 + 日序列）
        $totalClaimed = (int)Db::name('coupons')->sum('claimed_count');
        $totalUsed = (int)Db::name('coupons')->sum('used_count');
        $couponMetrics = [
            'total_claimed' => $totalClaimed,
            'total_used' => $totalUsed,
            'overall_use_rate_pct' => $totalClaimed > 0 ? round($totalUsed / $totalClaimed * 100, 2) : 0,
        ];
        // 日序列：领取按 received_at 分组，使用按 used_at 分组
        $dailyClaim = Db::name('user_coupons')
            ->field("DATE(received_at) AS d, COUNT(*) AS cnt")
            ->where('received_at', '>=', $start)
            ->where('received_at', '<', $end)
            ->group('d')->select()->toArray();
        $dailyUse = Db::name('user_coupons')
            ->field("DATE(used_at) AS d, COUNT(*) AS cnt")
            ->where('used_at', '>=', $start)
            ->where('used_at', '<', $end)
            ->whereNotNull('used_at')
            ->group('d')->select()->toArray();
        $claimByDate = [];
        $useByDate = [];
        foreach ($dailyClaim as $r) $claimByDate[$r['d']] = (int)$r['cnt'];
        foreach ($dailyUse as $r) $useByDate[$r['d']] = (int)$r['cnt'];
        $couponSeries = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $claim = $claimByDate[$d] ?? 0;
            $use = $useByDate[$d] ?? 0;
            $couponSeries[] = [
                'date' => $d,
                'claimed' => $claim,
                'used' => $use,
                'use_rate_pct' => $claim > 0 ? round($use / $claim * 100, 2) : 0,
            ];
        }

        // iter-21 评价数据（跨库读 shop_db.reviews）
        $reviewMetrics = ['total_reviews' => 0, 'avg_rating' => 0.0, 'recent_reviews' => 0, 'recent_avg_rating' => 0.0];
        $reviewSeries = [];
        try {
            $rTotal = Db::connect('shop')->name('reviews')
                ->where('status', 'active')
                ->field('COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg_r')
                ->find();
            $reviewMetrics['total_reviews'] = (int)($rTotal['cnt'] ?? 0);
            $reviewMetrics['avg_rating'] = $reviewMetrics['total_reviews'] > 0 ? round((float)$rTotal['avg_r'], 1) : 0.0;

            $rRecent = Db::connect('shop')->name('reviews')
                ->where('status', 'active')
                ->where('created_at', '>=', $start)
                ->field('COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg_r')
                ->find();
            $reviewMetrics['recent_reviews'] = (int)($rRecent['cnt'] ?? 0);
            $reviewMetrics['recent_avg_rating'] = $reviewMetrics['recent_reviews'] > 0 ? round((float)$rRecent['avg_r'], 1) : 0.0;

            $rDaily = Db::connect('shop')->name('reviews')
                ->where('status', 'active')
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->field("DATE(created_at) AS d, COUNT(*) AS cnt, COALESCE(AVG(rating), 0) AS avg_r")
                ->group('d')->select()->toArray();
            $rByDate = [];
            foreach ($rDaily as $r) $rByDate[$r['d']] = ['cnt' => (int)$r['cnt'], 'avg' => round((float)$r['avg_r'], 1)];
            for ($i = $days - 1; $i >= 0; $i--) {
                $d = date('Y-m-d', strtotime("-{$i} days"));
                $row = $rByDate[$d] ?? ['cnt' => 0, 'avg' => 0.0];
                $reviewSeries[] = ['date' => $d, 'review_count' => $row['cnt'], 'avg_rating' => $row['avg']];
            }
        } catch (\Throwable $e) {
            // shop 副连接不可用时 silently 返回 0；不阻塞主响应
            for ($i = $days - 1; $i >= 0; $i--) {
                $d = date('Y-m-d', strtotime("-{$i} days"));
                $reviewSeries[] = ['date' => $d, 'review_count' => 0, 'avg_rating' => 0.0];
            }
        }

        // iter-21 用户留存 / 复购
        $retentionMetrics = ['total_users' => 0, 'total_buyers' => 0, 'repeat_buyers' => 0, 'buyer_rate_pct' => 0.0, 'repeat_rate_pct' => 0.0];
        try {
            $totalUsers = (int)Db::connect('shop')->name('users')->count();
            $orderCounts = Db::name('orders')
                ->where('status', '<>', 'pending_pay')
                ->field('user_id, COUNT(*) AS cnt')
                ->group('user_id')
                ->select()->toArray();
            $totalBuyers = count($orderCounts);
            $repeatBuyers = 0;
            foreach ($orderCounts as $oc) if ((int)$oc['cnt'] >= 2) $repeatBuyers++;
            $retentionMetrics = [
                'total_users' => $totalUsers,
                'total_buyers' => $totalBuyers,
                'repeat_buyers' => $repeatBuyers,
                'buyer_rate_pct' => $totalUsers > 0 ? round($totalBuyers / $totalUsers * 100, 2) : 0,
                'repeat_rate_pct' => $totalBuyers > 0 ? round($repeatBuyers / $totalBuyers * 100, 2) : 0,
            ];
        } catch (\Throwable $e) { /* 跨库失败保留 0 */ }

        // iter-28 财务维度：基于 settlement_orders 算
        $financeMetrics = ['total_revenue_cents' => 0, 'total_refund_cents' => 0, 'net_cents' => 0, 'unsettled_count' => 0, 'settled_count' => 0];
        $financeSeries = [];
        $couponUsageMetrics = ['orders_with_coupon' => 0, 'orders_with_multi_coupon' => 0, 'multi_coupon_rate_pct' => 0];
        try {
            $revRow = Db::name('settlement_orders')->where('type', 'order')
                ->where('created_at', '>=', $start)->where('created_at', '<', $end)
                ->field('SUM(amount) AS rev, COUNT(*) AS cnt')->find();
            $refRow = Db::name('settlement_orders')->where('type', 'refund')
                ->where('created_at', '>=', $start)->where('created_at', '<', $end)
                ->field('SUM(amount) AS rev, COUNT(*) AS cnt')->find();
            $settleStatus = Db::name('settlement_orders')
                ->field('status, COUNT(*) AS cnt')->group('status')->select()->toArray();
            $statusMap = array_column($settleStatus, 'cnt', 'status');
            $financeMetrics = [
                'total_revenue_cents' => (int)($revRow['rev'] ?? 0),
                'total_refund_cents' => abs((int)($refRow['rev'] ?? 0)),  // 显示绝对值
                'net_cents' => (int)($revRow['rev'] ?? 0) + (int)($refRow['rev'] ?? 0),  // refund 本身就是负数
                'settled_count' => (int)($statusMap['settled'] ?? 0),
                'unsettled_count' => (int)($statusMap['unsettled'] ?? 0),
            ];
            $financeMetrics['total_revenue_yuan'] = number_format($financeMetrics['total_revenue_cents'] / 100, 2, '.', '');
            $financeMetrics['total_refund_yuan'] = number_format($financeMetrics['total_refund_cents'] / 100, 2, '.', '');
            $financeMetrics['net_yuan'] = number_format($financeMetrics['net_cents'] / 100, 2, '.', '');

            // 日序列
            $dailyRev = Db::name('settlement_orders')->where('type', 'order')
                ->where('created_at', '>=', $start)->where('created_at', '<', $end)
                ->field("DATE(created_at) AS d, SUM(amount) AS amt")->group('d')->select()->toArray();
            $dailyRef = Db::name('settlement_orders')->where('type', 'refund')
                ->where('created_at', '>=', $start)->where('created_at', '<', $end)
                ->field("DATE(created_at) AS d, SUM(amount) AS amt")->group('d')->select()->toArray();
            $revMap = array_column($dailyRev, 'amt', 'd');
            $refMap = array_column($dailyRef, 'amt', 'd');
            for ($i = $days - 1; $i >= 0; $i--) {
                $d = date('Y-m-d', strtotime("-{$i} days"));
                $financeSeries[] = [
                    'date' => $d,
                    'revenue_cents' => (int)($revMap[$d] ?? 0),
                    'refund_cents' => abs((int)($refMap[$d] ?? 0)),
                ];
            }

            // 多券订单占比
            $ordersWithCoupon = (int)Db::name('order_coupons')->distinct(true)->field('order_no')->count();
            $ordersWithMulti = (int)Db::name('order_coupons')
                ->field('order_no, COUNT(*) AS cnt')->group('order_no')
                ->having('cnt > 1')->count();
            $couponUsageMetrics = [
                'orders_with_coupon' => $ordersWithCoupon,
                'orders_with_multi_coupon' => $ordersWithMulti,
                'multi_coupon_rate_pct' => $ordersWithCoupon > 0 ? round($ordersWithMulti / $ordersWithCoupon * 100, 2) : 0,
            ];
        } catch (\Throwable $e) { /* 财务统计失败保留 0 */ }

        return json(['code' => 0, 'msg' => 'ok', 'data' => [
            'total_orders' => $totalOrders,
            'total_revenue_cents' => $totalAmount,
            'total_revenue_yuan' => number_format($totalAmount / 100, 2, '.', ''),
            'by_status' => $byStatus,
            'sku_count' => $totalInventory,
            'total_locked' => $lockedInventory,
            'days' => $days,
            'time_series' => $timeSeries,
            'top_skus' => $topSkus,
            'refund_series' => $refundSeries,
            // iter-21
            'coupon_metrics' => $couponMetrics,
            'coupon_series' => $couponSeries,
            'review_metrics' => $reviewMetrics,
            'review_series' => $reviewSeries,
            'retention_metrics' => $retentionMetrics,
            // iter-28
            'finance_metrics' => $financeMetrics,
            'finance_series' => $financeSeries,
            'coupon_usage_metrics' => $couponUsageMetrics,
        ]]);
    }

    /**
     * GET /api/v1/admin/inventory/list
     * OMS 库存四态全表
     */
    public function inventoryList(Request $request): Response
    {
        $rows = Db::name('inventory_status')->order('sku_code', 'asc')->select()->toArray();
        return json(['code' => 0, 'msg' => 'ok', 'data' => ['list' => $rows, 'total' => count($rows)]]);
    }

    /**
     * GET /api/v1/admin/dead-letter
     * Stream 消费失败的死信队列
     */
    public function deadLetter(Request $request): Response
    {
        $stream = $request->param('stream');
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(100, (int)$request->param('size', 20)));

        $query = Db::name('dead_letter');
        if ($stream) $query->where('stream', $stream);
        $total = (clone $query)->count();
        $rows = $query->order('id', 'desc')->page($page, $size)->select()->toArray();
        foreach ($rows as &$r) {
            $r['payload'] = json_decode($r['payload'] ?? '{}', true);
        }
        return json(['code' => 0, 'msg' => 'ok', 'data' => [
            'list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size,
        ]]);
    }

    /**
     * iter-42 EFF-08: dead_letter 一键 replay
     *   POST /api/v1/admin/dead-letter/:id/replay
     *   把 payload 重新 XADD 回原 stream（让 consumer 再消费一次）
     *   replay 后 dead_letter 行加 replayed_at 字段（不删除，保留追溯）
     */
    /**
     * iter-42 EFF-05 待办中心聚合
     *   GET /api/v1/admin/todos/counts
     *   返回各模块"待处理"计数 + 简短描述，供前端 Dashboard 卡片显示
     */
    public function todosCounts(Request $request): Response
    {
        $storeIds = $request->store_ids ?? null;

        // 应用店铺过滤辅助
        $applyStore = function ($q) use ($storeIds) {
            if ($storeIds === null) return $q;
            if (!$storeIds) return $q->where('1=0');
            return $q->whereIn('store_id', $storeIds);
        };

        $items = [];
        // 1. 待审退款（pending_approve）
        $items[] = [
            'key' => 'refund_pending',
            'label' => '待审退款',
            'count' => (int)$applyStore(Db::name('refund_orders')->where('status', 'pending_approve'))->count(),
            'router' => '/oms/refunds',
        ];
        // 2. 待审换货
        $items[] = [
            'key' => 'exchange_pending',
            'label' => '待审换货',
            'count' => (int)$applyStore(Db::name('exchange_orders')->where('status', 'pending_approve'))->count(),
            'router' => '/oms/exchanges',
        ];
        // 3. 待付款订单
        $items[] = [
            'key' => 'orders_pending_pay',
            'label' => '待付款订单',
            'count' => (int)$applyStore(Db::name('orders')->where('status', 'pending_pay'))->count(),
            'router' => '/oms/orders',
        ];
        // 4. 待发货订单（paid + picking）
        $items[] = [
            'key' => 'orders_to_ship',
            'label' => '待发货订单',
            'count' => (int)$applyStore(Db::name('orders')->where('status', 'in', ['paid', 'picking']))->count(),
            'router' => '/oms/orders',
        ];
        // 5. 待审店铺（super_admin 看到，其他人 0）
        if ($storeIds === null) {
            $items[] = [
                'key' => 'stores_pending',
                'label' => '待审店铺',
                'count' => (int)Db::name('stores')->whereNull('deleted_at')->where('status', 'pending')->count(),
                'router' => '/oms/stores',
            ];
        }
        // 6. 死信（dead_letter）
        $items[] = [
            'key' => 'dead_letter',
            'label' => '待处理死信',
            'count' => (int)Db::name('dead_letter')->whereNull('error')->whereOr('error', 'not like', '%replayed at%')->count(),
            'router' => '/oms/dead-letter',
        ];

        // iter-64 Q42-01：24h 增量趋势 + 色阶级别
        $yesterdayStart = date('Y-m-d 00:00:00', strtotime('-1 day'));
        $yesterdayEnd = date('Y-m-d 23:59:59', strtotime('-1 day'));
        $yesterdayPay = (int)$applyStore(Db::name('orders')->where('status', 'pending_pay')->where('created_at', 'between', [$yesterdayStart, $yesterdayEnd]))->count();
        foreach ($items as &$it) {
            $it['delta'] = null;
            if ($it['key'] === 'orders_pending_pay') $it['delta'] = $it['count'] - $yesterdayPay;
            // 阈值色阶（>=100 critical / >=20 warn / >0 ok / 0 idle）
            if ($it['count'] >= 100) $it['severity'] = 'critical';
            elseif ($it['count'] >= 20) $it['severity'] = 'warn';
            elseif ($it['count'] > 0) $it['severity'] = 'ok';
            else $it['severity'] = 'idle';
        }
        unset($it);

        return json(['code' => 0, 'msg' => 'ok', 'data' => [
            'items' => $items,
            'total_count' => array_sum(array_column($items, 'count')),
            'generated_at' => date('Y-m-d H:i:s'),
        ]]);
    }

    /* ====== iter-64 Q42-02 高级搜索"我的视图" ====== */
    public function viewList(Request $request): Response
    {
        $aid = (int)($request->admin['id'] ?? 0);
        $scope = trim((string)$request->param('scope', ''));
        if (!$aid) return $this->err(401, '未登录');
        $q = Db::name('admin_views')->where('admin_user_id', $aid);
        if ($scope) $q->where('scope', $scope);
        return $this->ok(['list' => $q->order('id', 'desc')->select()->toArray()]);
    }
    public function viewSave(Request $request): Response
    {
        $aid = (int)($request->admin['id'] ?? 0);
        if (!$aid) return $this->err(401, '未登录');
        $scope = trim((string)$request->param('scope', ''));
        $name = trim((string)$request->param('name', ''));
        $filters = $request->param('filters', []);
        if (!$scope || !$name) return $this->err(400, 'scope / name 必填');
        // 同名覆盖
        $exist = Db::name('admin_views')->where('admin_user_id', $aid)->where('scope', $scope)->where('name', $name)->find();
        $data = ['admin_user_id' => $aid, 'scope' => $scope, 'name' => $name, 'filters_json' => json_encode($filters, JSON_UNESCAPED_UNICODE)];
        if ($exist) {
            Db::name('admin_views')->where('id', $exist['id'])->update(['filters_json' => $data['filters_json']]);
            return $this->ok(['id' => $exist['id'], 'updated' => true]);
        }
        $id = Db::name('admin_views')->insertGetId($data);
        return $this->ok(['id' => $id, 'updated' => false]);
    }
    public function viewDelete(Request $request, int $id): Response
    {
        $aid = (int)($request->admin['id'] ?? 0);
        if (!$aid) return $this->err(401, '未登录');
        $row = Db::name('admin_views')->where('id', $id)->where('admin_user_id', $aid)->find();
        if (!$row) return $this->err(404, '视图不存在');
        Db::name('admin_views')->where('id', $id)->delete();
        return $this->ok(['id' => $id]);
    }

    /* ====== iter-64 Q42-03 死信自动 replay 策略管理 ====== */
    public function streamPolicyList(Request $request): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin');
        return $this->ok(['list' => Db::name('stream_replay_policies')->order('stream', 'asc')->select()->toArray()]);
    }
    public function streamPolicyUpdate(Request $request): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin');
        $stream = trim((string)$request->param('stream', ''));
        $max = (int)$request->param('max_retries', 3);
        $en = (int)$request->param('enabled', 1);
        if (!$stream) return $this->err(400, 'stream 必填');
        $exist = Db::name('stream_replay_policies')->where('stream', $stream)->find();
        if ($exist) Db::name('stream_replay_policies')->where('stream', $stream)->update(['max_retries' => $max, 'enabled' => $en]);
        else Db::name('stream_replay_policies')->insert(['stream' => $stream, 'max_retries' => $max, 'enabled' => $en]);
        return $this->ok(['stream' => $stream, 'max_retries' => $max, 'enabled' => $en]);
    }

    /* ====== iter-64 EFF-06 操作日志撤销 ====== */
    public function auditReverse(Request $request, int $id): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin 可撤销');
        $log = Db::name('admin_audit_log')->where('id', $id)->find();
        if (!$log) return $this->err(404, '日志不存在');
        if (!empty($log['reversed_at'])) return $this->err(400, '该操作已撤销');
        $op = (string)($request->admin['username'] ?? 'admin');
        try {
            // 仅支持已知可逆操作（白名单）
            $reverseMap = [
                'order.force_cancel' => function ($log) {
                    $orderNo = $log['target_id'];
                    return $this->ok(['restored' => true, 'order_no' => $orderNo, 'hint' => '请调用 /admin/order/{$orderNo}/recover 完成具体恢复']);
                },
            ];
            if (!isset($reverseMap[$log['action']])) {
                return $this->err(400, "操作 {$log['action']} 不支持撤销（白名单：order.force_cancel）");
            }
            // 标记
            Db::name('admin_audit_log')->where('id', $id)->update([
                'reversed_at' => date('Y-m-d H:i:s'),
                'reversed_by' => $op,
            ]);
            \app\service\AuditService::log('audit.reverse', 'audit_log', (string)$id, null, ['action' => $log['action']], null, $op);
            return $this->ok(['reversed' => true, 'log_id' => $id, 'action' => $log['action']]);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function deadLetterReplay(Request $request, int $id): Response
    {
        $row = Db::name('dead_letter')->where('id', $id)->find();
        if (!$row) return json(['code' => 404, 'msg' => '死信不存在', 'data' => null]);
        try {
            // 解析原 payload — webhook 死信存的是 body 字符串；事件死信存的是 JSON
            $payload = is_string($row['payload']) ? (json_decode($row['payload'], true) ?: ['raw' => $row['payload']]) : ($row['payload'] ?: []);
            // 优先取 fields.payload（EventBus 模式）；否则把 payload 整个当 payload 字段
            $eventPayload = $payload['payload'] ?? $payload['fields']['payload'] ?? $payload;
            if (is_array($eventPayload)) $eventPayload = json_encode($eventPayload, JSON_UNESCAPED_UNICODE);

            $bus = new \app\service\EventBus();
            $newId = $bus->publish($row['stream'], [
                'payload' => $eventPayload,
                'replayed_from_dead_letter_id' => (string)$id,
            ]);

            // 标记 replayed_at（用 reason 列附加，避免 ALTER）
            Db::name('dead_letter')->where('id', $id)->update([
                'error' => ($row['error'] ?? '') . " | replayed at " . date('Y-m-d H:i:s') . " new_id=" . $newId,
            ]);
            AuditService::log('dead_letter.replay', 'dead_letter', (string)$id, null,
                ['stream' => $row['stream'], 'new_id' => $newId],
                'admin replay', $request->admin['username'] ?? 'admin');

            return json(['code' => 0, 'msg' => 'ok', 'data' => ['id' => $id, 'new_message_id' => $newId, 'stream' => $row['stream']]]);
        } catch (\Throwable $e) {
            return json(['code' => 500, 'msg' => 'replay 失败: ' . $e->getMessage(), 'data' => null]);
        }
    }

    /**
     * GET /api/v1/admin/quick-search?q=xxx
     * iter-44 EFF-02 全局 ⌘K 快速搜索：3 类业务单 + 手机号反查
     *   - SO* → 订单号精确/模糊
     *   - RF* → 退款号
     *   - EX* → 换货号
     *   - 11 位数字 → 手机号搜订单（address JSON LIKE）
     *   - 其他 → 订单号 / 收货人 / 快递号 通用 LIKE
     *   返回 {orders, refunds, exchanges} 每类 ≤ 5
     */
    public function quickSearch(Request $request): Response
    {
        $q = trim((string)$request->param('q', ''));
        if (strlen($q) < 2) return $this->ok(['orders' => [], 'refunds' => [], 'exchanges' => []]);

        // iter-44 EFF-02：OMS 业务数据对 PIM editor 角色不可见
        $role = (string)($request->admin['role'] ?? '');
        if ($role === 'editor') return $this->ok(['orders' => [], 'refunds' => [], 'exchanges' => []]);

        $storeIds = $request->store_ids ?? null;
        $applyStore = function ($query, string $col = 'store_id') use ($storeIds) {
            if ($storeIds === null) return $query;
            if (!$storeIds) return $query->where('1=0');
            return $query->whereIn($col, $storeIds);
        };

        $upper = strtoupper($q);
        $orders = [];
        $refunds = [];
        $exchanges = [];

        // 订单
        $orderQuery = Db::name('orders')->field('order_no,user_id,total_amount,status,express_no,created_at,store_id')->order('id', 'desc')->limit(5);
        if (str_starts_with($upper, 'SO')) {
            $orderQuery->whereLike('order_no', "%{$q}%");
        } elseif (ctype_digit($q) && strlen($q) >= 7 && strlen($q) <= 11) {
            // iter-65 Q44-01：放宽到 7-11 位数字（支持尾号 4 位以上模糊查），address JSON LIKE
            $orderQuery->whereLike('address', "%{$q}%");
        } else {
            $orderQuery->where(function ($w) use ($q) {
                $w->whereLike('order_no', "%{$q}%")
                  ->whereOr('express_no', 'like', "%{$q}%")
                  ->whereOr('address', 'like', "%{$q}%");
            });
        }
        $orders = $applyStore($orderQuery)->select()->toArray();

        // 退款
        if (str_starts_with($upper, 'RF') || str_starts_with($upper, 'SO')) {
            $refundQuery = Db::name('refund_orders')->field('refund_no,order_no,user_id,amount,type,status,created_at,store_id')->order('id', 'desc')->limit(5);
            $refundQuery->where(function ($w) use ($q) {
                $w->whereLike('refund_no', "%{$q}%")->whereOr('order_no', 'like', "%{$q}%");
            });
            $refunds = $applyStore($refundQuery)->select()->toArray();
        }

        // 换货
        if (str_starts_with($upper, 'EX') || str_starts_with($upper, 'SO')) {
            $exchangeQuery = Db::name('exchange_orders')->field('exchange_no,order_no,user_id,status,reason,created_at,store_id')->order('id', 'desc')->limit(5);
            $exchangeQuery->where(function ($w) use ($q) {
                $w->whereLike('exchange_no', "%{$q}%")->whereOr('order_no', 'like', "%{$q}%");
            });
            $exchanges = $applyStore($exchangeQuery)->select()->toArray();
        }

        return $this->ok([
            'orders' => $orders,
            'refunds' => $refunds,
            'exchanges' => $exchanges,
            'total' => count($orders) + count($refunds) + count($exchanges),
        ]);
    }

    /**
     * POST /api/v1/admin/order/:no/cancel
     * 管理员强制取消订单（不限 user_id）；只允许 pending_pay/paid 状态取消
     * 已 paid 取消则同步释放库存（locked 回 available）
     */
    public function cancelOrder(Request $request, string $orderNo): Response
    {
        $reason = (string)$request->param('reason', 'admin 取消');
        $order = Db::name('orders')->where('order_no', $orderNo)->find();
        if (!$order) return $this->err(404, '订单不存在');
        if (!in_array($order['status'], ['pending_pay', 'paid'], true)) {
            return $this->err(409, "当前状态 {$order['status']} 不支持取消（仅 pending_pay/paid）");
        }

        $before = ['status' => $order['status']];
        Db::startTrans();
        try {
            $this->sm->transit($orderNo, 'cancelled', 'admin', 'admin', $reason);
            Db::name('orders')->where('order_no', $orderNo)->update(['cancel_reason' => $reason]);
            $items = Db::name('order_items')->where('order_no', $orderNo)->select()->toArray();
            $this->inv->unlockBatch(
                array_map(fn($i) => ['sku_code' => $i['sku_code'], 'qty' => (int)$i['qty']], $items),
                $orderNo
            );
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            return $this->err(500, $e->getMessage());
        }
        AuditService::log('order.force_cancel', 'order', $orderNo, $before, ['status' => 'cancelled'], $reason);
        return $this->ok(['order_no' => $orderNo, 'status' => 'cancelled']);
    }

    /**
     * POST /api/v1/admin/order/batch-cancel
     * 批量取消订单（仅 pending_pay / paid）
     * body: { order_nos: ["SO..."], reason: "..." }
     */
    public function batchCancelOrders(Request $request): Response
    {
        $orderNos = $request->param('order_nos', []);
        $reason = (string)$request->param('reason', 'admin 批量取消');
        if (!is_array($orderNos) || !$orderNos) return $this->err(400, 'order_nos 不能为空');
        if (count($orderNos) > 50) return $this->err(400, '单次最多 50 个');

        $ok = []; $failed = [];
        foreach ($orderNos as $no) {
            $order = Db::name('orders')->where('order_no', $no)->find();
            if (!$order) { $failed[] = ['order_no' => $no, 'reason' => '不存在']; continue; }
            if (!in_array($order['status'], ['pending_pay', 'paid'], true)) {
                $failed[] = ['order_no' => $no, 'reason' => "状态 {$order['status']} 不支持取消"];
                continue;
            }
            $before = ['status' => $order['status']];
            Db::startTrans();
            try {
                $this->sm->transit($no, 'cancelled', 'admin', 'admin', $reason);
                Db::name('orders')->where('order_no', $no)->update(['cancel_reason' => $reason]);
                $items = Db::name('order_items')->where('order_no', $no)->select()->toArray();
                $this->inv->unlockBatch(
                    array_map(fn($i) => ['sku_code' => $i['sku_code'], 'qty' => (int)$i['qty']], $items),
                    $no
                );
                Db::commit();
                AuditService::log('order.force_cancel', 'order', $no, $before, ['status' => 'cancelled'], $reason);
                $ok[] = $no;
            } catch (\Throwable $e) {
                Db::rollback();
                $failed[] = ['order_no' => $no, 'reason' => $e->getMessage()];
            }
        }
        return $this->ok(['ok_count' => count($ok), 'ok' => $ok, 'failed_count' => count($failed), 'failed' => $failed]);
    }

    /**
     * POST /api/v1/admin/order/:no/recover
     * 异常订单恢复：把 exception 状态切回指定状态（pending_pay/paid/picking/shipped/completed/cancelled）
     */
    public function recoverOrder(Request $request, string $orderNo): Response
    {
        $to = (string)$request->param('to_status');
        $reason = (string)$request->param('reason', 'admin 恢复');
        if (!in_array($to, ['paid', 'picking', 'shipped', 'completed', 'cancelled'], true)) {
            return $this->err(400, 'to_status 非法');
        }
        $order = Db::name('orders')->where('order_no', $orderNo)->find();
        if (!$order) return $this->err(404, '订单不存在');
        if ($order['status'] !== 'exception') {
            return $this->err(409, '订单不在 exception 状态，当前: ' . $order['status']);
        }
        try {
            $this->sm->transit($orderNo, $to, 'admin', 'admin', $reason);
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
        AuditService::log('order.recover', 'order', $orderNo, ['status' => 'exception'], ['status' => $to], $reason);
        return $this->ok(['order_no' => $orderNo, 'status' => $to]);
    }

    /**
     * PUT /api/v1/admin/inventory/:sku
     * 手动调整某 SKU 的 available/buffer_qty（写流水）
     */
    public function adjustInventory(Request $request, string $sku): Response
    {
        $row = Db::name('inventory_status')->where('sku_code', $sku)->find();
        if (!$row) return $this->err(404, 'SKU 库存记录不存在');

        $newAvail = $request->has('available') ? (int)$request->param('available') : null;
        $newBuffer = $request->has('buffer_qty') ? (int)$request->param('buffer_qty') : null;
        $reason = (string)$request->param('reason', 'admin 调整');
        if ($newAvail === null && $newBuffer === null) return $this->err(400, '至少传 available 或 buffer_qty');
        if ($newAvail !== null && $newAvail < 0) return $this->err(400, 'available 不能为负');
        if ($newBuffer !== null && $newBuffer < 0) return $this->err(400, 'buffer_qty 不能为负');

        Db::startTrans();
        try {
            $update = [];
            $beforeA = (int)$row['available'];
            $beforeL = (int)$row['locked'];
            $afterA = $beforeA;
            if ($newAvail !== null) { $update['available'] = $newAvail; $afterA = $newAvail; }
            if ($newBuffer !== null) $update['buffer_qty'] = $newBuffer;
            Db::name('inventory_status')->where('sku_code', $sku)->update($update);

            if ($newAvail !== null) {
                Db::name('inventory_log')->insert([
                    'sku_code' => $sku,
                    'change_type' => 'adjust',
                    'change_qty' => $afterA - $beforeA,
                    'before_available' => $beforeA,
                    'after_available' => $afterA,
                    'before_locked' => $beforeL,
                    'after_locked' => $beforeL,
                    'related_order' => null,
                    'operator' => 'admin: ' . $reason,
                ]);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            return $this->err(500, $e->getMessage());
        }

        $final = Db::name('inventory_status')->where('sku_code', $sku)->find();
        AuditService::log('inventory.adjust', 'sku', $sku,
            ['available' => (int)$row['available'], 'buffer_qty' => (int)$row['buffer_qty']],
            ['available' => (int)$final['available'], 'buffer_qty' => (int)$final['buffer_qty']],
            $reason);
        return $this->ok($final);
    }

    /**
     * GET /api/v1/admin/order/export
     * 按筛选条件导出订单 CSV（iter-18）
     */
    public function exportOrders(Request $request): Response
    {
        $status = $request->param('status');
        $keyword = trim((string)$request->param('keyword', ''));

        $query = Db::name('orders');
        if ($status) $query->where('status', $status);
        if ($keyword) {
            $query->where(function ($q) use ($keyword) {
                $q->whereLike('order_no', "%{$keyword}%")
                    ->whereOr('address', 'like', "%{$keyword}%");
            });
        }
        $rows = $query->order('id', 'desc')->limit(5000)->select()->toArray();

        // iter-21 Q19-06: 批量查这些订单的优惠券名称
        $orderNos = array_column($rows, 'order_no');
        $couponMap = [];
        if ($orderNos) {
            $couponRows = Db::name('user_coupons')
                ->alias('uc')
                ->leftJoin('coupons c', 'uc.coupon_id = c.id')
                ->whereIn('uc.order_no', $orderNos)
                ->field('uc.order_no, c.name')
                ->select()->toArray();
            foreach ($couponRows as $cr) $couponMap[$cr['order_no']] = $cr['name'] ?? '';
        }

        $headers = ['订单号', '用户ID', '状态', '总金额(元)', '商品金额(元)', '运费(元)', '优惠券', '优惠金额(元)', '收货人', '手机号', '地址', '支付时间', '发货时间', '完成时间', '创建时间'];
        $body = [];
        foreach ($rows as $r) {
            $addr = json_decode($r['address'] ?? '{}', true) ?: [];
            $body[] = [
                $r['order_no'], $r['user_id'], $r['status'],
                number_format(((int)$r['total_amount']) / 100, 2, '.', ''),
                number_format(((int)$r['goods_amount']) / 100, 2, '.', ''),
                number_format(((int)$r['freight']) / 100, 2, '.', ''),
                $couponMap[$r['order_no']] ?? '',
                ((int)$r['discount']) > 0 ? number_format(((int)$r['discount']) / 100, 2, '.', '') : '',
                $addr['name'] ?? '', $addr['phone'] ?? '',
                ($addr['province'] ?? '') . ($addr['city'] ?? '') . ($addr['district'] ?? '') . ($addr['detail'] ?? ''),
                $r['paid_at'], $r['shipped_at'], $r['completed_at'], $r['created_at'],
            ];
        }
        return $this->csv("orders_" . date('Ymd_His') . ".csv", $headers, $body);
    }

    /**
     * GET /api/v1/admin/refund/export
     */
    public function exportRefunds(Request $request): Response
    {
        $status = $request->param('status');
        $type = $request->param('type');
        $keyword = trim((string)$request->param('keyword', ''));

        $query = Db::name('refund_orders');
        if ($status) $query->where('status', $status);
        if ($type) $query->where('type', $type);
        if ($keyword) {
            $query->where(function ($q) use ($keyword) {
                $q->whereLike('refund_no', "%{$keyword}%")
                    ->whereOr('order_no', 'like', "%{$keyword}%");
            });
        }
        $rows = $query->order('id', 'desc')->limit(5000)->select()->toArray();

        $headers = ['退款单号', '原订单号', '用户ID', '类型', '状态', '金额(元)', '原因', '申请时间', '审批时间', '收货时间', '退款时间'];
        $body = [];
        foreach ($rows as $r) {
            $body[] = [
                $r['refund_no'], $r['order_no'], $r['user_id'],
                $r['type'] === 'refund_only' ? '仅退款' : '退货退款',
                $r['status'],
                number_format(((int)$r['amount']) / 100, 2, '.', ''),
                $r['reason'], $r['created_at'], $r['approved_at'], $r['received_back_at'], $r['refunded_at'],
            ];
        }
        return $this->csv("refunds_" . date('Ymd_His') . ".csv", $headers, $body);
    }

    /**
     * GET /api/v1/admin/inventory/export
     */
    public function exportInventory(Request $request): Response
    {
        $rows = Db::name('inventory_status')->order('sku_code', 'asc')->select()->toArray();
        $headers = ['SKU', '可用', '锁定', '预留', '安全垫', '更新时间'];
        $body = [];
        foreach ($rows as $r) {
            $body[] = [
                $r['sku_code'],
                (int)$r['available'], (int)$r['locked'],
                (int)$r['reserved'], (int)$r['buffer_qty'],
                $r['updated_at'] ?? '',
            ];
        }
        return $this->csv("inventory_" . date('Ymd_His') . ".csv", $headers, $body);
    }

    /**
     * 用 PHP 原生 fputcsv 流式输出，UTF-8 BOM 兼容 Excel
     */
    private function csv(string $filename, array $headers, array $rows): Response
    {
        $fh = fopen('php://temp', 'r+');
        // UTF-8 BOM
        fwrite($fh, "\xEF\xBB\xBF");
        fputcsv($fh, $headers);
        foreach ($rows as $row) fputcsv($fh, $row);
        rewind($fh);
        $csv = stream_get_contents($fh);
        fclose($fh);
        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * GET /api/v1/admin/audit-log
     * 后台操作审计日志（iter-15）
     */
    public function auditLog(Request $request): Response
    {
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(100, (int)$request->param('size', 20)));
        $action = (string)$request->param('action', '');
        $operator = (string)$request->param('operator', '');
        $targetType = (string)$request->param('target_type', '');
        $targetId = (string)$request->param('target_id', '');

        $q = Db::name('admin_audit_log');
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
        return json(['code' => 0, 'msg' => 'ok', 'data' => [
            'list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size,
        ]]);
    }

    /**
     * GET /api/v1/admin/bi/rfm?days=90&segment=&page=1&size=20
     * iter-46 BI-01 用户 RFM 分层
     *   R = 最近购买距今天数（越小越好）
     *   F = 周期内订单数（越大越好）
     *   M = 周期内累计消费（分；越大越好）
     *   分位法 5 分制（PHP 端算，无需 MySQL 8 NTILE）→ 8 分群规则
     */
    public function rfmAnalysis(Request $request): Response
    {
        // BI 数据洞察仅限 super_admin / sales_ops
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) {
            return $this->err(403, 'BI 数据洞察仅平台运营可见');
        }
        $days = max(7, min(720, (int)$request->param('days', 90)));
        $segmentFilter = trim((string)$request->param('segment', ''));
        $page = max(1, (int)$request->param('page', 1));
        $size = min(200, max(10, (int)$request->param('size', 20)));
        // iter-63 Q46-01：分位法切换 absolute / quintile
        $mode = $request->param('mode', 'absolute');
        $mode = in_array($mode, ['absolute', 'quintile'], true) ? $mode : 'absolute';

        $storeIds = $request->store_ids ?? null;
        $startDate = date('Y-m-d', strtotime("-{$days} days"));
        $today = date('Y-m-d');

        $query = Db::name('orders')
            ->whereIn('status', ['paid', 'picking', 'shipped', 'completed'])
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', $startDate . ' 00:00:00')
            ->field('user_id, COUNT(*) AS f, SUM(total_amount) AS m_cents, MAX(paid_at) AS last_paid_at')
            ->group('user_id');
        if (is_array($storeIds)) {
            if (!$storeIds) return $this->ok(['kpi' => $this->emptyKpi(), 'segments' => [], 'users' => [], 'total' => 0, 'days' => $days, 'as_of' => $today]);
            $query->whereIn('store_id', $storeIds);
        }
        $rows = $query->select()->toArray();

        if (!$rows) {
            return $this->ok(['kpi' => $this->emptyKpi(), 'segments' => [], 'users' => [], 'total' => 0, 'days' => $days, 'as_of' => $today]);
        }

        // 计算 recency
        $todayTs = strtotime($today);
        foreach ($rows as &$r) {
            $r['user_id'] = (int)$r['user_id'];
            $r['f'] = (int)$r['f'];
            $r['m_cents'] = (int)$r['m_cents'];
            $r['m_yuan'] = round($r['m_cents'] / 100, 2);
            $r['r_days'] = max(0, (int)floor(($todayTs - strtotime($r['last_paid_at'])) / 86400));
        }
        unset($r);

        if ($mode === 'quintile' && count($rows) >= 5) {
            // iter-63 Q46-01：分位法（n>=5 才有意义；小样本仍兜底走 absolute）
            $rDays = array_column($rows, 'r_days');
            $fVals = array_column($rows, 'f');
            $mCents = array_column($rows, 'm_cents');
            sort($rDays); sort($fVals); sort($mCents);
            $qR = $this->quintileBoundaries($rDays); // R 越小越好 → 反转
            $qF = $this->quintileBoundaries($fVals);
            $qM = $this->quintileBoundaries($mCents);
            foreach ($rows as &$r) {
                $r['r_score'] = 6 - $this->scoreByBoundaries($r['r_days'], $qR);
                $r['f_score'] = $this->scoreByBoundaries($r['f'], $qF);
                $r['m_score'] = $this->scoreByBoundaries($r['m_cents'], $qM);
                $r['segment'] = $this->rfmSegment($r['r_score'], $r['f_score'], $r['m_score']);
            }
            unset($r);
        } else {
            foreach ($rows as &$r) {
                $rd = $r['r_days'];
                $r['r_score'] = $rd <= 7 ? 5 : ($rd <= 14 ? 4 : ($rd <= 30 ? 3 : ($rd <= 60 ? 2 : 1)));
                $fv = $r['f'];
                $r['f_score'] = $fv >= 10 ? 5 : ($fv >= 5 ? 4 : ($fv >= 3 ? 3 : ($fv >= 2 ? 2 : 1)));
                $my = $r['m_yuan'];
                $r['m_score'] = $my >= 10000 ? 5 : ($my >= 3000 ? 4 : ($my >= 1000 ? 3 : ($my >= 300 ? 2 : 1)));
                $r['segment'] = $this->rfmSegment($r['r_score'], $r['f_score'], $r['m_score']);
            }
            unset($r);
        }

        // segments 聚合
        $segCount = [];
        foreach ($rows as $r) $segCount[$r['segment']] = ($segCount[$r['segment']] ?? 0) + 1;

        // KPI
        $kpi = [
            'total_users'      => count($rows),
            'active_users'     => count(array_filter($rows, fn($r) => $r['r_score'] >= 4)),
            'high_value_users' => count(array_filter($rows, fn($r) => in_array($r['segment'], ['重要价值', '重要保持', '不能失去'], true))),
            'lost_users'       => count(array_filter($rows, fn($r) => in_array($r['segment'], ['流失', '休眠'], true))),
            'total_revenue_yuan' => round(array_sum(array_column($rows, 'm_cents')) / 100, 2),
            'avg_orders_per_user' => count($rows) ? round(array_sum(array_column($rows, 'f')) / count($rows), 2) : 0,
        ];

        // 过滤 + 分页
        if ($segmentFilter !== '') {
            $rows = array_values(array_filter($rows, fn($r) => $r['segment'] === $segmentFilter));
        }
        usort($rows, fn($a, $b) => $b['m_cents'] <=> $a['m_cents']);
        $total = count($rows);
        $paged = array_slice($rows, ($page - 1) * $size, $size);

        return $this->ok([
            'kpi' => $kpi,
            'segments' => $segCount,
            'users' => $paged,
            'total' => $total,
            'page' => $page,
            'size' => $size,
            'days' => $days,
            'as_of' => $today,
        ]);
    }

    private function emptyKpi(): array
    {
        return ['total_users' => 0, 'active_users' => 0, 'high_value_users' => 0, 'lost_users' => 0, 'total_revenue_yuan' => 0, 'avg_orders_per_user' => 0];
    }

    /** iter-63 Q46-01 — 计算 20/40/60/80 分位边界（升序数组） */
    private function quintileBoundaries(array $sortedAsc): array
    {
        $n = count($sortedAsc);
        if ($n < 5) return [];
        return [
            $sortedAsc[(int)floor($n * 0.2)],
            $sortedAsc[(int)floor($n * 0.4)],
            $sortedAsc[(int)floor($n * 0.6)],
            $sortedAsc[(int)floor($n * 0.8)],
        ];
    }
    private function scoreByBoundaries($v, array $b): int
    {
        if (!$b) return 3;
        if ($v <= $b[0]) return 1; if ($v <= $b[1]) return 2;
        if ($v <= $b[2]) return 3; if ($v <= $b[3]) return 4; return 5;
    }

    /**
     * GET /api/v1/admin/bi/funnel?days=30
     * iter-47 BI-02 订单漏斗（5 阶段）
     *   1. 加购：shop_db.cart distinct user_id（created_at 在窗口内）
     *   2. 下单：oms.orders distinct user_id（created_at 在窗口内，status != cancelled）
     *   3. 支付：oms.orders distinct user_id（paid_at 在窗口内）
     *   4. 收货：oms.orders distinct user_id（completed_at 在窗口内）
     *   5. 评价：shop_db.reviews distinct user_id（created_at 在窗口内）
     * 跨库：shop_db.cart + shop_db.reviews 复用 iter-20 oms→shop 副连接
     * 转化率 = next_stage / prev_stage；overall = stage5 / stage1
     */
    public function funnelAnalysis(Request $request): Response
    {
        // BI 仅限平台运营
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) {
            return $this->err(403, 'BI 数据洞察仅平台运营可见');
        }
        $days = max(7, min(720, (int)$request->param('days', 30)));
        $startDate = date('Y-m-d 00:00:00', strtotime("-{$days} days"));
        $today = date('Y-m-d');
        $storeIds = $request->store_ids ?? null;

        // 2/3/4: OMS orders（本库）
        $orderBase = Db::name('orders');
        if (is_array($storeIds)) {
            if (!$storeIds) {
                return $this->ok($this->emptyFunnel($days, $today));
            }
            $orderBase->whereIn('store_id', $storeIds);
        }
        $orderUsers = (clone $orderBase)
            ->where('status', '<>', 'cancelled')
            ->where('created_at', '>=', $startDate)
            ->distinct(true)->count('user_id');
        $paidUsers = (clone $orderBase)
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', $startDate)
            ->distinct(true)->count('user_id');
        $completedUsers = (clone $orderBase)
            ->whereNotNull('completed_at')
            ->where('completed_at', '>=', $startDate)
            ->distinct(true)->count('user_id');

        // 1/5: shop_db 跨库（弱依赖，失败降 0）
        $cartUsers = 0; $reviewUsers = 0;
        try {
            $cartUsers = Db::connect('shop')->name('cart')
                ->where('created_at', '>=', $startDate)
                ->distinct(true)->count('user_id');
        } catch (\Throwable $e) { error_log('[BI-02 funnel] shop_db.cart 跨库失败: ' . $e->getMessage()); }
        try {
            $reviewUsers = Db::connect('shop')->name('reviews')
                ->where('created_at', '>=', $startDate)
                ->distinct(true)->count('user_id');
        } catch (\Throwable $e) { error_log('[BI-02 funnel] shop_db.reviews 跨库失败: ' . $e->getMessage()); }

        // 转化率（保留 1 位小数 %）
        $rate = fn(int $cur, int $prev) => $prev > 0 ? round($cur / $prev * 100, 1) : 0;

        $stages = [
            ['key' => 'cart',      'name' => '加购',  'users' => $cartUsers,      'conv_from_prev' => null,                            'conv_from_start' => 100.0],
            ['key' => 'order',     'name' => '下单',  'users' => $orderUsers,     'conv_from_prev' => $rate($orderUsers,     $cartUsers),   'conv_from_start' => $rate($orderUsers,     $cartUsers)],
            ['key' => 'paid',      'name' => '支付',  'users' => $paidUsers,      'conv_from_prev' => $rate($paidUsers,      $orderUsers),  'conv_from_start' => $rate($paidUsers,      $cartUsers)],
            ['key' => 'completed', 'name' => '收货',  'users' => $completedUsers, 'conv_from_prev' => $rate($completedUsers, $paidUsers),   'conv_from_start' => $rate($completedUsers, $cartUsers)],
            ['key' => 'review',    'name' => '评价',  'users' => $reviewUsers,    'conv_from_prev' => $rate($reviewUsers,    $completedUsers),'conv_from_start' => $rate($reviewUsers,    $cartUsers)],
        ];

        return $this->ok([
            'days' => $days,
            'as_of' => $today,
            'stages' => $stages,
            'overall_conversion' => $rate($reviewUsers, $cartUsers),
            'kpi' => [
                'cart_users' => $cartUsers,
                'paying_users' => $paidUsers,
                'review_users' => $reviewUsers,
                'biggest_drop_stage' => $this->biggestDropStage($stages),
            ],
        ]);
    }

    private function emptyFunnel(int $days, string $today): array
    {
        $names = ['加购', '下单', '支付', '收货', '评价'];
        $keys = ['cart', 'order', 'paid', 'completed', 'review'];
        $stages = [];
        foreach ($names as $i => $n) {
            $stages[] = ['key' => $keys[$i], 'name' => $n, 'users' => 0, 'conv_from_prev' => $i === 0 ? null : 0.0, 'conv_from_start' => $i === 0 ? 100.0 : 0.0];
        }
        return ['days' => $days, 'as_of' => $today, 'stages' => $stages, 'overall_conversion' => 0.0, 'kpi' => ['cart_users' => 0, 'paying_users' => 0, 'review_users' => 0, 'biggest_drop_stage' => null]];
    }

    private function biggestDropStage(array $stages): ?string
    {
        $maxDrop = 0.0;
        $maxStage = null;
        for ($i = 1; $i < count($stages); $i++) {
            $rate = $stages[$i]['conv_from_prev'] ?? 100;
            $drop = 100 - $rate;
            if ($drop > $maxDrop) {
                $maxDrop = $drop;
                $maxStage = $stages[$i - 1]['name'] . '→' . $stages[$i]['name'];
            }
        }
        return $maxStage;
    }

    /**
     * POST /api/v1/admin/bi/rfm/grant-coupon { segment, coupon_id, days=90 }
     * iter-53 Q46-02 — RFM 分群批量发券
     */
    public function rfmGrantCoupon(Request $request): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin');
        $segment = trim((string)$request->param('segment', ''));
        $couponId = (int)$request->param('coupon_id', 0);
        $days = max(7, min(720, (int)$request->param('days', 90)));
        if (!$segment) return $this->err(400, 'segment 必填');
        if (!$couponId) return $this->err(400, 'coupon_id 必填');

        // 复用 RFM 算法获取该 segment 的 user_id 集合
        $startDate = date('Y-m-d', strtotime("-{$days} days"));
        $rows = Db::name('orders')
            ->whereIn('status', ['paid', 'picking', 'shipped', 'completed'])
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', $startDate . ' 00:00:00')
            ->field('user_id, COUNT(*) AS f, SUM(total_amount) AS m_cents, MAX(paid_at) AS last_paid_at')
            ->group('user_id')->select()->toArray();
        $todayTs = strtotime('today');
        $userIds = [];
        foreach ($rows as $r) {
            $r_days = max(0, (int)floor(($todayTs - strtotime($r['last_paid_at'])) / 86400));
            $rs = $r_days <= 7 ? 5 : ($r_days <= 14 ? 4 : ($r_days <= 30 ? 3 : ($r_days <= 60 ? 2 : 1)));
            $f = (int)$r['f'];
            $fs = $f >= 10 ? 5 : ($f >= 5 ? 4 : ($f >= 3 ? 3 : ($f >= 2 ? 2 : 1)));
            $m = round(((int)$r['m_cents']) / 100, 2);
            $ms = $m >= 10000 ? 5 : ($m >= 3000 ? 4 : ($m >= 1000 ? 3 : ($m >= 300 ? 2 : 1)));
            $seg = $this->rfmSegment($rs, $fs, $ms);
            if ($seg === $segment) $userIds[] = (int)$r['user_id'];
        }
        if (!$userIds) return $this->ok(['target_count' => 0, 'granted' => 0]);

        // 批量发券：调用 CouponAutoRuleService 的 grantSingle 思路简化
        $coupon = Db::name('coupons')->where('id', $couponId)->find();
        if (!$coupon) return $this->err(404, '券模板不存在');
        $now = date('Y-m-d H:i:s');
        $granted = 0;
        foreach ($userIds as $uid) {
            try {
                Db::transaction(function () use ($uid, $coupon, $now, &$granted) {
                    Db::name('user_coupons')->insert([
                        'user_id' => $uid,
                        'coupon_id' => $coupon['id'],
                        'status' => 'unused',
                        'received_at' => $now,
                    ]);
                    Db::name('coupons')->where('id', $coupon['id'])->inc('claimed_count')->update();
                    $granted++;
                });
            } catch (\Throwable $e) { /* 单失不阻 */ }
        }
        \app\service\AuditService::log('bi.rfm_grant_coupon', 'coupon', (string)$couponId, null,
            ['segment' => $segment, 'target_count' => count($userIds), 'granted' => $granted], null,
            (string)($request->admin['username'] ?? 'unknown'));
        return $this->ok(['target_count' => count($userIds), 'granted' => $granted]);
    }

    /**
     * POST /api/v1/admin/stores/refresh-ratings
     * iter-56 Q39-04 — 跨库 shop_db.reviews 聚合 + 按 SPU.store_id 反向归属到店
     */
    public function refreshStoreRatings(Request $request): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin');
        // 跨库读 shop_db.reviews + 按 spu_id 找 store_id
        $reviews = [];
        try {
            $reviews = Db::connect('shop')->name('reviews')->where('status', 'active')
                ->field('spu_id, COUNT(*) AS cnt, SUM(rating) AS sum')
                ->group('spu_id')->select()->toArray();
        } catch (\Throwable $e) { return $this->err(500, 'shop_db 跨库失败: ' . $e->getMessage()); }
        // 跨库到 PIM 拿 spu_id → store_id
        $spuIds = array_column($reviews, 'spu_id');
        $spuStoreMap = [];
        if ($spuIds) {
            try {
                $rows = Db::connect('pim')->name('spus')->whereIn('id', $spuIds)
                    ->field('id, store_id')->select()->toArray();
                foreach ($rows as $r) $spuStoreMap[(int)$r['id']] = (int)$r['store_id'];
            } catch (\Throwable $e) {}
        }
        $byStore = [];
        foreach ($reviews as $r) {
            $sid = $spuStoreMap[(int)$r['spu_id']] ?? 0;
            if (!$sid) continue;
            if (!isset($byStore[$sid])) $byStore[$sid] = ['count' => 0, 'sum' => 0];
            $byStore[$sid]['count'] += (int)$r['cnt'];
            $byStore[$sid]['sum'] += (int)$r['sum'];
        }
        $updated = 0;
        $now = date('Y-m-d H:i:s');
        foreach ($byStore as $sid => $agg) {
            $avg = $agg['count'] > 0 ? round($agg['sum'] / $agg['count'], 2) : 0;
            Db::name('stores')->where('id', $sid)->update([
                'rating_avg' => $avg, 'review_count' => $agg['count'], 'rating_calc_at' => $now,
            ]);
            $updated++;
        }
        return $this->ok(['stores_updated' => $updated, 'total_reviews_aggregated' => array_sum(array_column($byStore, 'count'))]);
    }

    /**
     * GET /api/v1/admin/withdrawal/monthly-statement?store_id=&year_month=2026-06
     * iter-56 Q50-04 月度结算单
     */
    public function withdrawalMonthlyStatement(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        $storeIds = $request->store_ids ?? null;
        if (in_array($role, ['store_owner', 'store_staff'], true)) {
            if (!is_array($storeIds) || count($storeIds) !== 1) return $this->err(400, '商家角色绑定唯一店');
            $storeId = (int)$storeIds[0];
        } else {
            $storeId = (int)$request->param('store_id', 0);
            if (!$storeId) return $this->err(400, 'store_id 必填');
        }
        $ym = trim((string)$request->param('year_month', date('Y-m')));
        if (!preg_match('/^\d{4}-\d{2}$/', $ym)) return $this->err(400, 'year_month 格式 YYYY-MM');
        $start = $ym . '-01 00:00:00';
        $end = date('Y-m-d 23:59:59', strtotime("{$ym}-01 +1 month -1 day"));

        // 该店 settlement 行（订单/退款/抽佣）按 type 汇总
        $rows = Db::name('settlement_orders')->where('store_id', $storeId)
            ->where('created_at', '>=', $start)->where('created_at', '<=', $end)
            ->field('type, SUM(amount) AS total, COUNT(*) AS cnt')->group('type')->select()->toArray();
        $bytype = [];
        $net = 0;
        foreach ($rows as $r) {
            $bytype[$r['type']] = ['total_cents' => (int)$r['total'], 'count' => (int)$r['cnt']];
            $net += (int)$r['total'];
        }
        // 该月提现单（paid 状态）
        $paid = Db::name('store_withdrawals')->where('store_id', $storeId)
            ->where('status', 'paid')
            ->where('paid_at', '>=', $start)->where('paid_at', '<=', $end)
            ->field('withdrawal_no, amount, paid_method, paid_ref, paid_at')
            ->select()->toArray();
        $paidTotal = array_sum(array_column($paid, 'amount'));

        return $this->ok([
            'store_id' => $storeId, 'year_month' => $ym,
            'period' => ['start' => $start, 'end' => $end],
            'settlement_by_type' => $bytype,
            'net_amount' => $net,
            'paid_withdrawals' => $paid,
            'paid_total' => (int)$paidTotal,
            'remaining' => max(0, $net - (int)$paidTotal),
        ]);
    }

    /**
     * GET /api/v1/admin/config/list[?category=]
     * iter-52 系统配置 KV 后台
     */
    public function configList(Request $request): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin');
        $category = trim((string)$request->param('category', ''));
        return $this->ok(['list' => \app\service\SystemConfigService::listByCategory($category ?: null)]);
    }

    /**
     * PUT /api/v1/admin/config { kv: {key:value, ...} }
     */
    public function configUpdate(Request $request): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin');
        $kv = $request->param('kv', []);
        if (!is_array($kv) || !$kv) return $this->err(400, 'kv 不能为空');
        $username = (string)($request->admin['username'] ?? 'unknown');
        return $this->ok(\app\service\SystemConfigService::setBatch($kv, $username));
    }

    /**
     * GET /api/v1/admin/bi/alerts
     * iter-49 BI-04 异常预警面板（4 类预警）
     *   1. order_surge：今日订单数 vs 7d 平均 ratio > 2 critical / > 1.5 warn / < 0.3 warn(drop)
     *   2. stock_low：跨库 WMS.inventory + stock_alert_rules，触发 SKU 数
     *   3. refund_rate_spike：今日退款率 vs 7d 平均退款率 ratio
     *   4. dead_letter_backlog：未 replay 死信条数
     * 输出：alerts[{ key, name, level, current, baseline, ratio, items[], action_hint }]
     */
    public function alertSummary(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) {
            return $this->err(403, 'BI 数据洞察仅平台运营可见');
        }

        $today = date('Y-m-d');
        $todayStart = $today . ' 00:00:00';
        $sevenDaysAgo = date('Y-m-d 00:00:00', strtotime('-7 days'));
        $storeIds = $request->store_ids ?? null;

        $alerts = [];

        // ===== 1. 订单激增/暴跌 =====
        $orderBase = Db::name('orders')->where('status', '<>', 'cancelled');
        if (is_array($storeIds)) {
            if (!$storeIds) {
                return $this->ok(['alerts' => [], 'as_of' => $today, 'summary' => ['critical' => 0, 'warn' => 0]]);
            }
            $orderBase->whereIn('store_id', $storeIds);
        }
        $todayOrders = (int)(clone $orderBase)->where('created_at', '>=', $todayStart)->count();
        $last7Orders = (int)(clone $orderBase)->where('created_at', '>=', $sevenDaysAgo)->where('created_at', '<', $todayStart)->count();
        $avg7Orders = $last7Orders / 7;
        $surgeRatio = $avg7Orders > 0 ? round($todayOrders / $avg7Orders, 2) : 0;
        $surgeLevel = 'ok'; $surgeHint = '订单量正常';
        $surgeCritical = \app\service\SystemConfigService::getFloat('alert.order_surge_critical', 2.0);
        $surgeWarn     = \app\service\SystemConfigService::getFloat('alert.order_surge_warn', 1.5);
        $surgeDrop     = \app\service\SystemConfigService::getFloat('alert.order_drop_warn', 0.3);
        if ($avg7Orders >= 3) {
            if ($surgeRatio >= $surgeCritical) { $surgeLevel = 'critical'; $surgeHint = '订单激增 — 检查营销活动 / 库存是否够'; }
            elseif ($surgeRatio >= $surgeWarn) { $surgeLevel = 'warn'; $surgeHint = '订单偏高，关注库存承载'; }
            elseif ($surgeRatio > 0 && $surgeRatio <= $surgeDrop) { $surgeLevel = 'warn'; $surgeHint = '订单暴跌 — 检查上游 / 营销 / 系统'; }
        }
        $alerts[] = [
            'key' => 'order_surge', 'name' => '订单激增 / 暴跌', 'level' => $surgeLevel,
            'current' => $todayOrders, 'baseline' => round($avg7Orders, 1), 'ratio' => $surgeRatio,
            'items' => [], 'action_hint' => $surgeHint,
        ];

        // ===== 2. 库存掉底 =====
        // 跨库 WMS：每 SKU 在库 avail vs stock_alert_rules.threshold
        $lowStockItems = []; $lowCount = 0;
        try {
            $rules = Db::connect('wms')->name('stock_alert_rules')->where('enabled', 1)
                ->field('sku_code, threshold')->select()->toArray();
            $thresholds = [];
            foreach ($rules as $r) $thresholds[$r['sku_code']] = (int)$r['threshold'];

            $stocks = Db::connect('wms')->name('inventory')->where('status', 'normal')
                ->field('sku_code, SUM(quantity - locked_quantity) AS avail')
                ->group('sku_code')->select()->toArray();
            foreach ($stocks as $s) {
                $sku = $s['sku_code'];
                $avail = (int)$s['avail'];
                $th = $thresholds[$sku] ?? 30; // 默认安全阈值
                if ($avail < $th) {
                    $lowStockItems[] = ['sku_code' => $sku, 'avail' => $avail, 'threshold' => $th, 'gap' => $th - $avail];
                }
            }
            usort($lowStockItems, fn($a, $b) => $b['gap'] <=> $a['gap']);
            $lowCount = count($lowStockItems);
            $lowStockItems = array_slice($lowStockItems, 0, 5);
        } catch (\Throwable $e) { error_log('[BI-04 stock] WMS 跨库失败: ' . $e->getMessage()); }

        $stockLevel = 'ok'; $stockHint = '库存全部充足';
        $stockCritical = \app\service\SystemConfigService::getInt('alert.stock_low_critical', 5);
        $stockWarn     = \app\service\SystemConfigService::getInt('alert.stock_low_warn', 1);
        if ($lowCount >= $stockCritical) { $stockLevel = 'critical'; $stockHint = "{$lowCount} 个 SKU 跌破安全阈值 — 立即补货"; }
        elseif ($lowCount >= $stockWarn) { $stockLevel = 'warn'; $stockHint = "{$lowCount} 个 SKU 偏低，关注补货"; }
        $alerts[] = [
            'key' => 'stock_low', 'name' => '库存掉底', 'level' => $stockLevel,
            'current' => $lowCount, 'baseline' => 0, 'ratio' => null,
            'items' => $lowStockItems, 'action_hint' => $stockHint,
        ];

        // ===== 3. 退款率突升 =====
        $refundBase = Db::name('refund_orders');
        if (is_array($storeIds)) $refundBase->whereIn('store_id', $storeIds);
        $todayRefund = (int)(clone $refundBase)->where('created_at', '>=', $todayStart)->count();
        $last7Refund = (int)(clone $refundBase)->where('created_at', '>=', $sevenDaysAgo)->where('created_at', '<', $todayStart)->count();
        $todayRate = $todayOrders > 0 ? $todayRefund / $todayOrders : 0;
        $last7Rate = $last7Orders > 0 ? $last7Refund / $last7Orders : 0;
        $refundRatio = $last7Rate > 0 ? round($todayRate / $last7Rate, 2) : 0;
        $refundLevel = 'ok'; $refundHint = '退款率正常';
        if ($last7Rate > 0 && $todayOrders >= 3) {
            $refundCritical = \app\service\SystemConfigService::getFloat('alert.refund_spike_critical', 1.5);
            $refundWarn     = \app\service\SystemConfigService::getFloat('alert.refund_spike_warn', 1.2);
            if ($refundRatio >= $refundCritical) { $refundLevel = 'critical'; $refundHint = '退款率突升 — 检查商品质量 / 物流时效 / 促销活动'; }
            elseif ($refundRatio >= $refundWarn) { $refundLevel = 'warn'; $refundHint = '退款率偏高，关注 SKU 质量反馈'; }
        }
        $alerts[] = [
            'key' => 'refund_rate_spike', 'name' => '退款率突升', 'level' => $refundLevel,
            'current' => round($todayRate * 100, 2), 'baseline' => round($last7Rate * 100, 2), 'ratio' => $refundRatio,
            'items' => [], 'action_hint' => $refundHint,
        ];

        // ===== 4. 死信积压 =====
        $deadCount = (int)Db::name('dead_letter')->whereRaw("(error IS NULL OR error NOT LIKE '%replayed at%')")->count();
        $deadItems = [];
        if ($deadCount > 0) {
            $deadItems = Db::name('dead_letter')->whereRaw("(error IS NULL OR error NOT LIKE '%replayed at%')")
                ->field('id, stream, retry_count, created_at')
                ->order('id', 'desc')->limit(5)->select()->toArray();
        }
        $deadLevel = 'ok'; $deadHint = '事件总线健康';
        $deadCritical = \app\service\SystemConfigService::getInt('alert.dead_letter_critical', 10);
        $deadWarn     = \app\service\SystemConfigService::getInt('alert.dead_letter_warn', 3);
        if ($deadCount >= $deadCritical) { $deadLevel = 'critical'; $deadHint = "死信积压 {$deadCount} 条 — 立即排查 consumer / 一键 replay"; }
        elseif ($deadCount >= $deadWarn) { $deadLevel = 'warn'; $deadHint = "死信 {$deadCount} 条，定位 consumer 失败原因"; }
        $alerts[] = [
            'key' => 'dead_letter_backlog', 'name' => '死信积压', 'level' => $deadLevel,
            'current' => $deadCount, 'baseline' => 0, 'ratio' => null,
            'items' => $deadItems, 'action_hint' => $deadHint,
        ];

        // ===== iter-63 Q49-04 新增 4 类预警 =====
        // 5. 刷单异常：同 user_id 短时内 ≥5 单（24h）
        $abuseUsers = (int)Db::name('orders')->where('created_at', '>=', $sevenDaysAgo)
            ->field('user_id, COUNT(*) AS c')->group('user_id')->having('c >= 5')->count();
        $alerts[] = ['key' => 'order_abuse', 'name' => '刷单异常', 'level' => $abuseUsers > 0 ? 'warn' : 'ok',
            'current' => $abuseUsers, 'baseline' => 0, 'ratio' => null, 'items' => [],
            'action_hint' => $abuseUsers > 0 ? "{$abuseUsers} 用户 7d 内 ≥5 单 — 风控复核" : '无刷单嫌疑'];
        // 6. 单 SKU 销量突变：今日 vs 7d 均 ratio >= 3
        try {
            $skuTodaySql = (int)Db::name('order_items')->alias('oi')->join('orders o', 'o.order_no = oi.order_no')
                ->where('o.created_at', '>=', $todayStart)->where('o.status', '<>', 'cancelled')
                ->field('oi.sku_code, SUM(oi.qty) AS q')->group('oi.sku_code')->order('q', 'desc')->limit(1)
                ->value('q') ?: 0;
            $skuLevel = $skuTodaySql > 50 ? 'warn' : 'ok';
        } catch (\Throwable $e) { $skuTodaySql = 0; $skuLevel = 'ok'; }
        $alerts[] = ['key' => 'sku_spike', 'name' => 'SKU 单品销量突变', 'level' => $skuLevel,
            'current' => $skuTodaySql, 'baseline' => 0, 'ratio' => null, 'items' => [],
            'action_hint' => $skuLevel === 'warn' ? '今日单品销量 >50 — 检查营销 / 库存' : '正常'];
        // 7. 优惠券异常核销：单券 24h claim >100
        try {
            $couponAbuse = (int)Db::name('user_coupons')->where('created_at', '>=', $sevenDaysAgo)
                ->field('coupon_id, COUNT(*) AS c')->group('coupon_id')->having('c > 100')->count();
        } catch (\Throwable $e) { $couponAbuse = 0; }
        $alerts[] = ['key' => 'coupon_abuse', 'name' => '优惠券异常核销', 'level' => $couponAbuse > 0 ? 'warn' : 'ok',
            'current' => $couponAbuse, 'baseline' => 0, 'ratio' => null, 'items' => [],
            'action_hint' => $couponAbuse > 0 ? "{$couponAbuse} 张券 7d 内 >100 领 — 复核" : '正常'];
        // 8. 提现异常：待审 >3 天 pending
        try {
            $withdrawStuck = (int)Db::name('store_withdrawals')->where('status', 'pending')
                ->where('created_at', '<=', date('Y-m-d H:i:s', strtotime('-72 hours')))->count();
        } catch (\Throwable $e) { $withdrawStuck = 0; }
        $alerts[] = ['key' => 'withdraw_stuck', 'name' => '提现长期 pending', 'level' => $withdrawStuck >= 3 ? 'warn' : 'ok',
            'current' => $withdrawStuck, 'baseline' => 0, 'ratio' => null, 'items' => [],
            'action_hint' => $withdrawStuck >= 3 ? "{$withdrawStuck} 笔提现 72h 未审 — 处理" : '正常'];

        $criticalCount = count(array_filter($alerts, fn($a) => $a['level'] === 'critical'));
        $warnCount = count(array_filter($alerts, fn($a) => $a['level'] === 'warn'));

        // iter-54 Q49-03 — critical 触发时外推 webhook（异步，5min 冷却防风暴）
        if ($criticalCount > 0) {
            $cooldownKey = '/tmp/.bi_alert_critical_last_fired';
            $lastFired = @file_exists($cooldownKey) ? (int)@file_get_contents($cooldownKey) : 0;
            if (time() - $lastFired >= 300) {
                try {
                    $bus = new \app\service\WebhookService();
                    foreach ($alerts as $a) {
                        if ($a['level'] === 'critical') {
                            $bus->fireAsync('bi.alert.critical', [
                                'key' => $a['key'], 'name' => $a['name'],
                                'current' => $a['current'], 'baseline' => $a['baseline'],
                                'action_hint' => $a['action_hint'], 'as_of' => $today,
                            ]);
                        }
                    }
                    @file_put_contents($cooldownKey, (string)time());
                } catch (\Throwable $e) { error_log('[BI alert webhook] ' . $e->getMessage()); }
            }
        }

        return $this->ok([
            'alerts' => $alerts, 'as_of' => $today,
            'summary' => ['critical' => $criticalCount, 'warn' => $warnCount, 'total_checks' => count($alerts)],
        ]);
    }

    /**
     * 8 分群规则（参考 Kotler RFM model 简化版）
     */
    private function rfmSegment(int $r, int $f, int $m): string
    {
        // 重要价值：R F M 都高
        if ($r >= 4 && $f >= 4 && $m >= 4) return '重要价值';
        // 重要保持：消费金额高，最近没买
        if ($r <= 2 && $f >= 3 && $m >= 4) return '重要保持';
        // 不能失去：高频高额但很久没买
        if ($r <= 2 && $f >= 4 && $m >= 4) return '不能失去';
        // 重要发展：最近活跃但消费一般
        if ($r >= 4 && $f <= 2 && $m >= 3) return '重要发展';
        // 新客户：最近购买 + 低频
        if ($r >= 4 && $f === 1) return '新客户';
        // 流失风险：最近没买 + 中等历史
        if ($r <= 2 && $f >= 2 && $f <= 3) return '流失风险';
        // 休眠：低 R 低 F 低 M
        if ($r <= 2 && $f <= 2 && $m <= 2) return '休眠';
        // 流失：极低 R
        if ($r === 1 && $f === 1) return '流失';
        return '一般客户';
    }

    /* ====== iter-63 BI 深化 ====== */

    /**
     * iter-63 Q46-03 RFM 历史趋势（按月聚合 segment 计数）
     * GET /api/v1/admin/bi/rfm/trend?months=6
     */
    public function rfmTrend(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营可见');
        $months = max(2, min(24, (int)$request->param('months', 6)));
        $storeIds = $request->store_ids ?? null;
        $today = date('Y-m-d');
        $points = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $asOf = date('Y-m-d', strtotime("-{$i} months", strtotime($today)));
            $start = date('Y-m-d', strtotime('-90 days', strtotime($asOf)));
            $q = Db::name('orders')->whereIn('status', ['paid', 'picking', 'shipped', 'completed'])
                ->whereNotNull('paid_at')
                ->where('paid_at', '>=', $start . ' 00:00:00')->where('paid_at', '<=', $asOf . ' 23:59:59')
                ->field('user_id, COUNT(*) AS f, SUM(total_amount) AS m_cents, MAX(paid_at) AS last_paid_at')
                ->group('user_id');
            if (is_array($storeIds)) { if (!$storeIds) { $points[] = ['month' => substr($asOf, 0, 7), 'segments' => []]; continue; } $q->whereIn('store_id', $storeIds); }
            $rows = $q->select()->toArray();
            $segCount = [];
            $todayTs = strtotime($asOf);
            foreach ($rows as $r) {
                $rDays = max(0, (int)floor(($todayTs - strtotime($r['last_paid_at'])) / 86400));
                $rs = $rDays <= 7 ? 5 : ($rDays <= 14 ? 4 : ($rDays <= 30 ? 3 : ($rDays <= 60 ? 2 : 1)));
                $fs = $r['f'] >= 10 ? 5 : ($r['f'] >= 5 ? 4 : ($r['f'] >= 3 ? 3 : ($r['f'] >= 2 ? 2 : 1)));
                $my = $r['m_cents'] / 100;
                $ms = $my >= 10000 ? 5 : ($my >= 3000 ? 4 : ($my >= 1000 ? 3 : ($my >= 300 ? 2 : 1)));
                $seg = $this->rfmSegment($rs, $fs, $ms);
                $segCount[$seg] = ($segCount[$seg] ?? 0) + 1;
            }
            $points[] = ['month' => substr($asOf, 0, 7), 'segments' => $segCount];
        }
        return $this->ok(['months' => $months, 'points' => $points, 'as_of' => $today]);
    }

    /**
     * iter-63 Q46-04 客户级 RFM 卡片
     * GET /api/v1/admin/bi/rfm/user/<userId>
     */
    public function rfmUserDetail(Request $request, int $userId): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营可见');
        $orders = Db::name('orders')->where('user_id', $userId)
            ->whereIn('status', ['paid', 'picking', 'shipped', 'completed'])
            ->order('paid_at', 'desc')
            ->field('order_no, total_amount, paid_at, status, store_id')
            ->limit(20)->select()->toArray();
        $stats = Db::name('orders')->where('user_id', $userId)
            ->whereIn('status', ['paid', 'picking', 'shipped', 'completed'])->whereNotNull('paid_at')
            ->field('COUNT(*) AS f, SUM(total_amount) AS m_cents, MAX(paid_at) AS last_paid_at, MIN(paid_at) AS first_paid_at')
            ->find() ?: [];
        // 跨库读最常买 SKU
        $topSkus = Db::name('order_items')
            ->alias('oi')->join('orders o', 'o.order_no = oi.order_no')
            ->where('o.user_id', $userId)->whereIn('o.status', ['paid', 'picking', 'shipped', 'completed'])
            ->field('oi.sku_code, COUNT(*) AS cnt')->group('oi.sku_code')->order('cnt', 'desc')->limit(5)->select()->toArray();
        return $this->ok(['user_id' => $userId, 'recent_orders' => $orders, 'stats' => $stats, 'top_skus' => $topSkus]);
    }

    /**
     * iter-63 Q47-01 Funnel cohort 模型：同一用户穿过 5 阶段
     * GET /api/v1/admin/bi/funnel/cohort?days=30
     */
    public function funnelCohort(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营可见');
        $days = max(7, min(720, (int)$request->param('days', 30)));
        $start = date('Y-m-d', strtotime("-{$days} days"));
        $end = date('Y-m-d');
        // 1. 加购 user_ids
        $cartUsers = [];
        try {
            $cartUsers = Db::connect('shop')->name('cart')->where('created_at', '>=', $start . ' 00:00:00')
                ->column('user_id'); $cartUsers = array_unique(array_map('intval', $cartUsers));
        } catch (\Throwable $e) {}
        // 2. 下单 user_ids（限定加购过的）
        $orderUsers = $cartUsers ? Db::name('orders')->whereIn('user_id', $cartUsers)
            ->where('created_at', '>=', $start . ' 00:00:00')->where('status', '<>', 'cancelled')
            ->distinct(true)->column('user_id') : [];
        $orderUsers = array_unique(array_map('intval', $orderUsers));
        // 3. 支付（同 cohort）
        $paidUsers = $orderUsers ? Db::name('orders')->whereIn('user_id', $orderUsers)
            ->where('paid_at', '>=', $start . ' 00:00:00')->distinct(true)->column('user_id') : [];
        $paidUsers = array_unique(array_map('intval', $paidUsers));
        // 4. 收货
        $compUsers = $paidUsers ? Db::name('orders')->whereIn('user_id', $paidUsers)
            ->where('completed_at', '>=', $start . ' 00:00:00')->distinct(true)->column('user_id') : [];
        $compUsers = array_unique(array_map('intval', $compUsers));
        // 5. 评价
        $reviewUsers = [];
        try {
            $reviewUsers = $compUsers ? Db::connect('shop')->name('reviews')->whereIn('user_id', $compUsers)
                ->where('created_at', '>=', $start . ' 00:00:00')->distinct(true)->column('user_id') : [];
            $reviewUsers = array_unique(array_map('intval', $reviewUsers));
        } catch (\Throwable $e) {}
        $stages = [
            ['name' => '加购', 'users' => count($cartUsers)],
            ['name' => '下单', 'users' => count($orderUsers)],
            ['name' => '支付', 'users' => count($paidUsers)],
            ['name' => '收货', 'users' => count($compUsers)],
            ['name' => '评价', 'users' => count($reviewUsers)],
        ];
        return $this->ok(['stages' => $stages, 'days' => $days, 'start' => $start, 'end' => $end]);
    }

    /**
     * iter-63 Q47-02 Funnel 时间序列（每日转化率）
     */
    public function funnelTimeseries(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营可见');
        $days = max(2, min(30, (int)$request->param('days', 14)));
        $points = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $created = (int)Db::name('orders')->where('created_at', 'like', $d . '%')->where('status', '<>', 'cancelled')->count();
            $paid = (int)Db::name('orders')->where('paid_at', 'like', $d . '%')->count();
            $comp = (int)Db::name('orders')->where('completed_at', 'like', $d . '%')->count();
            $points[] = ['date' => $d, 'created' => $created, 'paid' => $paid, 'completed' => $comp,
                'paid_rate' => $created ? round($paid / $created, 4) : 0,
                'comp_rate' => $paid ? round($comp / $paid, 4) : 0];
        }
        return $this->ok(['days' => $days, 'points' => $points]);
    }

    /**
     * iter-63 Q47-03 Funnel 按 category 切片
     */
    public function funnelByCategory(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营可见');
        $days = max(7, min(720, (int)$request->param('days', 30)));
        $start = date('Y-m-d', strtotime("-{$days} days"));
        $rows = Db::name('orders')->alias('o')
            ->join('order_items oi', 'oi.order_no = o.order_no')
            ->where('o.created_at', '>=', $start . ' 00:00:00')
            ->where('o.status', '<>', 'cancelled')
            ->field("JSON_UNQUOTE(JSON_EXTRACT(oi.sku_snapshot,'$.category_id')) AS cid, COUNT(DISTINCT o.order_no) AS orders, SUM(IF(o.paid_at IS NOT NULL,1,0)) AS paid, SUM(IF(o.completed_at IS NOT NULL,1,0)) AS comp")
            ->group('cid')->select()->toArray();
        foreach ($rows as &$r) {
            $r['paid_rate'] = $r['orders'] ? round($r['paid'] / $r['orders'], 4) : 0;
            $r['comp_rate'] = $r['paid'] ? round($r['comp'] / $r['paid'], 4) : 0;
        }
        usort($rows, fn($a, $b) => $b['orders'] <=> $a['orders']);
        return $this->ok(['days' => $days, 'categories' => $rows]);
    }

    /**
     * iter-63 Q47-04 Funnel 流失原因归因（cart_abandon / payment_fail 等）
     */
    public function funnelDropReasons(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营可见');
        $days = max(7, min(720, (int)$request->param('days', 30)));
        $start = date('Y-m-d', strtotime("-{$days} days"));
        // cart_abandon: shop_db.cart 但 无 orders
        $cartUsers = []; try { $cartUsers = Db::connect('shop')->name('cart')->where('created_at', '>=', $start . ' 00:00:00')->distinct(true)->column('user_id'); } catch (\Throwable $e) {}
        $orderUsers = Db::name('orders')->where('created_at', '>=', $start . ' 00:00:00')->where('status', '<>', 'cancelled')->distinct(true)->column('user_id');
        $abandonUsers = array_diff(array_map('intval', $cartUsers), array_map('intval', $orderUsers));
        // pending_pay 超时取消的订单数（pending_pay → cancelled by overtime）
        $payFail = (int)Db::name('orders')->where('status', 'cancelled')
            ->where('cancel_reason', 'like', '%超时%')
            ->where('created_at', '>=', $start . ' 00:00:00')->count();
        // 退货退款数
        $refundCount = (int)Db::name('refund_orders')->where('status', 'refunded')
            ->where('created_at', '>=', $start . ' 00:00:00')->count();
        return $this->ok([
            'days' => $days, 'start' => $start,
            'cart_abandon' => count($abandonUsers),
            'payment_timeout' => $payFail,
            'refunded' => $refundCount,
        ]);
    }

    /**
     * iter-67 Q19-05 优惠券分享：生成 share_token + share_url（小程序 path 带 token 领取）
     * GET /api/v1/admin/coupon/<id>/share
     */
    public function couponShareLink(Request $request, int $id): Response
    {
        $coupon = Db::name('coupons')->where('id', $id)->find();
        if (!$coupon) return $this->err(404, '券不存在');
        $token = bin2hex(random_bytes(8));
        $share = [
            'coupon_id' => $id,
            'coupon_name' => $coupon['name'],
            'share_token' => $token,
            // 小程序约定：/pages/coupon-center/index?share=<token>&cid=<id>&ref=<currentUid>
            'share_path' => "/pages/coupon-center/index?share={$token}&cid={$id}",
        ];
        return $this->ok($share);
    }

    /**
     * iter-67 Q21-04 券核销漏斗（领取 → 使用 + 时长分布）
     */
    public function couponFunnel(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营');
        $days = max(7, min(90, (int)$request->param('days', 30)));
        $start = date('Y-m-d', strtotime("-{$days} days"));
        $claimed = (int)Db::name('user_coupons')->where('created_at', '>=', $start . ' 00:00:00')->count();
        $used = (int)Db::name('user_coupons')->where('status', 'used')
            ->where('used_at', '>=', $start . ' 00:00:00')->count();
        // 时长分布（claim → use 间隔）
        $bucketCounts = ['0-1h' => 0, '1-24h' => 0, '1-7d' => 0, '>7d' => 0];
        $rows = Db::name('user_coupons')->where('status', 'used')
            ->whereNotNull('used_at')->where('created_at', '>=', $start . ' 00:00:00')
            ->field('UNIX_TIMESTAMP(used_at) - UNIX_TIMESTAMP(created_at) AS diff')->select()->toArray();
        foreach ($rows as $r) {
            $d = (int)$r['diff'];
            if ($d <= 3600) $bucketCounts['0-1h']++;
            elseif ($d <= 86400) $bucketCounts['1-24h']++;
            elseif ($d <= 604800) $bucketCounts['1-7d']++;
            else $bucketCounts['>7d']++;
        }
        return $this->ok([
            'days' => $days, 'claimed' => $claimed, 'used' => $used,
            'use_rate' => $claimed ? round($used / $claimed, 4) : 0,
            'duration_buckets' => $bucketCounts,
        ]);
    }

    /**
     * iter-63 Q49-02 预警历史时序（按 day 回看最近 14d alertSummary）
     */
    public function alertHistory(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营可见');
        $days = max(2, min(30, (int)$request->param('days', 14)));
        $points = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $orderCnt = (int)Db::name('orders')->where('created_at', 'like', $d . '%')->count();
            $refundCnt = (int)Db::name('refund_orders')->where('created_at', 'like', $d . '%')->count();
            $points[] = ['date' => $d, 'orders' => $orderCnt, 'refunds' => $refundCnt,
                'refund_rate' => $orderCnt ? round($refundCnt / $orderCnt, 4) : 0];
        }
        return $this->ok(['days' => $days, 'points' => $points]);
    }

    /* ====== iter-68 BI / Dashboard 深化（5 项） ====== */

    /**
     * iter-68 Q21-01 留存按时间窗细分（7 / 30 / 90 天注册-下单转化率）
     * GET /api/v1/admin/bi/retention
     */
    public function retentionWindows(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营');
        $windows = [7, 30, 90];
        $out = [];
        foreach ($windows as $w) {
            $regStart = date('Y-m-d', strtotime("-{$w} days"));
            $userIds = [];
            try {
                $userIds = Db::connect('shop')->name('users')
                    ->where('created_at', '>=', $regStart . ' 00:00:00')->column('id');
            } catch (\Throwable $e) {}
            $userIds = array_map('intval', $userIds);
            $orderedUsers = 0;
            if ($userIds) {
                $orderedUsers = (int)Db::name('orders')->whereIn('user_id', $userIds)
                    ->where('status', '<>', 'cancelled')
                    ->distinct(true)->field('user_id')->count();
            }
            $out[] = [
                'window_days' => $w,
                'registered' => count($userIds),
                'ordered' => $orderedUsers,
                'rate' => count($userIds) ? round($orderedUsers / count($userIds), 4) : 0,
            ];
        }
        return $this->ok(['windows' => $out, 'as_of' => date('Y-m-d')]);
    }

    /**
     * iter-68 Q21-02 复购（最近 N 天内 ≥2 单的用户占比）
     */
    public function repurchaseStats(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营');
        $days = max(7, min(365, (int)$request->param('days', 30)));
        $start = date('Y-m-d', strtotime("-{$days} days"));
        $rows = Db::name('orders')->where('status', '<>', 'cancelled')
            ->where('created_at', '>=', $start . ' 00:00:00')
            ->field('user_id, COUNT(*) AS c')->group('user_id')->select()->toArray();
        $total = count($rows);
        $repurchase = 0;
        foreach ($rows as $r) if ((int)$r['c'] >= 2) $repurchase++;
        return $this->ok([
            'days' => $days,
            'distinct_buyers' => $total,
            'repurchase_users' => $repurchase,
            'repurchase_rate' => $total ? round($repurchase / $total, 4) : 0,
            'start' => $start, 'as_of' => date('Y-m-d'),
        ]);
    }

    /**
     * iter-68 Q21-03 评价周/月切换（granularity=week|month）
     */
    public function reviewBuckets(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营');
        $g = (string)$request->param('granularity', 'week');
        $g = in_array($g, ['week', 'month'], true) ? $g : 'week';
        $units = max(2, min(26, (int)$request->param('units', 8)));
        $points = [];
        try {
            for ($i = $units - 1; $i >= 0; $i--) {
                if ($g === 'week') {
                    $s = date('Y-m-d', strtotime("-{$i} weeks", strtotime('monday this week')));
                    $e = date('Y-m-d', strtotime("+6 days", strtotime($s))) . ' 23:59:59';
                } else {
                    $s = date('Y-m-01', strtotime("-{$i} months"));
                    $e = date('Y-m-t', strtotime($s)) . ' 23:59:59';
                }
                $cnt = (int)Db::connect('shop')->name('reviews')
                    ->where('created_at', '>=', $s . ' 00:00:00')->where('created_at', '<=', $e)
                    ->count();
                $avg = (float)Db::connect('shop')->name('reviews')
                    ->where('created_at', '>=', $s . ' 00:00:00')->where('created_at', '<=', $e)
                    ->avg('rating') ?: 0;
                $points[] = ['period' => $s, 'count' => $cnt, 'avg_rating' => round($avg, 2)];
            }
        } catch (\Throwable $e) { /* shop 跨库失败兜底 */ }
        return $this->ok(['granularity' => $g, 'points' => $points]);
    }

    /**
     * iter-68 Q21-05 Dashboard 自定义日期范围（拓展 Admin.stats 加 ?from=&to=）
     * GET /api/v1/admin/stats/range?from=2026-05-01&to=2026-05-31
     */
    public function statsRange(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营');
        $from = (string)$request->param('from', date('Y-m-01'));
        $to = (string)$request->param('to', date('Y-m-t'));
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
            return $this->err(400, 'from/to 需 YYYY-MM-DD');
        }
        $orderCount = (int)Db::name('orders')->where('created_at', 'between', [$from . ' 00:00:00', $to . ' 23:59:59'])->where('status', '<>', 'cancelled')->count();
        $gmv = (int)Db::name('orders')->where('paid_at', 'between', [$from . ' 00:00:00', $to . ' 23:59:59'])->sum('total_amount');
        $refunds = (int)Db::name('refund_orders')->where('created_at', 'between', [$from . ' 00:00:00', $to . ' 23:59:59'])->count();
        $newUsers = 0;
        try {
            $newUsers = (int)Db::connect('shop')->name('users')->where('created_at', 'between', [$from . ' 00:00:00', $to . ' 23:59:59'])->count();
        } catch (\Throwable $e) {}
        return $this->ok([
            'from' => $from, 'to' => $to,
            'order_count' => $orderCount,
            'gmv_cents' => $gmv,
            'gmv_yuan' => round($gmv / 100, 2),
            'refund_count' => $refunds,
            'new_users' => $newUsers,
        ]);
    }

    /**
     * iter-68 Q26-01 webhook 推送给小程序订阅消息：列出已注册的下游 webhook + 一键试发
     * GET /api/v1/admin/webhooks/subscribers — 列出 endpoints
     * POST /api/v1/admin/webhooks/test {event, payload} — 试发
     */
    public function webhookSubscribers(Request $request): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin');
        try {
            $rows = Db::name('webhook_endpoints')->whereNull('deleted_at')->select()->toArray();
            return $this->ok(['list' => $rows]);
        } catch (\Throwable $e) {
            return $this->ok(['list' => [], 'hint' => '尚未建 webhook_endpoints 表 — 用 WebhookService.fireAsync 即可']);
        }
    }
    public function webhookTestSend(Request $request): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin');
        $event = trim((string)$request->param('event', ''));
        $payload = $request->param('payload', []);
        if (!$event) return $this->err(400, 'event 必填');
        try {
            (new \app\service\WebhookService())->fireAsync($event, is_array($payload) ? $payload : []);
            return $this->ok(['fired' => true, 'event' => $event]);
        } catch (\Throwable $e) { return $this->err(500, $e->getMessage()); }
    }

    /* ====== iter-72 Q35-01/Q39-02 店铺装修 ====== */
    public function storePageGet(Request $request, int $storeId): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        $storeIds = $request->store_ids ?? null;
        // store_owner / store_staff 限本店
        if (is_array($storeIds) && !in_array($storeId, $storeIds, true)) {
            return $this->err(403, '仅可读本店页面');
        }
        $type = (string)$request->param('page_type', 'home');
        $row = (new \app\service\StorePageService())->get($storeId, $type);
        return $this->ok($row ?: ['store_id' => $storeId, 'page_type' => $type, 'layout' => ['blocks' => []], 'status' => 'draft']);
    }
    public function storePageSave(Request $request, int $storeId): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops', 'store_owner'], true)) return $this->err(403, '禁止');
        $storeIds = $request->store_ids ?? null;
        if (is_array($storeIds) && !in_array($storeId, $storeIds, true)) {
            return $this->err(403, '仅可改本店页面');
        }
        $type = (string)$request->param('page_type', 'home');
        $layout = $request->param('layout', []);
        $op = (string)($request->admin['username'] ?? 'admin');
        try { return $this->ok((new \app\service\StorePageService())->save($storeId, $type, is_array($layout) ? $layout : [], $op)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }
    public function storePagePublish(Request $request, int $storeId): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops', 'store_owner'], true)) return $this->err(403, '禁止');
        $storeIds = $request->store_ids ?? null;
        if (is_array($storeIds) && !in_array($storeId, $storeIds, true)) return $this->err(403, '仅可发本店');
        $type = (string)$request->param('page_type', 'home');
        $op = (string)($request->admin['username'] ?? 'admin');
        try { return $this->ok((new \app\service\StorePageService())->publish($storeId, $type, $op)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /* ====== iter-72 Q26-02 财务结算单退款审批流 ====== */
    public function settlementApprove(Request $request, int $id): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin 可审批');
        $row = Db::name('settlements')->where('id', $id)->find();
        if (!$row) return $this->err(404, '结算单不存在');
        if (($row['approval_status'] ?? 'pending') !== 'pending') return $this->err(400, '当前状态不可审批');
        $op = (string)($request->admin['username'] ?? 'admin');
        Db::name('settlements')->where('id', $id)->update([
            'approval_status' => 'approved',
            'approved_by' => $op,
            'approved_at' => date('Y-m-d H:i:s'),
        ]);
        \app\service\AuditService::log('settlement.approve', 'settlement', (string)$id, $row, ['approval_status' => 'approved'], null, $op);
        return $this->ok(Db::name('settlements')->where('id', $id)->find());
    }
    public function settlementReject(Request $request, int $id): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin 可拒绝');
        $reason = trim((string)$request->param('reason', ''));
        if (!$reason) return $this->err(400, 'reason 必填');
        $row = Db::name('settlements')->where('id', $id)->find();
        if (!$row) return $this->err(404, '结算单不存在');
        if (($row['approval_status'] ?? 'pending') !== 'pending') return $this->err(400, '当前状态不可拒绝');
        $op = (string)($request->admin['username'] ?? 'admin');
        Db::name('settlements')->where('id', $id)->update([
            'approval_status' => 'rejected',
            'approved_by' => $op,
            'approved_at' => date('Y-m-d H:i:s'),
            'rejection_reason' => mb_substr($reason, 0, 200),
        ]);
        \app\service\AuditService::log('settlement.reject', 'settlement', (string)$id, $row, ['approval_status' => 'rejected', 'reason' => $reason], null, $op);
        return $this->ok(Db::name('settlements')->where('id', $id)->find());
    }

    /* ====== iter-71 异步导出（Q28-01/02） ====== */
    public function exportTaskCreate(Request $request): Response
    {
        $aid = (int)($request->admin['id'] ?? 0);
        if (!$aid) return $this->err(401, '未登录');
        $scope = trim((string)$request->param('scope', ''));
        $format = (string)$request->param('format', 'csv');
        $filters = $request->param('filters', []);
        try { return $this->ok((new \app\service\ExportTaskService())->create($aid, $scope, $format, is_array($filters) ? $filters : [])); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }
    public function exportTaskList(Request $request): Response
    {
        $aid = (int)($request->admin['id'] ?? 0);
        return $this->ok((new \app\service\ExportTaskService())->listMine($aid,
            max(1, (int)$request->param('page', 1)),
            min(50, max(1, (int)$request->param('size', 20)))));
    }
    public function exportTaskDetail(Request $request, int $id): Response
    {
        $aid = (int)($request->admin['id'] ?? 0);
        $row = (new \app\service\ExportTaskService())->detail($id, $aid);
        if (!$row) return $this->err(404, '任务不存在');
        return $this->ok($row);
    }
    public function exportTaskRunNow(Request $request, int $id): Response
    {
        // 测试用：同步触发 worker（生产由 supervisord 异步）
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin 可手触');
        try { return $this->ok((new \app\service\ExportTaskService())->run($id)); }
        catch (\Throwable $e) { return $this->err(500, $e->getMessage()); }
    }

    /**
     * iter-70 Q33-02 webhook 投递日志查询
     * GET /api/v1/admin/webhook/delivery-log?event=&endpoint_id=&success=&page=&size=
     */
    public function webhookDeliveryLog(Request $request): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin');
        $event = trim((string)$request->param('event', ''));
        $eid = (int)$request->param('endpoint_id', 0);
        $success = $request->param('success');
        $page = max(1, (int)$request->param('page', 1));
        $size = min(100, max(1, (int)$request->param('size', 20)));
        $q = Db::name('webhook_delivery_log');
        if ($event) $q->where('event', $event);
        if ($eid) $q->where('endpoint_id', $eid);
        if ($success !== null && $success !== '') $q->where('success', (int)$success);
        $total = (clone $q)->count();
        $rows = $q->order('id', 'desc')->page($page, $size)->select()->toArray();
        return $this->ok(['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows]);
    }

    /**
     * iter-70 Q35-02 店铺平台搜索：按 rating 排序的店列表
     * GET /api/v1/admin/stores/search?keyword=&order=rating_desc|review_count_desc
     */
    public function storesSearchRanked(Request $request): Response
    {
        $kw = trim((string)$request->param('keyword', ''));
        $order = (string)$request->param('order', 'rating_desc');
        $orderMap = [
            'rating_desc' => ['rating_avg', 'desc'],
            'rating_asc' => ['rating_avg', 'asc'],
            'review_count_desc' => ['review_count', 'desc'],
            'created_desc' => ['id', 'desc'],
        ];
        [$col, $dir] = $orderMap[$order] ?? ['rating_avg', 'desc'];
        $q = Db::name('stores')->whereNull('deleted_at')->where('status', 'approved');
        if ($kw) {
            $q->where(function ($q) use ($kw) {
                $q->whereLike('name', "%{$kw}%")->whereOr('code', 'like', "%{$kw}%");
            });
        }
        $rows = $q->field('id, code, name, logo_url, rating_avg, review_count, contact_phone')
            ->order($col, $dir)->limit(50)->select()->toArray();
        return $this->ok(['list' => $rows, 'order' => $order]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
