<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 退款业务逻辑
 *
 * 5 个操作：
 *   - apply()              用户申请退款（创建 pending_approve）
 *   - approve()            运营审批通过（→ approved；return_refund 时 reserve 库存）
 *   - reject()             运营拒绝（→ rejected）
 *   - markReceivedBack()   WMS 收到退货（→ received_back；receive_back 库存）
 *   - refund()             确认退款（→ refunded；refund_only 时 unlock 库存）
 *
 * 库存动作：
 *   - refund_only:    apply 不动；approve 不动；refund 时 unlockBatch（推回 available）
 *   - return_refund:  apply 不动；approve 时 reserveBatch；markReceivedBack 时 receiveBackBatch；refund 不动
 */
class RefundService
{
    public function __construct(private InventoryService $inventory = new InventoryService()) {}

    /**
     * 用户申请退款
     */
    public function apply(string $orderNo, int $userId, string $type, array $items, string $reason, int $amount, array $evidenceImages = []): array
    {
        if (!in_array($type, ['refund_only', 'return_refund'], true)) {
            throw new \RuntimeException('type 非法');
        }
        if (!$items) throw new \RuntimeException('items 不能为空');
        if ($amount <= 0) throw new \RuntimeException('amount 必须大于 0');

        $order = Db::name('orders')->where('order_no', $orderNo)->find();
        if (!$order) throw new \RuntimeException('订单不存在');
        if ((int)$order['user_id'] !== $userId) throw new \RuntimeException('订单不属于该用户');

        // 业务校验
        if ($type === 'refund_only') {
            if (!in_array($order['status'], ['paid', 'picking'], true)) {
                throw new \RuntimeException("当前订单状态 {$order['status']} 不支持仅退款");
            }
        } else { // return_refund
            if (!in_array($order['status'], ['shipped', 'completed'], true)) {
                throw new \RuntimeException("当前订单状态 {$order['status']} 不支持退货退款");
            }
        }
        if ($amount > (int)$order['total_amount']) {
            throw new \RuntimeException('退款金额不能大于订单金额');
        }

        // 校验 items qty 不超过订单未退数量
        $this->validateItemsQty($orderNo, $items);

        $refundNo = 'RF' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);

        Db::startTrans();
        try {
            $cleanImages = array_values(array_filter(array_slice($evidenceImages, 0, 5), fn($u) => is_string($u) && $u !== ''));
            // iter-37: 继承 order.store_id
            $orderStoreId = (int)(Db::name('orders')->where('order_no', $orderNo)->value('store_id') ?: 1);
            \app\model\Refund::query()->insert([
                'refund_no' => $refundNo,
                'order_no' => $orderNo,
                'user_id' => $userId,
                'store_id' => $orderStoreId,
                'type' => $type,
                'status' => 'pending_approve',
                'reason' => $reason ?: '-',
                'evidence_images' => $cleanImages ? json_encode($cleanImages, JSON_UNESCAPED_UNICODE) : null,
                'amount' => $amount,
            ]);
            $rows = [];
            foreach ($items as $it) {
                $sku = (string)$it['sku_code'];
                $qty = (int)$it['qty'];
                if (!$sku || $qty <= 0) continue;

                $snapshot = Db::name('order_items')
                    ->where('order_no', $orderNo)
                    ->where('sku_code', $sku)
                    ->find();
                $rows[] = [
                    'refund_no' => $refundNo,
                    'order_no' => $orderNo,
                    'sku_code' => $sku,
                    'qty' => $qty,
                    'sku_snapshot' => json_encode($snapshot ?: [], JSON_UNESCAPED_UNICODE),
                ];
            }
            Db::name('refund_items')->insertAll($rows);
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }

