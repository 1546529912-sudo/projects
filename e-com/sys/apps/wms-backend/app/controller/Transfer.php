<?php
declare(strict_types=1);

namespace app\controller;

use app\service\TransferService;
use think\Request;
use think\Response;

/**
 * 调拨（iter-22）
 */
class Transfer
{
    private TransferService $svc;
    public function __construct() { $this->svc = new TransferService(); }

    public function create(Request $request): Response
    {
        $data = $request->only(['from_warehouse', 'to_warehouse', 'remark', 'items']);
        $data['created_by'] = $request->admin['username'] ?? 'admin';
        try { return $this->ok($this->svc->create($data)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function list(Request $request): Response
    {
        $filter = $request->only(['status', 'from_warehouse', 'to_warehouse']);
        $page = max(1, (int)$request->param('page', 1));
        $size = min(100, max(1, (int)$request->param('size', 20)));
        return $this->ok($this->svc->list($filter, $page, $size));
    }

    public function detail(Request $request, string $transferNo): Response
    {
        try { return $this->ok($this->svc->detail($transferNo)); }
        catch (\Throwable $e) { return $this->err(404, $e->getMessage()); }
    }

    public function ship(Request $request, string $transferNo): Response
    {
        try { return $this->ok($this->svc->ship($transferNo)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function receive(Request $request, string $transferNo): Response
    {
        try {
            $r = $this->svc->receive($transferNo);
            $this->svc->publishPendingEvent();  // iter-24 P0-2
            return $this->ok($r);
        }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function cancel(Request $request, string $transferNo): Response
    {
        try { return $this->ok($this->svc->cancel($transferNo)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    // iter-69 Q23-01 部分接收
    public function receivePartial(Request $request, string $transferNo): Response
    {
        $partials = $request->param('items', []);
        if (!is_array($partials)) return $this->err(400, 'items 数组必填');
        try { return $this->ok($this->svc->receivePartial($transferNo, $partials)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    // iter-69 Q23-02 行级取消
    public function cancelLine(Request $request, string $transferNo, int $lineNo): Response
    {
        $reason = (string)$request->param('reason', '');
        try { return $this->ok($this->svc->cancelLine($transferNo, $lineNo, $reason)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    // iter-69 Q23-03 调拨单 CSV 导出
    public function exportCsv(Request $request): Response
    {
        $status = (string)$request->param('status', '');
        $q = \think\facade\Db::name('transfers');
        if ($status) $q->where('status', $status);
        $rows = $q->order('id', 'desc')->limit(5000)->select()->toArray();
        $body = "调拨号,源仓,目标仓,状态,跨店审,创建时间\n";
        foreach ($rows as $r) {
            $body .= sprintf("%s,%s,%s,%s,%s,%s\n",
                $r['transfer_no'], $r['from_warehouse'], $r['to_warehouse'], $r['status'],
                ($r['needs_review'] ?? 0) ? '是' : '否', $r['created_at']);
        }
        return response($body, 200, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="transfers_' . date('Ymd_His') . '.csv"',
        ]);
    }

    // iter-61 Q38-01 跨店调拨平台代理审核
    public function review(Request $request, string $transferNo): Response
    {
        $role = $request->admin['role'] ?? '';
        if (!in_array($role, ['super_admin', 'sales_ops'], true)) {
            return $this->err(403, '仅平台 super_admin / sales_ops 可审核');
        }
        $op = $request->admin['username'] ?? 'admin';
        try { return $this->ok($this->svc->review($transferNo, $op)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
