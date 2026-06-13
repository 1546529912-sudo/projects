<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 商家自助提现（iter-50 · Q35-03 / Q39-03）
 *
 *   余额 = settlement_orders 净额 - 已 approved/paid 的提现金额
 *
 *   状态机：pending → approved → paid
 *                  ↘ rejected
 */
class WithdrawalService
{
    /**
     * 算店铺可提现余额（分）
     */
    public function getBalance(int $storeId): array
    {
        if ($storeId === 1) {
            return ['balance' => 0, 'settled_net' => 0, 'pending_withdraw' => 0, 'paid_withdraw' => 0, 'note' => '平台店不支持提现'];
        }
        // settlement 净额（含负的 commission/refund）
        $net = (int)Db::name('settlement_orders')->where('store_id', $storeId)->sum('amount');
        // 已 approved/paid 的提现锁定
        $pendingApproved = (int)Db::name('store_withdrawals')->where('store_id', $storeId)->where('status', 'approved')->sum('amount');
        $paid = (int)Db::name('store_withdrawals')->where('store_id', $storeId)->where('status', 'paid')->sum('amount');
        $balance = max(0, $net - $pendingApproved - $paid);
        return [
            'store_id' => $storeId,
            'balance' => $balance,
            'settled_net' => $net,
            'pending_withdraw' => $pendingApproved,
            'paid_withdraw' => $paid,
        ];
    }

    /**
     * 商家申请提现（state machine 入口）
     */
    public function apply(int $storeId, int $amount, string $requestedBy, string $remark = ''): array
    {
        if ($storeId === 1) throw new \RuntimeException('平台店不支持提现');
        if ($amount <= 0) throw new \RuntimeException('提现金额必须 > 0');
        // iter-52 Q50-02：金额上下限可配
        $minYuan = \app\service\SystemConfigService::getFloat('withdrawal.min_amount_yuan', 10.0);
        $maxYuan = \app\service\SystemConfigService::getFloat('withdrawal.max_amount_yuan', 50000.0);
        if ($amount < $minYuan * 100) throw new \RuntimeException("单笔提现下限 ¥{$minYuan}");
        if ($amount > $maxYuan * 100) throw new \RuntimeException("单笔提现上限 ¥{$maxYuan}");

        // iter-54 Q50-03 提现申请频率限制（24h 内 pending 单数）
        $pendingIn24h = Db::name('store_withdrawals')->where('store_id', $storeId)
            ->where('status', 'pending')
            ->where('created_at', '>=', date('Y-m-d H:i:s', time() - 86400))->count();
        $maxPerDay = \app\service\SystemConfigService::getInt('withdrawal.max_pending_per_24h', 1);
        if ($pendingIn24h >= $maxPerDay) {
            throw new \RuntimeException("24h 内已有 {$pendingIn24h} 笔待审提现，请待平台审批后再申请");
        }

        return Db::transaction(function () use ($storeId, $amount, $requestedBy, $remark) {
            $bal = $this->getBalance($storeId);
            if ($amount > $bal['balance']) {
                throw new \RuntimeException("超过可提现余额（当前 ¥" . number_format($bal['balance'] / 100, 2) . "）");
            }
            $no = 'WD' . date('YmdHis') . random_int(1000, 9999);
            $id = Db::name('store_withdrawals')->insertGetId([
                'withdrawal_no' => $no,
                'store_id' => $storeId,
                'amount' => $amount,
                'balance_at_apply' => $bal['balance'],
                'status' => 'pending',
                'requested_by' => $requestedBy,
                'remark' => $remark,
            ]);
            \app\service\AuditService::log('withdrawal.apply', 'store_withdrawal', $no, null, ['store_id' => $storeId, 'amount' => $amount], null, $requestedBy);
            return $this->detail($no);
        });
    }

