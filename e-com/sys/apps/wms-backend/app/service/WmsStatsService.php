<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * WMS Dashboard 数据聚合（iter-25）
 *
 *   响应：
 *     - kpi: warehouses / locations / sku_count / total_quantity / total_locked / today_picking_pending
 *     - warehouse_utilization[]: { warehouse_code, total_locations, used_locations, util_pct, total_qty }
 *     - inbound_series[]: { date, count, qty }    入库单数 + 入库总量
 *     - outbound_series[]: { date, count, qty }   出库单数 + 出库总量
 *     - picking_efficiency: { completed_count, avg_seconds, median_seconds }
 *     - top_skus[]: 量最大的 SKU TOP 10（按当前 inventory）
 */
class WmsStatsService
{
    public function stats(int $days = 7): array
    {
        $days = max(1, min(90, $days));
        $start = date('Y-m-d', strtotime("-{$days} days"));
        $end = date('Y-m-d', strtotime('+1 day'));

        return [
            'days' => $days,
            'kpi' => $this->kpi(),
            'warehouse_utilization' => $this->warehouseUtilization(),
            'inbound_series' => $this->inboundSeries($start, $end, $days),
            'outbound_series' => $this->outboundSeries($start, $end, $days),
            'picking_efficiency' => $this->pickingEfficiency($start, $end),
            'top_skus' => $this->topSkus(),
        ];
    }

    private function kpi(): array
    {
        return [
            'warehouses' => (int)Db::name('warehouses')->count(),
            'locations' => (int)Db::name('locations')->count(),
            'sku_count' => (int)Db::name('inventory')->where('status', 'normal')
                ->distinct(true)->field('sku_code')->select()->count(),
            'total_quantity' => (int)Db::name('inventory')->where('status', 'normal')->sum('quantity'),
            'total_locked' => (int)Db::name('inventory')->where('status', 'normal')->sum('locked_quantity'),
            'today_picking_pending' => (int)Db::name('picking_tasks')
                ->whereIn('status', ['pending', 'assigned', 'partial'])
                ->count(),
        ];
    }

    private function warehouseUtilization(): array
    {
        $whs = Db::name('warehouses')->select()->toArray();
        $out = [];
        foreach ($whs as $w) {
            $code = $w['warehouse_code'];
            $totalLocs = (int)Db::name('locations')->where('warehouse_code', $code)->count();
            // 用 inventory 算占用的库位数 + 总 qty
            $usedLocs = (int)Db::name('inventory')->alias('i')
                ->join('locations l', 'l.location_code = i.location_code')
                ->where('l.warehouse_code', $code)
                ->where('i.status', 'normal')
                ->where('i.quantity', '>', 0)
                ->distinct(true)->field('i.location_code')
                ->select()->count();
            $totalQty = (int)Db::name('inventory')->alias('i')
                ->join('locations l', 'l.location_code = i.location_code')
                ->where('l.warehouse_code', $code)
                ->where('i.status', 'normal')
                ->sum('i.quantity');
            $util = $totalLocs > 0 ? round($usedLocs / $totalLocs * 100, 2) : 0;
            $out[] = [
                'warehouse_code' => $code,
                'warehouse_name' => $w['warehouse_name'] ?? $code,
                'total_locations' => $totalLocs,
                'used_locations' => $usedLocs,
                'util_pct' => $util,
                'total_qty' => $totalQty,
            ];
        }
        return $out;
    }

    private function inboundSeries(string $start, string $end, int $days): array
    {
        // 入库单数 + 入库总量（按 created_at 日分组）
        $rows = Db::name('inbound_orders')
            ->where('created_at', '>=', $start)
            ->where('created_at', '<', $end)
            ->field("DATE(created_at) AS d, COUNT(*) AS cnt")
            ->group('d')->select()->toArray();
        $byDate = [];
        foreach ($rows as $r) $byDate[$r['d']] = ['cnt' => (int)$r['cnt']];

        // qty 从 inbound_items 算
        $qtyRows = Db::name('inbound_orders')->alias('o')
            ->join('inbound_items i', 'i.inbound_no = o.inbound_no')
            ->where('o.created_at', '>=', $start)
            ->where('o.created_at', '<', $end)
            ->field("DATE(o.created_at) AS d, SUM(i.expected_qty) AS qty")
            ->group('d')->select()->toArray();
        $qtyByDate = [];
        foreach ($qtyRows as $r) $qtyByDate[$r['d']] = (int)$r['qty'];

        return $this->fillDays($byDate, $qtyByDate, $days);
    }

    private function outboundSeries(string $start, string $end, int $days): array
    {
        $rows = Db::name('outbound_orders')
            ->where('created_at', '>=', $start)
            ->where('created_at', '<', $end)
            ->field("DATE(created_at) AS d, COUNT(*) AS cnt")
            ->group('d')->select()->toArray();
        $byDate = [];
        foreach ($rows as $r) $byDate[$r['d']] = ['cnt' => (int)$r['cnt']];

        $qtyRows = Db::name('outbound_orders')->alias('o')
            ->join('outbound_items i', 'i.outbound_no = o.outbound_no')
            ->where('o.created_at', '>=', $start)
            ->where('o.created_at', '<', $end)
            ->field("DATE(o.created_at) AS d, SUM(i.qty) AS qty")
            ->group('d')->select()->toArray();
        $qtyByDate = [];
        foreach ($qtyRows as $r) $qtyByDate[$r['d']] = (int)$r['qty'];

        return $this->fillDays($byDate, $qtyByDate, $days);
    }

    private function fillDays(array $byDate, array $qtyByDate, int $days): array
    {
        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $out[] = [
                'date' => $d,
                'count' => $byDate[$d]['cnt'] ?? 0,
                'qty' => $qtyByDate[$d] ?? 0,
            ];
        }
        return $out;
    }

    private function pickingEfficiency(string $start, string $end): array
    {
        // 仅算已完成且有 assigned_at 的任务
        $rows = Db::name('picking_tasks')
            ->whereNotNull('assigned_at')
            ->whereNotNull('picked_at')
            ->where('picked_at', '>=', $start)
            ->where('picked_at', '<', $end)
            ->field('UNIX_TIMESTAMP(picked_at) - UNIX_TIMESTAMP(assigned_at) AS sec')
            ->select()->toArray();
        $secs = array_map(fn($r) => (int)$r['sec'], $rows);
        sort($secs);
        $n = count($secs);
        $avg = $n > 0 ? round(array_sum($secs) / $n, 0) : 0;
        $median = $n > 0 ? $secs[intval($n / 2)] : 0;
        return [
            'completed_count' => $n,
            'avg_seconds' => $avg,
            'median_seconds' => $median,
        ];
    }

    private function topSkus(): array
    {
        $rows = Db::name('inventory')
            ->where('status', 'normal')
            ->field('sku_code, SUM(quantity) AS total_qty, SUM(locked_quantity) AS total_locked')
            ->group('sku_code')
            ->order('total_qty', 'desc')
            ->limit(10)
            ->select()->toArray();
        return array_map(fn($r) => [
            'sku_code' => $r['sku_code'],
            'total_qty' => (int)$r['total_qty'],
            'total_locked' => (int)$r['total_locked'],
            'available' => (int)$r['total_qty'] - (int)$r['total_locked'],
        ], $rows);
    }
}
