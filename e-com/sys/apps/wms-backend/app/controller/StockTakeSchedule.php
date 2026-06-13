<?php
declare(strict_types=1);

namespace app\controller;

use app\service\StockTakeScheduleService;
use think\Request;
use think\Response;

/**
 * 盘点定时调度 CRUD（iter-32 B）
 */
class StockTakeSchedule
{
    private StockTakeScheduleService $svc;
    public function __construct() { $this->svc = new StockTakeScheduleService(); }

    public function list(Request $request): Response
    {
        return $this->ok(['list' => $this->svc->list()]);
    }

    public function detail(int $id): Response
    {
        $row = $this->svc->detail($id);
        if (!$row) return $this->err(404, '调度不存在');
        return $this->ok($row);
    }

    public function create(Request $request): Response
    {
        $data = $request->only(['name', 'warehouse_code', 'scope_type', 'scope_value', 'schedule_type', 'hour', 'minute', 'days_of_week', 'day_of_month', 'enabled']);
        $data['created_by'] = $request->admin['username'] ?? 'admin';
        try { return $this->ok($this->svc->create($data)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function update(Request $request, int $id): Response
    {
        $data = $request->only(['name', 'warehouse_code', 'scope_type', 'scope_value', 'schedule_type', 'hour', 'minute', 'days_of_week', 'day_of_month', 'enabled']);
        try { return $this->ok($this->svc->update($id, $data)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function delete(Request $request, int $id): Response
    {
        $this->svc->delete($id);
        return $this->ok(['id' => $id]);
    }

    /**
     * 手动触发一次（不等定时），用于 manual-test 验证不必等到点
     */
    public function triggerNow(Request $request, int $id): Response
    {
        $row = $this->svc->detail($id);
        if (!$row) return $this->err(404, '调度不存在');
        try {
            $take = (new \app\service\StockTakeService())->create([
                'warehouse_code' => $row['warehouse_code'],
                'scope_type' => $row['scope_type'],
                'scope_value' => $row['scope_value'],
                'created_by' => 'manual-trigger#' . $row['id'],
                'remark' => "[手动触发] {$row['name']}",
            ]);
            $takeNo = $take['take']['take_no'] ?? null;
            return $this->ok(['take_no' => $takeNo]);
        } catch (\Throwable $e) {
            return $this->err(500, $e->getMessage());
        }
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
