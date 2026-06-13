<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 财务结算单（iter-26 P0-3）
 *
 *   - order confirm → recordOrderSettlement（amount 正数）
 *   - refund refunded → recordRefundSettlement（amount 负数）
 *   - settle 标记入账（手动确认）
 *   - export 财务 CSV
 *
 *   UNIQUE (type, ref_no) 防重复触发
 */
class SettlementService
{
    public function recordOrderSettlement(string $orderNo): array
    {
        $order = Db::name('orders')->where('order_no', $orderNo)->find();
        if (!$order) throw new \RuntimeException('订单不存在');

        $existing = Db::name('settlement_orders')
            ->where('type', 'order')->where('ref_no', $orderNo)->find();
        if ($existing) return $existing;  // idempotent

        $no = 'ST' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);
        $storeId = (int)($order['store_id'] ?? 1);
        $id = Db::name('settlement_orders')->insertGetId([
            'settlement_no' => $no,
            'type' => 'order',
            'ref_no' => $orderNo,
            'user_id' => (int)$order['user_id'],
            'store_id' => $storeId,
            'amount' => (int)$order['total_amount'],
            'goods_amount' => (int)$order['goods_amount'],
            'freight' => (int)$order['freight'],
            'discount' => (int)($order['discount'] ?? 0),
            'status' => 'unsettled',
            'remark' => '订单完成',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // iter-37 BIZ-08-3: 平台抽佣 — 按 stores.commission_rate 算，平台店 id=1 跳过（自营无需抽佣）
        if ($storeId !== 1) {
            try {
                $rate = (float)(Db::name('stores')->where('id', $storeId)->value('commission_rate') ?: 0);
                if ($rate > 0) {
                    $commission = (int)round((int)$order['goods_amount'] * $rate);
                    if ($commission > 0) {
                        Db::name('settlement_orders')->insertGetId([
                            'settlement_no' => 'ST' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4),
                            'type' => 'platform_commission',
                            'ref_no' => $orderNo,
                            'user_id' => 0,
                            'store_id' => $storeId,
                            'amount' => -$commission, // 负数：从商家结算扣
                            'goods_amount' => 0,
                            'freight' => 0,
                            'discount' => 0,
                            'status' => 'unsettled',
                            'remark' => sprintf('平台抽佣 %.2f%% · 订单 %s', $rate * 100, $orderNo),
                            'created_at' => date('Y-m-d H:i:s'),
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                error_log('[SettlementService] 抽佣计算失败 order=' . $orderNo . ' err=' . $e->getMessage());
            }
        }

        return Db::name('settlement_orders')->where('id', $id)->find();
    }

    public function recordRefundSettlement(string $refundNo): array
    {
        $refund = Db::name('refund_orders')->where('refund_no', $refundNo)->find();
        if (!$refund) throw new \RuntimeException('退款单不存在');

        $existing = Db::name('settlement_orders')
            ->where('type', 'refund')->where('ref_no', $refundNo)->find();
        if ($existing) return $existing;

        $no = 'ST' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);
        $id = Db::name('settlement_orders')->insertGetId([
            'settlement_no' => $no,
            'type' => 'refund',
            'ref_no' => $refundNo,
            'user_id' => (int)$refund['user_id'],
            'store_id' => (int)($refund['store_id'] ?? 1), // iter-37 BIZ-08-3
            'amount' => -(int)$refund['amount'],  // 负数
            'goods_amount' => -(int)$refund['amount'],
            'freight' => 0,
            'discount' => 0,
            'status' => 'unsettled',
            'remark' => '退款完成 · ' . ($refund['type'] === 'refund_only' ? '仅退款' : '退货退款'),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return Db::name('settlement_orders')->where('id', $id)->find();
    }

    public function list(array $filter = [], int $page = 1, int $size = 20): array
    {
        $q = Db::name('settlement_orders');
        if (!empty($filter['type'])) $q->where('type', $filter['type']);
        if (!empty($filter['status'])) $q->where('status', $filter['status']);
        if (!empty($filter['start_date'])) $q->where('created_at', '>=', $filter['start_date']);
        if (!empty($filter['end_date'])) $q->where('created_at', '<=', $filter['end_date']);
        $total = $q->count();
        // 同时算 net amount
        $netAmount = (int)(clone $q)->sum('amount');
        $rows = (clone $q)->order('id', 'desc')->page($page, $size)->select()->toArray();
        return [
            'total' => $total,
            'page' => $page,
            'size' => $size,
            'list' => $rows,
            'net_amount_cents' => $netAmount,
            'net_amount_yuan' => number_format($netAmount / 100, 2, '.', ''),
        ];
    }

    public function detail(string $no): array
    {
        $row = Db::name('settlement_orders')->where('settlement_no', $no)->find();
        if (!$row) throw new \RuntimeException('结算单不存在');
        return $row;
    }

    public function settle(string $no): array
    {
        $row = Db::name('settlement_orders')->where('settlement_no', $no)->find();
        if (!$row) throw new \RuntimeException('结算单不存在');
        if ($row['status'] === 'settled') return $row;
        Db::name('settlement_orders')->where('settlement_no', $no)->update([
            'status' => 'settled',
            'settled_at' => date('Y-m-d H:i:s'),
        ]);
        return Db::name('settlement_orders')->where('settlement_no', $no)->find();
    }
}
