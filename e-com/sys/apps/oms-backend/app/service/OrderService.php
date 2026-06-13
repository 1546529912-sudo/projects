<?php
declare(strict_types=1);

namespace app\service;

use GuzzleHttp\Client;
use think\facade\Db;

class OrderService
{
    public function __construct(
        private InventoryService $inventory = new InventoryService(),
        private OrderStateMachine $sm = new OrderStateMachine(),
        private CouponService $coupons = new CouponService(),
    ) {}

    /**
     * 创建订单
     *   1. 幂等键查询（命中直接返回旧单）
     *   2. 调 PIM 批量取 SKU 详情（校验状态/价格快照）
     *   3. 库存预校验（available - buffer_qty >= qty）
     *   4. 事务：锁库存 + 写 orders + 写 order_items + 写 status_log
     *
     * @param array{user_id:int, items:array<int,array{sku_code:string,qty:int}>, address:array, remark?:string} $input
     */
    public function create(array $input, string $idempotencyKey, string $traceId = ''): array
    {
        if (empty($idempotencyKey)) {
            throw new \InvalidArgumentException('Idempotency-Key required');
        }

        $exist = Db::name('orders')->where('idempotency_key', $idempotencyKey)->find();
        if ($exist) {
            return $this->detail($exist['order_no']);
        }

        if (empty($input['items'])) {
            throw new \InvalidArgumentException('items 不能为空');
        }
        if (empty($input['address']) || !is_array($input['address'])) {
            throw new \InvalidArgumentException('address 不能为空');
        }

        $skus = array_column($input['items'], 'sku_code');
        $skuMap = $this->fetchSkusFromPim($skus, $traceId);

        // iter-37 BIZ-08-3: 跨库 PIM 拿每个 SKU 的 store_id（用于拆单 / 单店归属判断）
        try {
            $storeMap = Db::connect('pim')->name('skus')->whereIn('sku_code', $skus)
                ->whereNull('deleted_at')->column('store_id', 'sku_code');
            foreach ($storeMap as $code => $sid) {
                if (isset($skuMap[$code])) $skuMap[$code]['store_id'] = (int)$sid;
            }
        } catch (\Throwable $e) {
            // 跨库读失败 → 全归 store#1 平台店（兼容旧流程）
            foreach ($skuMap as $code => &$info) $info['store_id'] = $info['store_id'] ?? 1;
        }

        // 价格校验 + 快照构造
        $items = [];
        $goodsAmount = 0;
        $storeIdsInCart = []; // iter-37: 该购物车涉及的 store_id 集合
        foreach ($input['items'] as $row) {
            $sku = $row['sku_code'];
            $qty = (int)$row['qty'];
            if ($qty <= 0) throw new \InvalidArgumentException("qty 非法: {$sku}");
            if (empty($skuMap[$sku])) throw new \RuntimeException("SKU 不存在或下架: {$sku}");
            $skuInfo = $skuMap[$sku];
            if (($skuInfo['status'] ?? '') !== 'enabled') {
                throw new \RuntimeException("SKU 已下架: {$sku}");
            }
            $unitPrice = (int)$skuInfo['price'];
            $subtotal = $unitPrice * $qty;
            $goodsAmount += $subtotal;
            $sid = (int)($skuInfo['store_id'] ?? 1);
            $storeIdsInCart[$sid] = true;
            $items[] = [
                'sku_code' => $sku,
                'qty' => $qty,
                'unit_price' => $unitPrice,
                'subtotal' => $subtotal,
                'sku_snapshot' => $skuInfo,
                'store_id' => $sid,
            ];
        }

        // iter-37 BIZ-08-3 拆单决策；iter-61 Q37-02：KV 配置开关替代 env（在线可灰度）
        $distinctStores = array_keys($storeIdsInCart);
        if (count($distinctStores) > 1) {
            $cfg = new SystemConfigService();
            $splitOn = (bool)$cfg->getInt('oms.multi_store_split', 0);
            if (!$splitOn) {
                throw new \RuntimeException('购物车包含多店商品，请分批下单（系统配置 oms.multi_store_split=0）');
            }
            return $this->createSplitOrders(
                $input, $items, $idempotencyKey, $traceId, $distinctStores
            );
        }
        // 单店分支：记下 store_id（写入 orders 表）
        $orderStoreId = $distinctStores[0] ?? 1;

        $shortage = $this->inventory->precheck(array_map(
            fn($i) => ['sku_code' => $i['sku_code'], 'qty' => $i['qty']],
            $items
        ));
        if ($shortage) {
            throw new \RuntimeException('库存不足: ' . implode(',', $shortage));
        }

        $freight = 1000; // ¥10 固定
        $orderNo = $this->genOrderNo();
        // iter-27 Q19-03: 优先用 user_coupon_ids 数组，缺则回落老 user_coupon_id 单数
        $userCouponIds = [];
        if (!empty($input['user_coupon_ids']) && is_array($input['user_coupon_ids'])) {
            $userCouponIds = array_values(array_unique(array_map('intval', $input['user_coupon_ids'])));
        } elseif (!empty($input['user_coupon_id'])) {
            $userCouponIds = [(int)$input['user_coupon_id']];
        }
        // 构造 items 供 scope 校验（含 spu_id / category_id）
        $couponItems = array_map(fn($it) => [
            'sku_code' => $it['sku_code'],
            'spu_id' => (int)($it['sku_snapshot']['spu_id'] ?? 0),
            'category_id' => (int)($it['sku_snapshot']['category_id'] ?? 0),
        ], $items);

        Db::startTrans();
        try {
            // iter-19 + iter-27 Q19-03: 优惠券核销（在 tx 内，先 lock 再算）
            $discount = 0;
            if ($userCouponIds) {
                $bundles = [];
                foreach ($userCouponIds as $ucid) {
                    $uc = Db::name('user_coupons')->where('id', $ucid)->lock(true)->find();
                    if (!$uc) throw new \RuntimeException("优惠券 {$ucid} 不存在");
                    $cp = Db::name('coupons')->where('id', $uc['coupon_id'])->lock(true)->find();
                    if (!$cp) throw new \RuntimeException('优惠券模板已删除');
                    $bundles[] = ['user_coupon' => $uc, 'coupon' => $cp];
                }
                $discount = $this->coupons->applyMultipleInTransaction(
                    $bundles, $orderNo, (int)$goodsAmount, (int)$input['user_id'], $couponItems
                );
            }
            $totalAmount = $goodsAmount + $freight - $discount;

            Db::name('orders')->insert([
                'order_no' => $orderNo,
                'user_id' => (int)$input['user_id'],
                'store_id' => $orderStoreId, // iter-37 BIZ-08-3
                'status' => 'pending_pay',
                'total_amount' => $totalAmount,
                'goods_amount' => $goodsAmount,
                'freight' => $freight,
                'discount' => $discount,
                'address' => json_encode($input['address'], JSON_UNESCAPED_UNICODE),
                'remark' => $input['remark'] ?? null,
                'idempotency_key' => $idempotencyKey,
                'trace_id' => $traceId ?: null,
            ]);

            $insertRows = [];
            foreach ($items as $it) {
                $insertRows[] = [
                    'order_no' => $orderNo,
                    'sku_code' => $it['sku_code'],
                    'sku_snapshot' => json_encode($it['sku_snapshot'], JSON_UNESCAPED_UNICODE),
                    'qty' => $it['qty'],
                    'unit_price' => $it['unit_price'],
                    'subtotal' => $it['subtotal'],
                ];
            }
            Db::name('order_items')->insertAll($insertRows);

            Db::name('order_status_log')->insert([
                'order_no' => $orderNo,
                'from_status' => '',
                'to_status' => 'pending_pay',
                'operator' => 'user:' . $input['user_id'],
                'source' => 'create',
            ]);

            $this->inventory->lockBatch(
                array_map(fn($i) => ['sku_code' => $i['sku_code'], 'qty' => $i['qty']], $items),
                $orderNo
            );

            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }

        return $this->detail($orderNo);
    }

