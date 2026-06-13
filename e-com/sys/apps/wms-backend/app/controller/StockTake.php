<?php
declare(strict_types=1);

namespace app\controller;

use app\service\StockTakeService;
use think\Request;
use think\Response;

/**
 * 盘点（iter-22）
 *   路由层 super_admin + warehouse
 */
class StockTake
{
    private StockTakeService $svc;
    public function __construct() { $this->svc = new StockTakeService(); }

    public function create(Request $request): Response
    {
        $data = $request->only(['warehouse_code', 'scope_type', 'scope_value', 'remark']);
        $data['created_by'] = $request->admin['username'] ?? 'admin';
        try {
            return $this->ok($this->svc->create($data));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function list(Request $request): Response
    {
        $filter = $request->only(['warehouse_code', 'status']);
        $page = max(1, (int)$request->param('page', 1));
        $size = min(100, max(1, (int)$request->param('size', 20)));
        return $this->ok($this->svc->list($filter, $page, $size));
    }

    public function detail(Request $request, string $takeNo): Response
    {
        try { return $this->ok($this->svc->detail($takeNo)); }
        catch (\Throwable $e) { return $this->err(404, $e->getMessage()); }
    }

    public function start(Request $request, string $takeNo): Response
    {
        try { return $this->ok($this->svc->start($takeNo)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function record(Request $request, string $takeNo, int $itemId): Response
    {
        $actual = (int)$request->param('actual_qty', -1);
        try { return $this->ok($this->svc->record($takeNo, $itemId, $actual)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function complete(Request $request, string $takeNo): Response
    {
        try {
            $r = $this->svc->complete($takeNo);
            $this->svc->publishPendingEvent();  // iter-24 P0-3
            return $this->ok($r);
        }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function cancel(Request $request, string $takeNo): Response
    {
        try { return $this->ok($this->svc->cancel($takeNo)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    // iter-69 Q22-02 盘点单 CSV 导出
    public function exportCsv(Request $request): Response
    {
        $status = (string)$request->param('status', '');
        $q = \think\facade\Db::name('stock_takes');
        if ($status) $q->where('status', $status);
        $rows = $q->order('id', 'desc')->limit(5000)->select()->toArray();
        $body = "盘点单号,仓库,状态,差异SKU数,差异总qty,创建时间,完成时间\n";
        foreach ($rows as $r) {
            $body .= sprintf("%s,%s,%s,%d,%d,%s,%s\n",
                $r['take_no'], $r['warehouse_code'] ?? '', $r['status'],
                (int)($r['diff_sku_count'] ?? 0), (int)($r['diff_total_qty'] ?? 0),
                $r['created_at'], $r['completed_at'] ?? '');
        }
        return response($body, 200, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="stock_takes_' . date('Ymd_His') . '.csv"',
        ]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