        return $this->detail($refundNo);
    }

    /**
     * 运营审批通过
     *
     * iter-43 EFF-03 审批流：
     *   - amount >= ENV OMS_REFUND_REVIEW_THRESHOLD_CENTS（默认 100000=¥1000）且 role!=super_admin
     *     → 标 needs_second_review=1，记 first_approved_by/at，status 仍 pending_approve
     *   - 二审单（needs_second_review=1）必须 super_admin 才能再次 approve → 进入 approved
     */
    public function approve(string $refundNo, string $operator, string $role = '', ?string $secondReviewNote = null): array
    {
        $refund = $this->mustFind($refundNo);
        $this->checkTransit($refund, 'approved');

        // iter-52 Q43-01：阈值改 KV 配置（默认 ¥500）
        $thresholdYuan = \app\service\SystemConfigService::getFloat('refund_threshold.amount_yuan', 500.0);
        $threshold = (int)round($thresholdYuan * 100);
        $needsTwo  = (int)($refund['needs_second_review'] ?? 0) === 1;

        // 已标记二审 → 必须 super_admin 二审通过
        if ($needsTwo) {
            if ($role !== 'super_admin') {
                throw new \RuntimeException('该退款单需 super_admin 二审通过');
            }
        } else {
            // 首次进入：金额超阈值 + 非 super_admin → 转二审
            if ((int)$refund['amount'] >= $threshold && $role !== 'super_admin') {
                \app\model\Refund::query()->where('refund_no', $refundNo)->update([
                    'needs_second_review' => 1,
                    'first_approved_by' => $operator,
                    'first_approved_at' => date('Y-m-d H:i:s'),
                ]);
                return $this->detail($refundNo);
            }
        }

        Db::startTrans();
        try {
            $upd = [
                'status' => 'approved',
                'approved_at' => date('Y-m-d H:i:s'),
                'approved_by' => $operator,
            ];
            // iter-64 Q43-02 二审备注
            if ($needsTwo && $secondReviewNote !== null && $secondReviewNote !== '') {
                $upd['second_review_note'] = mb_substr($secondReviewNote, 0, 200);
            }
            \app\model\Refund::query()->where('refund_no', $refundNo)->update($upd);

            // return_refund: 审批通过 → reserve（货物运回中）
            if ($refund['type'] === 'return_refund') {
                $items = $this->loadItems($refundNo);
                $this->inventory->reserveBatch($items, $refundNo);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }

        // iter-26 P0-1: 推 oms.refund.approved
        $this->publishRefundEvent('oms.refund.approved', $refund, ['operator' => $operator]);

        // refund_only: 审批通过即退款，自动推进
        if ($refund['type'] === 'refund_only') {
            $this->refund($refundNo, $operator);
        }
        return $this->detail($refundNo);
    }

    /**
     * 运营拒绝
     */
    public function reject(string $refundNo, string $operator, string $reason): array
    {
        $refund = $this->mustFind($refundNo);
        $this->checkTransit($refund, 'rejected');

        \app\model\Refund::query()->where('refund_no', $refundNo)->update([
            'status' => 'rejected',
            'rejected_at' => date('Y-m-d H:i:s'),
            'reject_reason' => $reason ?: '-',
            'approved_by' => $operator,
        ]);
        return $this->detail($refundNo);
    }

    /**
     * WMS 收到退货（事件触发）
     */
    public function markReceivedBack(string $refundNo): array
    {
        $refund = $this->mustFind($refundNo);
        // 幂等：已 received_back 或 refunded 跳过
        if (in_array($refund['status'], ['received_back', 'refunded'], true)) {
            return $this->detail($refundNo);
        }
        $this->checkTransit($refund, 'received_back');

        Db::startTrans();
        try {
            \app\model\Refund::query()->where('refund_no', $refundNo)->update([
                'status' => 'received_back',
                'received_back_at' => date('Y-m-d H:i:s'),
            ]);
            $items = $this->loadItems($refundNo);
            $this->inventory->receiveBackBatch($items, $refundNo);
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
        return $this->detail($refundNo);
    }

    /**
     * 确认退款（运营 或 refund_only 自动）
     */
    public function refund(string $refundNo, string $operator): array
    {
        $refund = $this->mustFind($refundNo);
        $this->checkTransit($refund, 'refunded');

        Db::startTrans();
        try {
            \app\model\Refund::query()->where('refund_no', $refundNo)->update([
                'status' => 'refunded',
                'refunded_at' => date('Y-m-d H:i:s'),
            ]);

            // refund_only: 此时 locked 还在，需要 unlock 放回 available
            if ($refund['type'] === 'refund_only') {
                $items = $this->loadItems($refundNo);
                $this->inventory->unlockBatch($items, $refundNo);
            }
            // iter-67 Q19-04 退款返券：原订单使用过的 user_coupons 标 returned（可二次使用）
            try {
                $orderCoupons = Db::name('order_coupons')->where('order_no', $refund['order_no'])->column('user_coupon_id');
                if ($orderCoupons) {
                    Db::name('user_coupons')->whereIn('id', $orderCoupons)->where('status', 'used')->update([
                        'status' => 'returned',
                        'returned_at' => date('Y-m-d H:i:s'),
                    ]);
                }
            } catch (\Throwable $e) { /* 缺 returned_at 列时跳 */ }
            // return_refund: receive_back 已经完成 reserved→available 转移，refund 仅状态置位
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
        // iter-26 P0-1: 推 oms.refund.refunded
        $this->publishRefundEvent('oms.refund.refunded', $refund, ['operator' => $operator]);
        // iter-26 P0-3: 落财务结算单（refund 负 amount）
        try { (new SettlementService())->recordRefundSettlement($refundNo); }
        catch (\Throwable $e) { /* 财务落单失败不阻塞 */ }
        // iter-28 A1: webhook 推送
        try {
            (new WebhookService())->fireAsync('refund.refunded', [
                'refund_no' => $refundNo,
                'order_no' => $refund['order_no'],
                'amount' => (int)$refund['amount'],
                'refunded_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) { /* webhook 失败不阻塞 */ }
        return $this->detail($refundNo);
    }

    /**
     * iter-26 P0-1: 推 refund 事件给 WMS（仅 audit）
     */
    private function publishRefundEvent(string $stream, array $refund, array $extra = []): void
    {
        try {
            (new EventBus())->publish($stream, array_merge([
                'refund_no' => $refund['refund_no'],
                'order_no' => $refund['order_no'],
                'type' => $refund['type'],
                'amount' => (int)$refund['amount'],
                'event_at' => date('Y-m-d H:i:s'),
            ], $extra));
        } catch (\Throwable $e) { /* 推送失败不阻塞 */ }
    }

    /**
     * 售后超时关闭（iter-16）：
     *   - return_refund + approved 状态 + approved_at < now - N 天 → closed_overtime
     *   - 释放 reserved 库存（货物仍在用户手里，不能算 available）
     *   - 不退款（退货已批但用户没发起物流，视为放弃）
     */
    public function closeOvertime(string $refundNo, string $operator = 'system'): array
    {
        $refund = $this->mustFind($refundNo);
        // 幂等：已是终态跳过
        if (in_array($refund['status'], ['closed_overtime', 'refunded', 'rejected'], true)) {
            return $this->detail($refundNo);
        }
        $this->checkTransit($refund, 'closed_overtime');

        Db::startTrans();
        try {
            \app\model\Refund::query()->where('refund_no', $refundNo)->update([
                'status' => 'closed_overtime',
                'reject_reason' => '超时未发起退货物流，系统自动关闭',
                'approved_by' => $operator,
            ]);
            if ($refund['type'] === 'return_refund') {
                $items = $this->loadItems($refundNo);
                $this->inventory->unreserveBatch($items, $refundNo);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
        return $this->detail($refundNo);
    }

    /**
     * 扫描 N 天前 approved 但未发起退货的 return_refund 单
     */
    public function listOvertime(int $days = 7): array
    {
        $cutoff = date('Y-m-d H:i:s', time() - $days * 86400);
        return \app\model\Refund::query()
            ->where('type', 'return_refund')
            ->where('status', 'approved')
            ->where('approved_at', '<', $cutoff)
            ->column('refund_no');
    }

    public function detail(string $refundNo): array
    {
        $refund = \app\model\Refund::query()->where('refund_no', $refundNo)->find();
        if (!$refund) throw new \RuntimeException('退款单不存在');
        $items = Db::name('refund_items')->where('refund_no', $refundNo)->select()->toArray();
        return ['refund' => $refund, 'items' => $items];
    }

    public function listForUser(int $userId, int $page, int $size): array
    {
        $q = \app\model\Refund::query()->where('user_id', $userId);
        $total = (clone $q)->count();
        $rows = $q->order('id', 'desc')->page($page, $size)->select()->toArray();
        return ['list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size];
    }

    public function listForAdmin(array $filters, int $page, int $size): array
    {
        $q = \app\model\Refund::query();
        if (!empty($filters['status'])) $q->where('status', $filters['status']);
        if (!empty($filters['type'])) $q->where('type', $filters['type']);
        if (!empty($filters['order_no'])) $q->where('order_no', $filters['order_no']);
        if (!empty($filters['keyword'])) {
            $kw = $filters['keyword'];
            $q->where(function ($w) use ($kw) {
                $w->whereLike('refund_no', "%{$kw}%")
                    ->whereOr('order_no', 'like', "%{$kw}%");
            });
        }
        $total = (clone $q)->count();
        $rows = $q->order('id', 'desc')->page($page, $size)->select()->toArray();
        return ['list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size];
    }

    // --- 内部 ---

    private function mustFind(string $refundNo): array
    {
        $r = \app\model\Refund::query()->where('refund_no', $refundNo)->find();
        if (!$r) throw new \RuntimeException("退款单不存在: {$refundNo}");
        return $r;
    }

    private function checkTransit(array $refund, string $to): void
    {
        if (!RefundStateMachine::can($refund['status'], $to)) {
            throw new \RuntimeException("状态非法转移: {$refund['refund_no']} {$refund['status']} → {$to}");
        }
    }

    private function loadItems(string $refundNo): array
    {
        $rows = Db::name('refund_items')->where('refund_no', $refundNo)->select()->toArray();
        return array_map(fn($r) => ['sku_code' => $r['sku_code'], 'qty' => (int)$r['qty']], $rows);
    }

    /**
     * 校验申请数量不超过订单未退数量
     */
    private function validateItemsQty(string $orderNo, array $items): void
    {
        $orderItems = Db::name('order_items')->where('order_no', $orderNo)->select()->toArray();
        $orderMap = [];
        foreach ($orderItems as $oi) {
            $orderMap[$oi['sku_code']] = (int)$oi['qty'];
        }

        // 已退（pending_approve / approved / received_back / refunded 都算占用配额）
        $refundedRows = Db::name('refund_items')
            ->alias('ri')
            ->leftJoin('refund_orders ro', 'ro.refund_no = ri.refund_no')
            ->where('ri.order_no', $orderNo)
            ->whereIn('ro.status', ['pending_approve', 'approved', 'received_back', 'refunded'])
            ->select()->toArray();
        $refundedMap = [];
        foreach ($refundedRows as $r) {
            $refundedMap[$r['sku_code']] = ($refundedMap[$r['sku_code']] ?? 0) + (int)$r['qty'];
        }

        foreach ($items as $it) {
            $sku = (string)$it['sku_code'];
            $req = (int)$it['qty'];
            $bought = $orderMap[$sku] ?? 0;
            $used = $refundedMap[$sku] ?? 0;
            $left = $bought - $used;
            if ($req > $left) {
                throw new \RuntimeException("SKU {$sku} 可退数量 {$left}，申请 {$req} 超出");
            }
        }
    }
}