    public function detail(string $orderNo): array
    {
        $order = Db::name('orders')->where('order_no', $orderNo)->find();
        if (!$order) throw new \RuntimeException("订单不存在: {$orderNo}");
        $items = Db::name('order_items')->where('order_no', $orderNo)->select()->toArray();
        $order['address'] = json_decode($order['address'] ?? '[]', true);
        foreach ($items as &$it) {
            $it['sku_snapshot'] = json_decode($it['sku_snapshot'] ?? '[]', true);
        }
        return ['order' => $order, 'items' => $items];
    }

    public function listByUser(int $userId, ?string $status = null, int $page = 1, int $size = 20): array
    {
        $query = Db::name('orders')->where('user_id', $userId);
        if ($status) $query->where('status', $status);
        $total = (clone $query)->count();
        $rows = $query->order('id', 'desc')
            ->page($page, $size)
            ->select()->toArray();
        foreach ($rows as &$r) {
            $r['address'] = json_decode($r['address'] ?? '[]', true);
        }
        return ['list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size];
    }

    /**
     * 支付回调（mock）：状态 pending_pay → paid，写本地拣货单 + XADD oms.order.paid
     * 不再同步调 WMS HTTP；WMS 异步消费者收到事件后创建出库单
     */
    public function markPaid(string $orderNo, string $source = 'mock'): array
    {
        $pickingNo = '';
        Db::startTrans();
        try {
            $this->sm->transit($orderNo, 'paid', 'payment', $source, '支付回调');
            $pickingNo = $this->createPickingOrder($orderNo, 'pending');
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }

        if ($pickingNo) {
            $this->publishOrderPaid($orderNo, $pickingNo);
        }

        return $this->detail($orderNo);
    }

    /**
     * iter-37 BIZ-08-3 父单整付：找所有 parent_order_no=PO 的子单各 markPaid
     */
    public function markPaidByParent(string $parentNo, string $source = 'mock'): array
    {
        $subs = Db::name('orders')->where('parent_order_no', $parentNo)->select()->toArray();
        if (!$subs) throw new \RuntimeException("父单 {$parentNo} 没有关联子单");
        $results = [];
        foreach ($subs as $sub) {
            if ($sub['status'] === 'paid') { $results[] = $this->detail($sub['order_no']); continue; }
            try {
                $results[] = $this->markPaid($sub['order_no'], $source);
            } catch (\Throwable $e) {
                error_log("[markPaidByParent] sub={$sub['order_no']} 失败: " . $e->getMessage());
            }
        }
        return ['parent_order_no' => $parentNo, 'sub_count' => count($results), 'sub_orders' => $results];
    }

    /**
     * 接收 WMS 出库回传：paid → picking → shipped + outbound 实物库存扣减
     */
    public function markShipped(string $orderNo, string $expressNo, array $items): array
    {
        Db::startTrans();
        try {
            $this->sm->transit($orderNo, 'picking', 'wms', 'wms-callback', 'WMS 开始拣货');
            $this->sm->transit($orderNo, 'shipped', 'wms', 'wms-callback', 'WMS 出库');
            Db::name('orders')->where('order_no', $orderNo)->update(['express_no' => $expressNo]);
            $this->inventory->outboundBatch(
                array_map(fn($it) => ['sku_code' => $it['sku_code'], 'qty' => (int)$it['qty']], $items),
                $orderNo
            );
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
        return $this->detail($orderNo);
    }

    public function cancel(string $orderNo, int $userId, string $reason = '用户取消'): array
    {
        $order = Db::name('orders')->where('order_no', $orderNo)->find();
        if (!$order) throw new \RuntimeException('订单不存在');
        if ((int)$order['user_id'] !== $userId) throw new \RuntimeException('非本人订单');
        if ($order['status'] !== 'pending_pay') {
            throw new \RuntimeException('订单当前状态不可取消: ' . $order['status']);
        }

        Db::startTrans();
        try {
            $this->sm->transit($orderNo, 'cancelled', 'user:' . $userId, 'user', $reason);
            Db::name('orders')->where('order_no', $orderNo)->update(['cancel_reason' => $reason]);
            $items = Db::name('order_items')->where('order_no', $orderNo)->select()->toArray();
            $this->inventory->unlockBatch(
                array_map(fn($i) => ['sku_code' => $i['sku_code'], 'qty' => $i['qty']], $items),
                $orderNo
            );
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
        // iter-26 P0-1: 推 oms.order.cancelled
        $this->publishOrderCancelled($orderNo, (int)$order['user_id'], $reason);
        // iter-28 A1: webhook 推送
        try {
            (new WebhookService())->fireAsync('order.cancelled', [
                'order_no' => $orderNo,
                'user_id' => (int)$order['user_id'],
                'reason' => $reason,
                'cancelled_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) { /* webhook 失败不阻塞 */ }
        return $this->detail($orderNo);
    }

    public function confirm(string $orderNo, int $userId): array
    {
        $order = Db::name('orders')->where('order_no', $orderNo)->find();
        if (!$order) throw new \RuntimeException('订单不存在');
        if ((int)$order['user_id'] !== $userId) throw new \RuntimeException('非本人订单');
        if ($order['status'] !== 'shipped') {
            throw new \RuntimeException('订单不在待收货状态');
        }
        $this->sm->transit($orderNo, 'completed', 'user:' . $userId, 'user', '确认收货');
        // iter-26 P0-3: 落财务结算单
        try {
            (new SettlementService())->recordOrderSettlement($orderNo);
        } catch (\Throwable $e) {
            // 财务落单失败不阻塞主流程
        }
        // iter-28 A1: webhook 推送
        try {
            (new WebhookService())->fireAsync('order.completed', [
                'order_no' => $orderNo,
                'user_id' => $userId,
                'completed_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) { /* webhook 失败不阻塞 */ }
        return $this->detail($orderNo);
    }

    /**
     * iter-26 P0-1: 推 oms.order.cancelled（仅 audit 用，WMS 端 handler 写 oms_event_audit_log）
     */
    private function publishOrderCancelled(string $orderNo, int $userId, string $reason): void
    {
        try {
            (new EventBus())->publish('oms.order.cancelled', [
                'order_no' => $orderNo,
                'user_id' => $userId,
                'reason' => $reason,
                'cancelled_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) { /* 推送失败不阻塞 */ }
    }

    /** 写一条拣货单，返回 picking_no */
    private function createPickingOrder(string $orderNo, string $status = 'sent'): string
    {
        $pickingNo = 'PK' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);
        Db::name('picking_orders')->insert([
            'picking_no' => $pickingNo,
            'order_no' => $orderNo,
            'warehouse_code' => 'WH-DEFAULT',
            'status' => $status,
        ]);
        return $pickingNo;
    }

    /**
     * 推 oms.order.paid 事件给 WMS 消费
     * Stream 推送失败时把 picking_orders.status 改为 failed 但订单仍 paid（不回滚）
     */
    private function publishOrderPaid(string $orderNo, string $pickingNo): void
    {
        $detail = $this->detail($orderNo);
        $items = array_map(
            fn($it) => ['sku_code' => $it['sku_code'], 'qty' => (int)$it['qty']],
            $detail['items']
        );
        $payload = [
            'order_no' => $orderNo,
            'picking_no' => $pickingNo,
            'warehouse_code' => 'WH-DEFAULT',
            'items' => $items,
            'address' => $detail['order']['address'] ?? [],
        ];
        try {
            $bus = new EventBus();
            $bus->publish('oms.order.paid', $payload);
        } catch (\Throwable $e) {
            Db::name('picking_orders')->where('picking_no', $pickingNo)->update([
                'status' => 'failed',
                'last_error' => substr('publish 失败: ' . $e->getMessage(), 0, 500),
            ]);
        }
    }

    private function genOrderNo(): string
    {
        return 'SO' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);
    }

    /**
     * 调 PIM 批量取 SKU 详情
     * @return array<string, array> sku_code => sku info
     */
    /**
     * iter-37 BIZ-08-3 拆单分支：多店购物车 → 每店一单
     *   - 父单号 (PO 前缀) 仅作逻辑容器（不入 orders 表）
     *   - 每子单：store_id=对应店 + parent_order_no=父号
     *   - 优惠券：v1 拆单时**不支持**（多店分摊太复杂），caller 已拒绝多店带券
     *   - 库存：每子单独立 lockBatch
     *   - 返回：{parent_order_no, sub_orders: [{order, items}, ...], total_amount}
     */
    private function createSplitOrders(array $input, array $items, string $idempotencyKey, string $traceId, array $stores): array
    {
        $parentNo = 'PO' . date('YmdHis') . random_int(1000, 9999);
        $freight = 1000;

        // 按 store_id 分组 items
        $byStore = [];
        foreach ($items as $it) {
            $byStore[$it['store_id']][] = $it;
        }
        $totalGoods = array_sum(array_column($items, 'subtotal'));

        // iter-61 Q37-01 + Q35-04：跨店满减券按 goods_amount 比例分摊
        $userCouponIds = [];
        if (!empty($input['user_coupon_ids']) && is_array($input['user_coupon_ids'])) {
            $userCouponIds = array_values(array_unique(array_map('intval', $input['user_coupon_ids'])));
        } elseif (!empty($input['user_coupon_id'])) {
            $userCouponIds = [(int)$input['user_coupon_id']];
        }
        $couponItems = array_map(fn($it) => [
            'sku_code' => $it['sku_code'],
            'spu_id' => (int)($it['sku_snapshot']['spu_id'] ?? 0),
            'category_id' => (int)($it['sku_snapshot']['category_id'] ?? 0),
        ], $items);

        $subOrders = []; $totalAmount = 0;
        Db::startTrans();
        try {
            // iter-61 Q35-04：父订单维度核销券（按全车 goods_amount 算满减），返回总折扣
            $totalDiscount = 0;
            if ($userCouponIds) {
                $bundles = [];
                foreach ($userCouponIds as $ucid) {
                    $uc = Db::name('user_coupons')->where('id', $ucid)->lock(true)->find();
                    if (!$uc) throw new \RuntimeException("优惠券 {$ucid} 不存在");
                    $cp = Db::name('coupons')->where('id', $uc['coupon_id'])->lock(true)->find();
                    if (!$cp) throw new \RuntimeException('优惠券模板已删除');
                    $bundles[] = ['user_coupon' => $uc, 'coupon' => $cp];
                }
                $totalDiscount = $this->coupons->applyMultipleInTransaction(
                    $bundles, $parentNo, (int)$totalGoods, (int)$input['user_id'], $couponItems
                );
            }

            // iter-61 Q37-01：按比例分摊（最大店给余数兜底）
            $storeKeys = array_keys($byStore);
            $allocated = [];
            $sum = 0;
            $maxStore = $storeKeys[0]; $maxGoods = 0;
            foreach ($byStore as $sid => $storeItems) {
                $g = (int)array_sum(array_column($storeItems, 'subtotal'));
                if ($g > $maxGoods) { $maxGoods = $g; $maxStore = $sid; }
                $d = $totalGoods > 0 ? (int)floor($totalDiscount * $g / $totalGoods) : 0;
                $allocated[$sid] = $d; $sum += $d;
            }
            $allocated[$maxStore] += ($totalDiscount - $sum); // 余数给最大子单

            foreach ($byStore as $sid => $storeItems) {
                $goods = (int)array_sum(array_column($storeItems, 'subtotal'));
                $sd = (int)($allocated[$sid] ?? 0);
                $subTotal = $goods + $freight - $sd;
                $subOrderNo = $this->genOrderNo();

                Db::name('orders')->insert([
                    'order_no' => $subOrderNo,
                    'user_id' => (int)$input['user_id'],
                    'store_id' => (int)$sid,
                    'parent_order_no' => $parentNo,
                    'status' => 'pending_pay',
                    'total_amount' => $subTotal,
                    'goods_amount' => $goods,
                    'freight' => $freight,
                    'discount' => $sd,
                    'address' => json_encode($input['address'], JSON_UNESCAPED_UNICODE),
                    'remark' => $input['remark'] ?? null,
                    'idempotency_key' => $idempotencyKey . ':' . $sid,
                    'trace_id' => $traceId ?: null,
                ]);

                $rows = [];
                foreach ($storeItems as $it) {
                    $rows[] = [
                        'order_no' => $subOrderNo,
                        'sku_code' => $it['sku_code'],
                        'sku_snapshot' => json_encode($it['sku_snapshot'], JSON_UNESCAPED_UNICODE),
                        'qty' => $it['qty'],
                        'unit_price' => $it['unit_price'],
                        'subtotal' => $it['subtotal'],
                    ];
                }
                Db::name('order_items')->insertAll($rows);

                Db::name('order_status_log')->insert([
                    'order_no' => $subOrderNo,
                    'from_status' => '',
                    'to_status' => 'pending_pay',
                    'operator' => 'user:' . $input['user_id'],
                    'source' => 'create-split',
                ]);

                $this->inventory->lockBatch(
                    array_map(fn($i) => ['sku_code' => $i['sku_code'], 'qty' => $i['qty']], $storeItems),
                    $subOrderNo
                );

                $subOrders[] = $this->detail($subOrderNo);
                $totalAmount += $subTotal;
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
        return [
            'parent_order_no' => $parentNo,
            'sub_orders' => $subOrders,
            'total_amount' => $totalAmount,
            'sub_count' => count($subOrders),
        ];
    }

    private function fetchSkusFromPim(array $skus, string $traceId = ''): array
    {
        $pimUrl = env('PIM_BACKEND_URL', 'http://pim-backend');
        $client = new Client(['timeout' => 3.0]);
        try {
            $resp = $client->post($pimUrl . '/api/v1/sku/batch', [
                'json' => ['sku_codes' => $skus],
                'headers' => ['X-Trace-Id' => $traceId],
            ]);
            $body = json_decode((string)$resp->getBody(), true);
            $data = $body['data'] ?? [];
            $map = [];
            foreach ($data as $row) {
                $map[$row['sku_code']] = $row;
            }
            return $map;
        } catch (\Throwable $e) {
            throw new \RuntimeException('PIM 服务不可用: ' . $e->getMessage());
        }
    }
}
