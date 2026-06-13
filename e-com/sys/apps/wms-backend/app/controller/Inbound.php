<?php
declare(strict_types=1);

namespace app\controller;

use app\service\EventBus;
use app\service\InventoryService;
use app\service\LocationRecommendService;
use think\Request;
use think\Response;
use think\facade\Db;

/**
 * 入库流程（简化版：一键完成替代 PDA 扫码 + 差异审批 + 上架）
 *   - create:    pending
 *   - autoComplete: pending → received，inventory +N（按 location 或默认 staging）
 *                   推 wms.inventory.changed 事件（M3 OMS 消费后 available +N）
 */
class Inbound
{
    private const DEFAULT_LOCATION_TYPE = 'staging';

    /**
     * iter-22 上架推荐 Top3
     *   POST /inbound/recommend-locations  body: {sku_code, qty, warehouse_code, top_n?}
     */
    public function recommendLocations(Request $request): Response
    {
        $sku = trim((string)$request->param('sku_code'));
        $qty = (int)$request->param('qty', 1);
        $wh = trim((string)$request->param('warehouse_code'));
        $topN = max(1, min(10, (int)$request->param('top_n', 3)));
        if (!$sku || !$wh) {
            return json(['code' => 400, 'msg' => 'sku_code 与 warehouse_code 必传', 'data' => null]);
        }
        $svc = new LocationRecommendService();
        $list = $svc->recommend($sku, $qty, $wh, $topN);
        return json(['code' => 0, 'msg' => 'ok', 'data' => $list]);
    }

    public function list(Request $request): Response
    {
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(100, (int)$request->param('size', 20)));
        $status = $request->param('status');
        $warehouse = $request->param('warehouse_code');

        $query = Db::name('inbound_orders');
        if ($status) $query->where('status', $status);
        if ($warehouse) $query->where('warehouse_code', $warehouse);
        $total = (clone $query)->count();
        $rows = $query->order('id', 'desc')->page($page, $size)->select()->toArray();
        return $this->ok(['list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size]);
    }

    public function detail(string $inboundNo): Response
    {
        $order = Db::name('inbound_orders')->where('inbound_no', $inboundNo)->find();
        if (!$order) return $this->err(404, '入库单不存在');
        $items = Db::name('inbound_items')->where('inbound_no', $inboundNo)->select()->toArray();

        // 附加商品名（来自 wms_products，PIM 同步而来）
        $skus = array_unique(array_column($items, 'sku_code'));
        $productMap = $skus
            ? Db::name('wms_products')->whereIn('sku_code', $skus)->column('spu_name,sku_name,main_image', 'sku_code')
            : [];
        foreach ($items as &$it) {
            $p = $productMap[$it['sku_code']] ?? null;
            $it['spu_name'] = $p['spu_name'] ?? '';
            $it['product_sku_name'] = $p['sku_name'] ?? '';
            $it['main_image'] = $p['main_image'] ?? '';
        }
        unset($it);

        return $this->ok(['order' => $order, 'items' => $items]);
    }

    /**
     * POST /api/v1/inbound
     * body: { warehouse_code, source_type?, items: [{sku_code, expected_qty, batch_no?}], remark? }
     */
    public function create(Request $request): Response
    {
        $idem = (string)$request->header('Idempotency-Key', '')
            ?: (string)($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '');
        if (!$idem) return $this->err(400, 'Idempotency-Key 必传');

        $exist = Db::name('inbound_orders')->where('idempotency_key', $idem)->find();
        if ($exist) {
            return $this->detail($exist['inbound_no']);
        }

        $warehouse = trim((string)$request->param('warehouse_code'));
        $sourceType = (string)$request->param('source_type', 'purchase');
        $refundNo = trim((string)$request->param('refund_no', ''));
        $items = $request->param('items', []);
        $remark = (string)$request->param('remark', '');

        if ($sourceType === 'return' && !$refundNo) {
            return $this->err(400, 'source_type=return 必须传 refund_no');
        }
        if (!$warehouse) return $this->err(400, 'warehouse_code 必传');
        if (!Db::name('warehouses')->where('warehouse_code', $warehouse)->find()) {
            return $this->err(400, 'warehouse_code 不存在');
        }
        if (!is_array($items) || !$items) return $this->err(400, 'items 不能为空');

        $inboundNo = 'IB' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);

        // iter-59 Q38-02：商家仓自动 needs_review=1
        $wh = Db::name('warehouses')->where('warehouse_code', $warehouse)->find();
        $needsReview = isset($wh['warehouse_type']) && $wh['warehouse_type'] === 'merchant' ? 1 : 0;

        Db::startTrans();
        try {
            Db::name('inbound_orders')->insert([
                'inbound_no' => $inboundNo,
                'warehouse_code' => $warehouse,
                'source_type' => $sourceType,
                'refund_no' => $refundNo ?: null,
                'status' => 'pending',
                'needs_review' => $needsReview,
                'remark' => $remark ?: null,
                'idempotency_key' => $idem,
            ]);
            $rows = [];
            foreach ($items as $it) {
                $sku = (string)($it['sku_code'] ?? '');
                $qty = (int)($it['expected_qty'] ?? 0);
                if (!$sku || $qty <= 0) {
                    throw new \RuntimeException('items 字段非法（sku_code / expected_qty）');
                }
                $rows[] = [
                    'inbound_no' => $inboundNo,
                    'sku_code' => $sku,
                    'expected_qty' => $qty,
                    'actual_qty' => 0,
                    'shelved_qty' => 0,
                    'batch_no' => (string)($it['batch_no'] ?? 'BATCH-' . date('Ymd')),
                ];
            }
            Db::name('inbound_items')->insertAll($rows);
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            return $this->err(500, $e->getMessage());
        }

        return $this->detail($inboundNo);
    }

