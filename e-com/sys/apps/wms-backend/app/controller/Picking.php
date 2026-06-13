<?php
declare(strict_types=1);

namespace app\controller;

use app\service\OutboundService;
use app\service\PickingTaskService;
use think\Request;
use think\Response;

class Picking
{
    private OutboundService $service;
    private PickingTaskService $taskSvc;
    public function __construct() {
        $this->service = new OutboundService();
        $this->taskSvc = new PickingTaskService();
    }

    /**
     * POST /api/v1/picking-order — OMS 推拣货单（infra 入口，无 admin auth）
     */
    public function create(Request $request): Response
    {
        $idem = (string)$request->header('Idempotency-Key', '')
            ?: (string)($_SERVER['HTTP_IDEMPOTENCY_KEY'] ?? '');
        if (!$idem) {
            return json(['code' => 400, 'msg' => 'Idempotency-Key 必传', 'data' => null]);
        }
        try {
            $data = $this->service->acceptPicking([
                'outbound_no' => (string)$request->param('outbound_no'),
                'oms_order_no' => (string)$request->param('oms_order_no'),
                'warehouse_code' => (string)$request->param('warehouse_code', 'WH-DEFAULT'),
                'items' => $request->param('items', []),
                'address' => $request->param('address', []),
            ], $idem);
            return json(['code' => 0, 'msg' => 'ok', 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            return json(['code' => 400, 'msg' => $e->getMessage(), 'data' => null]);
        } catch (\Throwable $e) {
            return json(['code' => 500, 'msg' => $e->getMessage(), 'data' => null]);
        }
    }

    /* ============= iter-24 P1-1 拣货任务 admin API ============= */

    public function adminList(Request $request): Response
    {
        $filter = $request->only(['status', 'outbound_no', 'operator']);
        $page = max(1, (int)$request->param('page', 1));
        $size = min(100, max(1, (int)$request->param('size', 20)));
        return $this->ok($this->taskSvc->list($filter, $page, $size));
    }

    public function adminDetail(Request $request, int $id): Response
    {
        try { return $this->ok($this->taskSvc->detail($id)); }
        catch (\Throwable $e) { return $this->err(404, $e->getMessage()); }
    }

    public function assign(Request $request, int $id): Response
    {
        $operator = trim((string)$request->param('operator'));
        if (!$operator) return $this->err(400, 'operator 必传');
        try { return $this->ok($this->taskSvc->assign($id, $operator)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function scan(Request $request, int $id): Response
    {
        $incr = (int)$request->param('incr_qty', 0);
        $operator = (string)$request->param('operator', $request->admin['username'] ?? '');
        try { return $this->ok($this->taskSvc->scan($id, $incr, $operator)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function completeTask(Request $request, int $id): Response
    {
        $operator = (string)($request->admin['username'] ?? '');
        try { return $this->ok($this->taskSvc->complete($id, $operator)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    // iter-69 Q25-03 拣货效率按 operator 维度
    public function operatorStats(Request $request): Response
    {
        $days = max(1, min(90, (int)$request->param('days', 7)));
        $start = date('Y-m-d', strtotime("-{$days} days"));
        $rows = \think\facade\Db::name('picking_tasks')
            ->whereNotNull('operator')->where('updated_at', '>=', $start . ' 00:00:00')
            ->field('operator, COUNT(*) AS total_tasks, SUM(picked_qty) AS total_picked, SUM(IF(status="picked",1,0)) AS done_tasks, AVG(TIMESTAMPDIFF(SECOND, assigned_at, updated_at)) AS avg_seconds')
            ->group('operator')->order('done_tasks', 'desc')->select()->toArray();
        return $this->ok(['days' => $days, 'rows' => $rows, 'as_of' => date('Y-m-d')]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
