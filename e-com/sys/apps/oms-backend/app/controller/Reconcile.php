<?php
declare(strict_types=1);

namespace app\controller;

use app\service\OmsInventoryReconcileService;
use think\Request;
use think\Response;

/**
 * OMS 视角库存对账（iter-26 P0-2）
 *   - super_admin 独占（敏感数据）
 */
class Reconcile
{
    private OmsInventoryReconcileService $svc;
    public function __construct() { $this->svc = new OmsInventoryReconcileService(); }

    public function create(Request $request): Response
    {
        $data = [
            'scope_type' => (string)$request->param('scope_type', 'all'),
            'scope_value' => $request->param('scope_value'),
            'created_by' => $request->admin['username'] ?? 'admin',
        ];
        try { return $this->ok($this->svc->create($data)); }
        catch (\Throwable $e) { return $this->err(500, $e->getMessage()); }
    }

    public function list(Request $request): Response
    {
        $page = max(1, (int)$request->param('page', 1));
        $size = min(100, max(1, (int)$request->param('size', 20)));
        return $this->ok($this->svc->list($page, $size));
    }

    public function detail(Request $request, string $no): Response
    {
        try { return $this->ok($this->svc->detail($no)); }
        catch (\Throwable $e) { return $this->err(404, $e->getMessage()); }
    }

    public function confirm(Request $request, string $no): Response
    {
        try { return $this->ok($this->svc->confirm($no)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