    /**
     * POST /api/v1/inbound/:no/auto-complete
     * 简化：直接置 received + inventory +N（按指定 location 或默认 staging 库位）
     */
    /**
     * iter-59 Q38-02 — 商家仓入库审核
     * POST /api/v1/inbound/<no>/review
     */
    public function review(Request $request, string $inboundNo): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) return $this->err(403, '仅平台运营');
        $order = Db::name('inbound_orders')->where('inbound_no', $inboundNo)->find();
        if (!$order) return $this->err(404, '入库单不存在');
        if (empty($order['needs_review'])) return $this->err(409, '该单无需审核');
        if (!empty($order['reviewed_by'])) return $this->err(409, '已审核');
        Db::name('inbound_orders')->where('inbound_no', $inboundNo)->update([
            'reviewed_by' => (string)($request->admin['username'] ?? 'unknown'),
            'reviewed_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->ok(['inbound_no' => $inboundNo, 'reviewed' => true]);
    }

    public function autoComplete(Request $request, string $inboundNo): Response
    {
        $order = Db::name('inbound_orders')->where('inbound_no', $inboundNo)->find();
        if (!$order) return $this->err(404, '入库单不存在');
        if ($order['status'] !== 'pending') {
            return $this->err(409, '当前状态不支持一键完成: ' . $order['status']);
        }
        // iter-59 Q38-02：商家仓需先平台审核
        if (!empty($order['needs_review']) && empty($order['reviewed_by'])) {
            return $this->err(409, '商家仓入库需平台审核后才能完成');
        }
        $items = Db::name('inbound_items')->where('inbound_no', $inboundNo)->select()->toArray();
        if (!$items) return $this->err(409, '无入库明细');

        // 找一个该仓库的 staging 库位（兜底）
        $stagingLoc = Db::name('locations')
            ->where('warehouse_code', $order['warehouse_code'])
            ->where('location_type', self::DEFAULT_LOCATION_TYPE)
            ->where('status', 'available')
            ->find();

        // iter-25: 每个 item 优先用上架推荐 Top1；失败时回落 staging
        $recommendSvc = new LocationRecommendService();
        $invSvc = new InventoryService();
        $operator = $request->admin['username'] ?? 'system';

        Db::startTrans();
        try {
            foreach ($items as $it) {
                $sku = $it['sku_code'];
                $qty = (int)$it['expected_qty'];
                $batch = $it['batch_no'] ?: ('BATCH-' . date('Ymd'));

                // 1) 用户在 inbound_items.location_code 指定 → 直接用
                // 2) 上架推荐 Top1
                // 3) 回落 staging
                $loc = $it['location_code'] ?? null;
                if (!$loc) {
                    $top = $recommendSvc->recommend($sku, $qty, $order['warehouse_code'], 1);
                    if ($top) {
                        $loc = $top[0]['location_code'];
                    } elseif ($stagingLoc) {
                        $loc = $stagingLoc['location_code'];
                    } else {
                        throw new \RuntimeException("无可用库位（SKU {$sku}）");
                    }
                }

                // 更新 inbound_items
                Db::name('inbound_items')->where('id', $it['id'])->update([
                    'actual_qty' => $qty,
                    'shelved_qty' => $qty,
                    'location_code' => $loc,
                    'batch_no' => $batch,
                ]);

                // iter-24 P0-1: 走 InventoryService.inbound 写 log
                $invSvc->inbound($sku, $loc, $batch, $qty, $inboundNo, $operator);
            }
            Db::name('inbound_orders')->where('inbound_no', $inboundNo)->update([
                'status' => 'received',
                'received_at' => date('Y-m-d H:i:s'),
            ]);
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            return $this->err(500, $e->getMessage());
        }

        // 推 wms.inventory.changed 事件（OMS 消费后增加 available）
        $eventOk = false;
        $eventErr = null;
        try {
            $skuQtyMap = [];
            foreach ($items as $it) {
                $skuQtyMap[$it['sku_code']] = ($skuQtyMap[$it['sku_code']] ?? 0) + (int)$it['expected_qty'];
            }
            $payload = [];
            foreach ($skuQtyMap as $sku => $qty) {
                $payload[] = ['sku_code' => $sku, 'delta' => $qty];
            }
            $eventPayload = [
                'inbound_no' => $inboundNo,
                'warehouse_code' => $order['warehouse_code'],
                'items' => $payload,
            ];
            if (!empty($order['refund_no'])) {
                $eventPayload['refund_no'] = $order['refund_no'];
            }
            (new EventBus())->publish('wms.inventory.changed', $eventPayload);
            $eventOk = true;
        } catch (\Throwable $e) {
            $eventErr = $e->getMessage();
        }

        $detail = $this->detail($inboundNo);
        $data = json_decode($detail->getContent(), true)['data'] ?? [];
        $data['event_published'] = $eventOk;
        if ($eventErr) $data['event_error'] = $eventErr;
        return $this->ok($data);
    }

    public function cancel(Request $request, string $inboundNo): Response
    {
        $order = Db::name('inbound_orders')->where('inbound_no', $inboundNo)->find();
        if (!$order) return $this->err(404, '入库单不存在');
        if ($order['status'] !== 'pending') {
            return $this->err(409, '只有 pending 状态可取消');
        }
        Db::name('inbound_orders')->where('inbound_no', $inboundNo)->update(['status' => 'cancelled']);
        return $this->ok(['inbound_no' => $inboundNo, 'status' => 'cancelled']);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