    public function approve(string $no, string $approver): array
    {
        $detail = $this->transitState($no, 'pending', 'approved', $approver, function ($row, $update) use ($approver) {
            $update['approved_by'] = $approver;
            $update['approved_at'] = date('Y-m-d H:i:s');
            return $update;
        });
        // iter-54 Q50-01 提现 webhook 外推
        $this->fireWebhook('withdrawal.approved', $detail);
        return $detail;
    }

    public function reject(string $no, string $approver, string $reason): array
    {
        if (!$reason) throw new \RuntimeException('拒绝必须填原因');
        return $this->transitState($no, 'pending', 'rejected', $approver, function ($row, $update) use ($approver, $reason) {
            $update['approved_by'] = $approver;
            $update['approved_at'] = date('Y-m-d H:i:s');
            $update['rejected_reason'] = $reason;
            return $update;
        });
    }

    public function markPaid(string $no, string $payer, string $method, string $ref): array
    {
        if (!$method || !$ref) throw new \RuntimeException('打款必须填 method + ref');
        $detail = $this->transitState($no, 'approved', 'paid', $payer, function ($row, $update) use ($payer, $method, $ref) {
            $update['paid_by'] = $payer;
            $update['paid_at'] = date('Y-m-d H:i:s');
            $update['paid_method'] = $method;
            $update['paid_ref'] = $ref;
            return $update;
        });
        // iter-54 Q50-01 提现 webhook 外推
        $this->fireWebhook('withdrawal.paid', $detail);
        return $detail;
    }

    /**
     * iter-54 Q50-01 提现 webhook 外推（异步 / 复用 iter-33 fireAsync）
     */
    private function fireWebhook(string $event, array $detail): void
    {
        try {
            $bus = new \app\service\WebhookService();
            $bus->fireAsync($event, [
                'withdrawal_no' => $detail['withdrawal_no'],
                'store_id' => $detail['store_id'],
                'amount' => $detail['amount'],
                'status' => $detail['status'],
                'paid_method' => $detail['paid_method'] ?? null,
                'paid_ref' => $detail['paid_ref'] ?? null,
                'paid_at' => $detail['paid_at'] ?? null,
            ]);
        } catch (\Throwable $e) { error_log('[withdrawal webhook] ' . $e->getMessage()); }
    }

    private function transitState(string $no, string $fromStatus, string $toStatus, string $operator, callable $fillExtra): array
    {
        return Db::transaction(function () use ($no, $fromStatus, $toStatus, $operator, $fillExtra) {
            $row = Db::name('store_withdrawals')->where('withdrawal_no', $no)->lock(true)->find();
            if (!$row) throw new \RuntimeException('提现单不存在');
            if ($row['status'] !== $fromStatus) {
                throw new \RuntimeException("当前状态 {$row['status']} 不允许转 {$toStatus}（需 {$fromStatus}）");
            }
            $update = ['status' => $toStatus];
            $update = $fillExtra($row, $update);
            Db::name('store_withdrawals')->where('id', $row['id'])->update($update);
            \app\service\AuditService::log('withdrawal.' . $toStatus, 'store_withdrawal', $no, ['status' => $fromStatus], $update, null, $operator);
            return $this->detail($no);
        });
    }

    public function detail(string $no): array
    {
        $row = Db::name('store_withdrawals')->where('withdrawal_no', $no)->find();
        if (!$row) throw new \RuntimeException('提现单不存在');
        return $row;
    }

    public function list(array $filter = [], int $page = 1, int $size = 20): array
    {
        $q = Db::name('store_withdrawals');
        if (!empty($filter['store_ids']) && is_array($filter['store_ids'])) {
            $q->whereIn('store_id', $filter['store_ids']);
        }
        if (!empty($filter['status'])) $q->where('status', $filter['status']);
        if (!empty($filter['store_id'])) $q->where('store_id', $filter['store_id']);
        $total = $q->count();
        $rows = (clone $q)->order('id', 'desc')->page($page, $size)->select()->toArray();
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }
}
