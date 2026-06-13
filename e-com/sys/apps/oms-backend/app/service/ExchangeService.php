<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 换货 service（iter-34 BIZ-07，v1 仅工作流跟踪，不自动联动库存）
 *
 *   apply        用户提交申请
 *   cancel       用户取消（仅 pending_approve）
 *   approve      admin 通过（→ approved，等用户寄回）
 *   reject       admin 拒绝（→ rejected，含 reason）
 *   markReceivedOld  admin 标记收到旧货（含寄回单号 + 备注）
 *   markSentNew      admin 标记新货已发出（含新单号）
 *   markCompleted    admin / 用户确认收到
 *
 *   状态机详见 ExchangeStateMachine
 */
class ExchangeService
{
    public function apply(string $orderNo, int $userId, array $items, string $reason, array $evidenceImages = []): array
    {
        $order = Db::name('orders')->where('order_no', $orderNo)->find();
        if (!$order) throw new \RuntimeException('订单不存在');
        if ((int)$order['user_id'] !== $userId) throw new \RuntimeException('非本人订单');
        if (!in_array($order['status'], ['shipped', 'completed'], true)) {
            throw new \RuntimeException('仅 shipped / completed 订单可申请换货');
        }
        if (!$items || !is_array($items)) throw new \RuntimeException('items 必传');
        if (trim($reason) === '') throw new \RuntimeException('reason 必填');

        // 检查每个 item：order_item_id 必须属于该订单 + new_sku_code 存在
        foreach ($items as $i => $it) {
            $oid = (int)($it['order_item_id'] ?? 0);
            $newSku = trim((string)($it['new_sku_code'] ?? ''));
            $qty = max(1, (int)($it['qty'] ?? 1));
            if (!$oid) throw new \RuntimeException("items[{$i}] order_item_id 必传");
            if (!$newSku) throw new \RuntimeException("items[{$i}] new_sku_code 必传");
            $oi = Db::name('order_items')->where('id', $oid)->where('order_no', $orderNo)->find();
            if (!$oi) throw new \RuntimeException("items[{$i}] order_item_id={$oid} 不属于该订单");
            if ($qty > (int)$oi['qty']) {
                throw new \RuntimeException("items[{$i}] 换货数量 {$qty} > 订单数量 {$oi['qty']}");
            }
            // 同一订单项已有非终态换货单 → 阻断
            $exists = Db::name('exchange_items')
                ->alias('ei')
                ->leftJoin('exchange_orders eo', 'eo.exchange_no = ei.exchange_no')
                ->where('ei.order_item_id', $oid)
                ->whereNotIn('eo.status', ['rejected', 'cancelled', 'completed'])
                ->find();
            if ($exists) {
                throw new \RuntimeException("items[{$i}] order_item_id={$oid} 已有进行中的换货单");
            }
        }

        $exchangeNo = $this->genNo();
        Db::startTrans();
        try {
            // iter-37: 继承 order.store_id
            $orderStoreId = (int)(Db::name('orders')->where('order_no', $orderNo)->value('store_id') ?: 1);
            Db::name('exchange_orders')->insert([
                'exchange_no' => $exchangeNo,
                'order_no' => $orderNo,
                'user_id' => $userId,
                'store_id' => $orderStoreId,
                'status' => ExchangeStateMachine::PENDING,
                'reason' => $reason,
                'evidence_images' => json_encode($evidenceImages, JSON_UNESCAPED_UNICODE),
            ]);
            foreach ($items as $it) {
                $oid = (int)$it['order_item_id'];
                $oi = Db::name('order_items')->where('id', $oid)->find();
                $newSku = trim((string)$it['new_sku_code']);
                // 拉取新 SKU 快照（跨库读 PIM）
                $newSnapshot = null;
                try {
                    $newSnapshot = Db::connect('pim')->name('skus')
                        ->where('sku_code', $newSku)->whereNull('deleted_at')->find();
                } catch (\Throwable $e) {
                    // pim 副连接可能未配，先 null 留位
                }
                Db::name('exchange_items')->insert([
                    'exchange_no' => $exchangeNo,
                    'order_no' => $orderNo,
                    'order_item_id' => $oid,
                    'old_sku_code' => $oi['sku_code'],
                    'old_sku_snapshot' => $oi['sku_snapshot'] ?? null,
                    'new_sku_code' => $newSku,
                    'new_sku_snapshot' => $newSnapshot ? json_encode($newSnapshot, JSON_UNESCAPED_UNICODE) : null,
                    'qty' => max(1, (int)($it['qty'] ?? 1)),
                    'item_reason' => $it['reason'] ?? null,
                ]);
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            throw $e;
        }
        return $this->detail($exchangeNo);
    }

    public function cancel(string $exchangeNo, int $userId): array
    {
        $row = $this->mustGet($exchangeNo);
        if ((int)$row['user_id'] !== $userId) throw new \RuntimeException('非本人换货单');
        $this->transit($row, ExchangeStateMachine::CANCELLED, [
            'cancelled_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->detail($exchangeNo);
    }

    /**
     * iter-43 EFF-03 审批流：换货按 quantity 总数判断（>= ENV OMS_EXCHANGE_REVIEW_THRESHOLD_QTY，默认 3）
     *   - 非 super_admin 一审 → needs_second_review=1，记 first_approved_by/at，status 仍 pending_approve
     *   - 二审：必须 super_admin 才能 APPROVED
     */
    public function approve(string $exchangeNo, string $operator, string $role = '', ?string $secondReviewNote = null): array
    {
        $row = $this->mustGet($exchangeNo);
        // iter-52 Q43-01：阈值改 KV 配置
        $threshold = \app\service\SystemConfigService::getInt('exchange_threshold.qty', 3);
        $needsTwo  = (int)($row['needs_second_review'] ?? 0) === 1;
        $totalQty  = (int)\think\facade\Db::name('exchange_items')->where('exchange_no', $exchangeNo)->sum('qty');

        if ($needsTwo) {
            if ($role !== 'super_admin') {
                throw new \RuntimeException('该换货单需 super_admin 二审通过');
            }
        } else {
            if ($totalQty >= $threshold && $role !== 'super_admin') {
                \think\facade\Db::name('exchange_orders')->where('exchange_no', $exchangeNo)->update([
                    'needs_second_review' => 1,
                    'first_approved_by' => $operator,
                    'first_approved_at' => date('Y-m-d H:i:s'),
                ]);
                return $this->detail($exchangeNo);
            }
        }

        $extra = [
            'approved_at' => date('Y-m-d H:i:s'),
            'approved_by' => $operator,
        ];
        // iter-64 Q43-02 二审备注
        if ($needsTwo && $secondReviewNote !== null && $secondReviewNote !== '') {
            $extra['second_review_note'] = mb_substr($secondReviewNote, 0, 200);
        }
        $this->transit($row, ExchangeStateMachine::APPROVED, $extra);
        return $this->detail($exchangeNo);
    }

    public function reject(string $exchangeNo, string $operator, string $reason): array
    {
        if (trim($reason) === '') throw new \RuntimeException('reject reason 必填');
        $row = $this->mustGet($exchangeNo);
        $this->transit($row, ExchangeStateMachine::REJECTED, [
            'rejected_at' => date('Y-m-d H:i:s'),
            'reject_reason' => $reason,
            'approved_by' => $operator, // 复用：记录处理人
        ]);
        return $this->detail($exchangeNo);
    }

    public function markReceivedOld(string $exchangeNo, string $operator, string $trackingNo, ?string $note = null): array
    {
        $row = $this->mustGet($exchangeNo);
        $this->transit($row, ExchangeStateMachine::RECEIVED_OLD, [
            'tracking_no_old' => $trackingNo ?: null,
            'received_old_at' => date('Y-m-d H:i:s'),
            'received_old_by' => $operator,
            'received_old_note' => $note ?: null,
        ]);
        return $this->detail($exchangeNo);
    }

    public function markSentNew(string $exchangeNo, string $operator, string $trackingNo): array
    {
        if (trim($trackingNo) === '') throw new \RuntimeException('新货物流单号必填');
        $row = $this->mustGet($exchangeNo);
        $this->transit($row, ExchangeStateMachine::SENT_NEW, [
            'tracking_no_new' => $trackingNo,
            'sent_new_at' => date('Y-m-d H:i:s'),
            'sent_new_by' => $operator,
        ]);
        return $this->detail($exchangeNo);
    }

    public function markCompleted(string $exchangeNo): array
    {
        $row = $this->mustGet($exchangeNo);

        // iter-65 Q34-01：v2 自动联动库存
        //   旧 SKU 流转：return_refund 同款 — 已 received_back 时入库；本步无动作
        //   新 SKU 流转：发出新货 → 扣库存（unlock + outbound）
        try {
            $inv = new InventoryService();
            $items = Db::name('exchange_items')->where('exchange_no', $exchangeNo)->select()->toArray();
            $batch = [];
            foreach ($items as $it) {
                if (!empty($it['new_sku_code']) && (int)$it['qty'] > 0) {
                    $batch[] = ['sku_code' => $it['new_sku_code'], 'qty' => (int)$it['qty']];
                }
            }
            if ($batch) {
                $inv->outboundBatch($batch, $exchangeNo);
            }
        } catch (\Throwable $e) {
            error_log('[Q34-01 inventory sync] ' . $e->getMessage());
        }

        $this->transit($row, ExchangeStateMachine::COMPLETED, [
            'completed_at' => date('Y-m-d H:i:s'),
        ]);
        // iter-57 Q34-03 webhook 外推
        try {
            $detail = $this->detail($exchangeNo);
            (new \app\service\WebhookService())->fireAsync('exchange.completed', [
                'exchange_no' => $detail['exchange_no'], 'order_no' => $detail['order_no'],
                'user_id' => $detail['user_id'], 'status' => $detail['status'],
            ]);
        } catch (\Throwable $e) { error_log('[exchange webhook] ' . $e->getMessage()); }
        return $this->detail($exchangeNo);
    }

    public function detail(string $exchangeNo): array
    {
        $row = $this->mustGet($exchangeNo);
        $row['evidence_images'] = $row['evidence_images'] ? (json_decode($row['evidence_images'], true) ?: []) : [];
        $items = Db::name('exchange_items')->where('exchange_no', $exchangeNo)->select()->toArray();
        foreach ($items as &$it) {
            $it['old_sku_snapshot'] = $it['old_sku_snapshot'] ? json_decode($it['old_sku_snapshot'], true) : null;
            $it['new_sku_snapshot'] = $it['new_sku_snapshot'] ? json_decode($it['new_sku_snapshot'], true) : null;
        }
        return ['exchange' => $row, 'items' => $items];
    }

    public function listForUser(int $userId, int $page, int $size): array
    {
        $q = Db::name('exchange_orders')->where('user_id', $userId)->order('id', 'desc');
        $total = (clone $q)->count();
        $rows = $q->page($page, $size)->select()->toArray();
        foreach ($rows as &$r) {
            $r['evidence_images'] = $r['evidence_images'] ? (json_decode($r['evidence_images'], true) ?: []) : [];
        }
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    public function listForAdmin(array $filters, int $page, int $size): array
    {
        $q = Db::name('exchange_orders');
        if (!empty($filters['status'])) $q->where('status', $filters['status']);
        if (!empty($filters['order_no'])) $q->where('order_no', $filters['order_no']);
        if (!empty($filters['exchange_no'])) $q->where('exchange_no', $filters['exchange_no']);
        if (!empty($filters['user_id'])) $q->where('user_id', (int)$filters['user_id']);
        $q->order('id', 'desc');
        $total = (clone $q)->count();
        $rows = $q->page($page, $size)->select()->toArray();
        foreach ($rows as &$r) {
            $r['evidence_images'] = $r['evidence_images'] ? (json_decode($r['evidence_images'], true) ?: []) : [];
        }
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    private function mustGet(string $exchangeNo): array
    {
        $row = Db::name('exchange_orders')->where('exchange_no', $exchangeNo)->find();
        if (!$row) throw new \RuntimeException('换货单不存在');
        return $row;
    }

    private function transit(array $row, string $to, array $extra = []): void
    {
        ExchangeStateMachine::assert($row['status'], $to);
        $update = array_merge(['status' => $to], $extra);
        Db::name('exchange_orders')->where('exchange_no', $row['exchange_no'])->update($update);
    }

    private function genNo(): string
    {
        return 'EX' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);
    }
}
