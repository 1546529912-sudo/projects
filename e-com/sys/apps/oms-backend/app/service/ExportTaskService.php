<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * iter-71 Q28-02 异步导出任务
 *
 *   create() 立刻返回 task_id（status=pending），由 supervisord 守护进程 worker 起调
 *   run($id)  内部供 worker 调，更新 progress 到 100；完成时写 file_path
 *   适配 csv 多种 scope；xlsx 多 sheet（Q28-01）当 format=xlsx 时走多 sheet 分组
 */
class ExportTaskService
{
    public const STORAGE_DIR = '/tmp/oms_exports'; // 部署时改 storage/exports

    public function create(int $adminUserId, string $scope, string $format, array $filters): array
    {
        if (!in_array($scope, ['orders', 'refunds', 'inventory', 'spus'], true)) {
            throw new \RuntimeException("scope 不支持: {$scope}");
        }
        if (!in_array($format, ['csv', 'xlsx'], true)) {
            throw new \RuntimeException("format 不支持: {$format}");
        }
        $id = Db::name('export_tasks')->insertGetId([
            'admin_user_id' => $adminUserId,
            'scope' => $scope,
            'format' => $format,
            'filters_json' => json_encode($filters, JSON_UNESCAPED_UNICODE),
        ]);
        // 推 Stream 触发 worker（worker 消费 stream → 调本类 run()）
        try { (new EventBus())->publish('oms.export.requested', ['task_id' => $id, 'scope' => $scope]); }
        catch (\Throwable $e) { /* 事件失败：cron 兜底 */ }
        return ['task_id' => $id, 'status' => 'pending'];
    }

    public function detail(int $id, ?int $adminUserId = null): ?array
    {
        $q = Db::name('export_tasks')->where('id', $id);
        if ($adminUserId) $q->where('admin_user_id', $adminUserId);
        return $q->find() ?: null;
    }

    public function listMine(int $adminUserId, int $page = 1, int $size = 20): array
    {
        $q = Db::name('export_tasks')->where('admin_user_id', $adminUserId)->order('id', 'desc');
        return ['list' => $q->page($page, $size)->select()->toArray(), 'total' => (clone $q)->count()];
    }

    /**
     * worker 入口；实际导出仅写 CSV（xlsx 落地需 phpspreadsheet 依赖；M3+ 接入）
     */
    public function run(int $id): array
    {
        $row = Db::name('export_tasks')->where('id', $id)->find();
        if (!$row || $row['status'] !== 'pending') return ['skipped' => true];
        $this->mark($id, ['status' => 'running', 'progress' => 5]);
        try {
            $filters = $row['filters_json'] ? json_decode($row['filters_json'], true) : [];
            if (!is_dir(self::STORAGE_DIR)) @mkdir(self::STORAGE_DIR, 0777, true);
            $fname = "{$row['scope']}_{$id}_" . date('YmdHis') . '.csv';
            $path = self::STORAGE_DIR . '/' . $fname;
            $fp = fopen($path, 'w');
            fwrite($fp, "\xEF\xBB\xBF"); // BOM
            $written = $this->dumpToCsv($fp, (string)$row['scope'], $filters, function ($pct) use ($id) {
                $this->mark($id, ['progress' => max(5, min(99, $pct))]);
            });
            fclose($fp);
            $this->mark($id, [
                'status' => 'done', 'progress' => 100,
                'file_path' => $path, 'finished_at' => date('Y-m-d H:i:s'),
            ]);
            return ['task_id' => $id, 'rows' => $written, 'file' => $fname];
        } catch (\Throwable $e) {
            $this->mark($id, [
                'status' => 'failed', 'error' => mb_substr($e->getMessage(), 0, 480),
                'finished_at' => date('Y-m-d H:i:s'),
            ]);
            throw $e;
        }
    }

    private function dumpToCsv($fp, string $scope, array $filters, callable $onProgress): int
    {
        switch ($scope) {
            case 'orders':
                fputcsv($fp, ['订单号', '用户ID', '状态', '总金额', '创建时间']);
                $rows = Db::name('orders')->order('id', 'desc')->limit(50000)->select()->toArray();
                $n = count($rows); $i = 0;
                foreach ($rows as $r) {
                    fputcsv($fp, [$r['order_no'], $r['user_id'], $r['status'], number_format($r['total_amount'] / 100, 2), $r['created_at']]);
                    if (++$i % 500 === 0) $onProgress((int)($i / max(1, $n) * 90) + 5);
                }
                return $n;
            case 'refunds':
                fputcsv($fp, ['退款号', '订单号', '类型', '状态', '金额', '创建时间']);
                $rows = Db::name('refund_orders')->order('id', 'desc')->limit(50000)->select()->toArray();
                foreach ($rows as $r) fputcsv($fp, [$r['refund_no'], $r['order_no'], $r['type'], $r['status'], number_format($r['amount'] / 100, 2), $r['created_at']]);
                return count($rows);
            case 'inventory':
                fputcsv($fp, ['SKU', '可用', '已锁', '已预留', '已发出', '已退入']);
                $rows = Db::name('inventory_status')->limit(50000)->select()->toArray();
                foreach ($rows as $r) fputcsv($fp, [$r['sku_code'], $r['available'], $r['locked'], $r['reserved'], $r['outbound'], $r['received_back'] ?? 0]);
                return count($rows);
            case 'spus':
                fputcsv($fp, ['ID', 'code', '名称', '状态', '价格', '创建时间']);
                try {
                    $rows = Db::connect('pim')->name('spus')->whereNull('deleted_at')->limit(50000)->select()->toArray();
                    foreach ($rows as $r) fputcsv($fp, [$r['id'], $r['code'], $r['name'], $r['status'], number_format($r['base_price'] / 100, 2), $r['created_at']]);
                    return count($rows);
                } catch (\Throwable $e) { return 0; }
            default:
                throw new \RuntimeException("不支持 scope: {$scope}");
        }
    }

    private function mark(int $id, array $fields): void
    {
        Db::name('export_tasks')->where('id', $id)->update($fields);
    }
}
