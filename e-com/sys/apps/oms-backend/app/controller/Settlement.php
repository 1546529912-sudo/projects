<?php
declare(strict_types=1);

namespace app\controller;

use app\service\SettlementService;
use think\facade\Db;
use think\Request;
use think\Response;

/**
 * 财务结算单（iter-26 P0-3）
 *   - super_admin + sales_ops（运营关心营收）
 */
class Settlement
{
    private SettlementService $svc;
    public function __construct() { $this->svc = new SettlementService(); }

    public function list(Request $request): Response
    {
        $filter = $request->only(['type', 'status', 'start_date', 'end_date']);
        $page = max(1, (int)$request->param('page', 1));
        $size = min(100, max(1, (int)$request->param('size', 20)));
        return $this->ok($this->svc->list($filter, $page, $size));
    }

    public function detail(Request $request, string $no): Response
    {
        try { return $this->ok($this->svc->detail($no)); }
        catch (\Throwable $e) { return $this->err(404, $e->getMessage()); }
    }

    public function settle(Request $request, string $no): Response
    {
        try { return $this->ok($this->svc->settle($no)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /**
     * CSV 导出（限制 type / 日期范围）
     */
    public function export(Request $request): Response
    {
        $type = $request->param('type');
        $start = $request->param('start_date');
        $end = $request->param('end_date');
        $q = Db::name('settlement_orders');
        if ($type) $q->where('type', $type);
        if ($start) $q->where('created_at', '>=', $start);
        if ($end) $q->where('created_at', '<=', $end);
        $rows = $q->order('id', 'desc')->limit(5000)->select()->toArray();

        $headers = ['结算单号', '类型', '关联单号', '用户ID', '金额(元)', '商品金额(元)', '运费(元)', '优惠(元)', '状态', '备注', '创建时间', '入账时间'];
        $body = [];
        foreach ($rows as $r) {
            $body[] = [
                $r['settlement_no'],
                $r['type'] === 'order' ? '订单' : '退款',
                $r['ref_no'], $r['user_id'],
                number_format(((int)$r['amount']) / 100, 2, '.', ''),
                number_format(((int)$r['goods_amount']) / 100, 2, '.', ''),
                number_format(((int)$r['freight']) / 100, 2, '.', ''),
                number_format(((int)$r['discount']) / 100, 2, '.', ''),
                $r['status'] === 'settled' ? '已入账' : '未入账',
                $r['remark'], $r['created_at'], $r['settled_at'],
            ];
        }
        $filename = "settlement_" . date('Ymd_His') . ".csv";
        return $this->csv($filename, $headers, $body);
    }

    private function csv(string $filename, array $headers, array $rows): Response
    {
        $fh = fopen('php://temp', 'r+');
        fwrite($fh, "\xEF\xBB\xBF");  // UTF-8 BOM
        fputcsv($fh, $headers);
        foreach ($rows as $row) fputcsv($fh, $row);
        rewind($fh);
        $body = stream_get_contents($fh);
        fclose($fh);
        return response($body, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
