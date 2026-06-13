<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AuditService;
use app\service\RefundService;
use think\Request;
use think\Response;

/**
 * 退款接口（user + admin 双角色）
 *
 * User:
 *   POST /api/v1/refund                       申请退款
 *   GET  /api/v1/refund/list                  我的退款列表
 *   GET  /api/v1/refund/:no                   退款详情
 *
 * Admin:
 *   GET  /api/v1/admin/refund/list            后台列表
 *   GET  /api/v1/admin/refund/:no             后台详情
 *   POST /api/v1/admin/refund/:no/approve     审批通过
 *   POST /api/v1/admin/refund/:no/reject      拒绝
 *   POST /api/v1/admin/refund/:no/confirm     确认退款（return_refund 已 received_back 后）
 */
class Refund
{
    private RefundService $service;

    public function __construct()
    {
        $this->service = new RefundService();
    }

    // --- User ---

    public function apply(Request $request): Response
    {
        $userId = (int)$request->param('user_id');
        $orderNo = (string)$request->param('order_no');
        $type = (string)$request->param('type', 'refund_only');
        $items = $request->param('items', []);
        $reason = (string)$request->param('reason', '');
        $amount = (int)$request->param('amount', 0);
        $evidenceImages = $request->param('evidence_images', []);
        if (!is_array($evidenceImages)) $evidenceImages = [];

        if (!$userId) return $this->err(400, 'user_id 必传');
        if (!$orderNo) return $this->err(400, 'order_no 必传');

        try {
            return $this->ok($this->service->apply($orderNo, $userId, $type, $items, $reason, $amount, $evidenceImages));
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
    }

    public function userList(Request $request): Response
    {
        $userId = (int)$request->param('user_id');
        if (!$userId) return $this->err(400, 'user_id 必传');
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(50, (int)$request->param('size', 20)));
        return $this->ok($this->service->listForUser($userId, $page, $size));
    }

    public function userDetail(Request $request, string $refundNo): Response
    {
        try {
            return $this->ok($this->service->detail($refundNo));
        } catch (\Throwable $e) {
            return $this->err(404, $e->getMessage());
        }
    }

    // --- Admin ---

    public function adminList(Request $request): Response
    {
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(100, (int)$request->param('size', 20)));
        $filters = [
            'status' => (string)$request->param('status', ''),
            'type' => (string)$request->param('type', ''),
            'order_no' => (string)$request->param('order_no', ''),
            'keyword' => trim((string)$request->param('keyword', '')),
        ];
        return $this->ok($this->service->listForAdmin($filters, $page, $size));
    }

    public function adminDetail(Request $request, string $refundNo): Response
    {
        try {
            return $this->ok($this->service->detail($refundNo));
        } catch (\Throwable $e) {
            return $this->err(404, $e->getMessage());
        }
    }

    public function approve(Request $request, string $refundNo): Response
    {
        $operator = (string)($request->admin['username'] ?? $request->param('operator', 'admin'));
        $role     = (string)($request->admin['role'] ?? '');
        try {
            $before = $this->service->detail($refundNo);
            $note = trim((string)$request->param('second_review_note', ''));
            $after = $this->service->approve($refundNo, $operator, $role, $note ?: null);
            AuditService::log('refund.approve', 'refund', $refundNo,
                ['status' => $before['refund']['status'], 'needs_second_review' => $before['refund']['needs_second_review'] ?? 0],
                ['status' => $after['refund']['status'], 'needs_second_review' => $after['refund']['needs_second_review'] ?? 0], null, $operator);
            return $this->ok($after);
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
    }

    public function reject(Request $request, string $refundNo): Response
    {
        $operator = (string)$request->param('operator', 'admin');
        $reason = (string)$request->param('reason', '');
        try {
            $before = $this->service->detail($refundNo);
            $after = $this->service->reject($refundNo, $operator, $reason);
            AuditService::log('refund.reject', 'refund', $refundNo,
                ['status' => $before['refund']['status']],
                ['status' => $after['refund']['status']], $reason, $operator);
            return $this->ok($after);
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
    }

    /**
     * POST /api/v1/admin/refund/batch-approve （iter-18）
     */
    public function batchApprove(Request $request): Response
    {
        $nos = $request->param('refund_nos', []);
        $operator = (string)($request->admin['username'] ?? $request->param('operator', 'admin'));
        $role     = (string)($request->admin['role'] ?? '');
        if (!is_array($nos) || !$nos) return $this->err(400, 'refund_nos 不能为空');
        if (count($nos) > 50) return $this->err(400, '单次最多 50 个');

        $ok = []; $failed = [];
        foreach ($nos as $no) {
            try {
                $before = $this->service->detail($no);
                $after = $this->service->approve($no, $operator, $role);
                AuditService::log('refund.approve', 'refund', $no,
                    ['status' => $before['refund']['status']],
                    ['status' => $after['refund']['status']], null, $operator);
                $ok[] = $no;
            } catch (\Throwable $e) {
                $failed[] = ['refund_no' => $no, 'reason' => $e->getMessage()];
            }
        }
        return $this->ok(['ok_count' => count($ok), 'ok' => $ok, 'failed_count' => count($failed), 'failed' => $failed]);
    }

    /**
     * POST /api/v1/admin/refund/batch-reject （iter-18）
     */
    public function batchReject(Request $request): Response
    {
        $nos = $request->param('refund_nos', []);
        $reason = (string)$request->param('reason', '');
        $operator = (string)$request->param('operator', 'admin');
        if (!is_array($nos) || !$nos) return $this->err(400, 'refund_nos 不能为空');
        if (count($nos) > 50) return $this->err(400, '单次最多 50 个');
        if (!$reason) return $this->err(400, 'reason 必传');

        $ok = []; $failed = [];
        foreach ($nos as $no) {
            try {
                $before = $this->service->detail($no);
                $after = $this->service->reject($no, $operator, $reason);
                AuditService::log('refund.reject', 'refund', $no,
                    ['status' => $before['refund']['status']],
                    ['status' => $after['refund']['status']], $reason, $operator);
                $ok[] = $no;
            } catch (\Throwable $e) {
                $failed[] = ['refund_no' => $no, 'reason' => $e->getMessage()];
            }
        }
        return $this->ok(['ok_count' => count($ok), 'ok' => $ok, 'failed_count' => count($failed), 'failed' => $failed]);
    }

    public function confirm(Request $request, string $refundNo): Response
    {
        $operator = (string)$request->param('operator', 'admin');
        try {
            $before = $this->service->detail($refundNo);
            $after = $this->service->refund($refundNo, $operator);
            AuditService::log('refund.confirm', 'refund', $refundNo,
                ['status' => $before['refund']['status']],
                ['status' => $after['refund']['status']], null, $operator);
            return $this->ok($after);
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
