<?php
declare(strict_types=1);

namespace app\controller;

use app\service\WithdrawalService;
use think\Request;
use think\Response;

/**
 * 商家自助提现（iter-50 · Q35-03 / Q39-03 多商家最后一公里）
 *
 *   - store_owner：申请提现（限本店）+ 看自己提现单
 *   - super_admin：审批 / 打款 / 拒绝
 *   - sales_ops：看列表（只读）
 */
class Withdrawal
{
    public function __construct(private WithdrawalService $svc = new WithdrawalService()) {}

    /**
     * GET /api/v1/admin/withdrawal/balance[?store_id=]
     *   - store_owner：必须看自己店（忽略 store_id 入参）
     *   - super/sales：可指定 store_id（必填）
     */
    public function balance(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        $storeIds = $request->store_ids ?? null;

        if (in_array($role, ['store_owner', 'store_staff'], true)) {
            if (!is_array($storeIds) || count($storeIds) !== 1) {
                return $this->err(400, '当前角色仅允许查看本店余额');
            }
            $storeId = (int)$storeIds[0];
        } else {
            $storeId = (int)$request->param('store_id', 0);
            if (!$storeId) return $this->err(400, 'store_id 必填');
        }
        return $this->ok($this->svc->getBalance($storeId));
    }

    /**
     * POST /api/v1/admin/withdrawal { amount, remark? }
     *   仅 store_owner 可以申请
     */
    public function apply(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['store_owner', 'store_staff'], true)) {
            return $this->err(403, '仅商家可申请提现');
        }
        $storeIds = $request->store_ids ?? null;
        if (!is_array($storeIds) || count($storeIds) !== 1) {
            return $this->err(400, '商家角色必须绑定唯一店铺');
        }
        $storeId = (int)$storeIds[0];
        $amount = (int)$request->param('amount', 0);
        $remark = trim((string)$request->param('remark', ''));
        $username = (string)($request->admin['username'] ?? 'unknown');
        try {
            return $this->ok($this->svc->apply($storeId, $amount, $username, $remark));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /**
     * POST /api/v1/admin/withdrawal/<no>/approve  super_admin only
     */
    public function approve(Request $request, string $no): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin 可审批');
        $approver = (string)($request->admin['username'] ?? 'unknown');
        try { return $this->ok($this->svc->approve($no, $approver)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /**
     * POST /api/v1/admin/withdrawal/<no>/reject { reason }
     */
    public function reject(Request $request, string $no): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin 可拒绝');
        $approver = (string)($request->admin['username'] ?? 'unknown');
        $reason = trim((string)$request->param('reason', ''));
        try { return $this->ok($this->svc->reject($no, $approver, $reason)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /**
     * POST /api/v1/admin/withdrawal/<no>/pay { method, ref }
     */
    public function pay(Request $request, string $no): Response
    {
        if (($request->admin['role'] ?? '') !== 'super_admin') return $this->err(403, '仅 super_admin 可标记打款');
        $payer = (string)($request->admin['username'] ?? 'unknown');
        $method = trim((string)$request->param('method', ''));
        $ref = trim((string)$request->param('ref', ''));
        try { return $this->ok($this->svc->markPaid($no, $payer, $method, $ref)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /**
     * GET /api/v1/admin/withdrawal/list?status=&page=&size=
     *   - store_owner/staff：只看自己店（自动按 store_ids 过滤）
     *   - super/sales：全店或可指定 store_id
     */
    public function list(Request $request): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        $storeIds = $request->store_ids ?? null;
        $filter = [
            'status' => trim((string)$request->param('status', '')),
        ];
        if (in_array($role, ['store_owner', 'store_staff'], true)) {
            if (!is_array($storeIds) || !$storeIds) return $this->ok(['total' => 0, 'page' => 1, 'size' => 20, 'list' => []]);
            $filter['store_ids'] = $storeIds;
        } else {
            $sid = (int)$request->param('store_id', 0);
            if ($sid) $filter['store_id'] = $sid;
        }
        $page = max(1, (int)$request->param('page', 1));
        $size = min(100, max(1, (int)$request->param('size', 20)));
        return $this->ok($this->svc->list($filter, $page, $size));
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
