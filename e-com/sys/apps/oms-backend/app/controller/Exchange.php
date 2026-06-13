<?php
declare(strict_types=1);

namespace app\controller;

use app\service\ExchangeService;
use app\service\AuditService;
use think\Request;
use think\Response;

/**
 * 换货 controller（iter-34 BIZ-07）
 *
 *   用户侧（无 admin 鉴权，由 shop-backend 透传 user_id）：
 *     POST   /api/v1/exchange                用户申请
 *     GET    /api/v1/exchange/list           用户列表（带 user_id 过滤）
 *     GET    /api/v1/exchange/<no>           详情
 *     POST   /api/v1/exchange/<no>/cancel    用户取消
 *
 *   admin 侧（套 AdminAuth）：
 *     GET    /api/v1/admin/exchange/list                 admin 列表
 *     GET    /api/v1/admin/exchange/<no>                 admin 详情
 *     POST   /api/v1/admin/exchange/<no>/approve         审批通过
 *     POST   /api/v1/admin/exchange/<no>/reject          拒绝
 *     POST   /api/v1/admin/exchange/<no>/received-old    标记收到旧货
 *     POST   /api/v1/admin/exchange/<no>/sent-new        标记新货已发出
 *     POST   /api/v1/admin/exchange/<no>/complete        标记完成
 */
class Exchange
{
    private ExchangeService $svc;
    public function __construct() { $this->svc = new ExchangeService(); }

    public function apply(Request $request): Response
    {
        try {
            $result = $this->svc->apply(
                (string)$request->param('order_no'),
                (int)$request->param('user_id'),
                (array)$request->param('items', []),
                (string)$request->param('reason'),
                (array)$request->param('evidence_images', [])
            );
            return $this->ok($result);
        } catch (\Throwable $e) {
            return $this->err(400, $e->getMessage());
        }
    }

    public function list(Request $request): Response
    {
        $uid = (int)$request->param('user_id', 0);
        if (!$uid) return $this->err(400, 'user_id 必传');
        return $this->ok($this->svc->listForUser($uid, max(1, (int)$request->param('page', 1)), max(1, min(100, (int)$request->param('size', 20)))));
    }

    public function detail(string $no): Response
    {
        try { return $this->ok($this->svc->detail($no)); }
        catch (\Throwable $e) { return $this->err(404, $e->getMessage()); }
    }

    public function cancel(Request $request, string $no): Response
    {
        try {
            $uid = (int)$request->param('user_id');
            return $this->ok($this->svc->cancel($no, $uid));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function adminList(Request $request): Response
    {
        $filters = $request->only(['status', 'order_no', 'exchange_no', 'user_id']);
        return $this->ok($this->svc->listForAdmin($filters,
            max(1, (int)$request->param('page', 1)),
            max(1, min(100, (int)$request->param('size', 20)))));
    }

    public function adminDetail(string $no): Response
    {
        try { return $this->ok($this->svc->detail($no)); }
        catch (\Throwable $e) { return $this->err(404, $e->getMessage()); }
    }

    public function approve(Request $request, string $no): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $role = (string)($request->admin['role'] ?? '');
            $before = $this->svc->detail($no);
            $note = trim((string)$request->param('second_review_note', ''));
            $r = $this->svc->approve($no, $op, $role, $note ?: null);
            AuditService::log('exchange.approve', 'exchange', $no, $before['exchange'], $r['exchange']);
            return $this->ok($r);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function reject(Request $request, string $no): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $reason = (string)$request->param('reason');
            $before = $this->svc->detail($no);
            $r = $this->svc->reject($no, $op, $reason);
            AuditService::log('exchange.reject', 'exchange', $no, $before['exchange'], $r['exchange'], $reason);
            return $this->ok($r);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function receivedOld(Request $request, string $no): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $tracking = (string)$request->param('tracking_no_old', '');
            $note = $request->param('note');
            $r = $this->svc->markReceivedOld($no, $op, $tracking, $note);
            AuditService::log('exchange.received_old', 'exchange', $no, null,
                ['tracking_no_old' => $tracking, 'note' => $note]);
            return $this->ok($r);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function sentNew(Request $request, string $no): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $tracking = (string)$request->param('tracking_no_new');
            $r = $this->svc->markSentNew($no, $op, $tracking);
            AuditService::log('exchange.sent_new', 'exchange', $no, null, ['tracking_no_new' => $tracking]);
            return $this->ok($r);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function complete(Request $request, string $no): Response
    {
        try {
            $r = $this->svc->markCompleted($no);
            AuditService::log('exchange.complete', 'exchange', $no, null, $r['exchange']);
            return $this->ok($r);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
