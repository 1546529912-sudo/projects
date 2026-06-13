<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * WMS-OMS 库存对账（iter-24 P1-2）
 *
 *   不变式：OMS.inventory_status.available ≈ SUM(WMS.inventory.quantity - locked_quantity)
 *
 *   流程：
 *     1) GROUP BY sku → WMS 视角 available
 *     2) 跨库读 oms_db.inventory_status.available
 *     3) diff = WMS - OMS
 *     4) 写头 + details JSON
 *
 *   不自动修复（避免双写灾难）。仅记录 + 允许 admin 确认。
 */
class InventoryReconcileService
{
    public function create(array $data): array
    {
        $scopeType = $data['scope_type'] ?? 'all';
        $scopeValue = $data['scope_value'] ?? null;
        $createdBy = $data['created_by'] ?? 'system';

        // 1) WMS 视角 GROUP BY sku
        $wmsQuery = Db::name('inventory')->where('status', 'normal');
        if ($scopeType === 'sku' && $scopeValue) {
            $wmsQuery->where('sku_code', $scopeValue);
        }
        $wmsRows = $wmsQuery
            ->field('sku_code, SUM(quantity) AS sum_qty, SUM(locked_quantity) AS sum_locked')
            ->group('sku_code')->select()->toArray();
        $wmsMap = [];
        foreach ($wmsRows as $r) {
            $wmsMap[$r['sku_code']] = [
                'wms_qty' => (int)$r['sum_qty'],
                'wms_locked' => (int)$r['sum_locked'],
                'wms_avail' => (int)$r['sum_qty'] - (int)$r['sum_locked'],
            ];
        }

        // 2) OMS 视角
        $omsQuery = Db::connect('oms')->name('inventory_status');
        if ($scopeType === 'sku' && $scopeValue) {
            $omsQuery->where('sku_code', $scopeValue);
        }
        $omsRows = $omsQuery->select()->toArray();
        $omsMap = [];
        foreach ($omsRows as $r) {
            $omsMap[$r['sku_code']] = [
                'oms_avail' => (int)$r['available'],
                'oms_locked' => (int)$r['locked'],
                'oms_reserved' => (int)($r['reserved'] ?? 0),
            ];
        }

        // 3) merge + diff
        $allSkus = array_unique(array_merge(array_keys($wmsMap), array_keys($omsMap)));
        sort($allSkus);
        $details = [];
        $diffCount = 0;
        foreach ($allSkus as $sku) {
            $wms = $wmsMap[$sku] ?? ['wms_qty' => 0, 'wms_locked' => 0, 'wms_avail' => 0];
            $oms = $omsMap[$sku] ?? ['oms_avail' => 0, 'oms_locked' => 0, 'oms_reserved' => 0];
            $diff = $wms['wms_avail'] - $oms['oms_avail'];
            $row = [
                'sku_code' => $sku,
                'wms_qty' => $wms['wms_qty'],
                'wms_locked' => $wms['wms_locked'],
                'wms_avail' => $wms['wms_avail'],
                'oms_avail' => $oms['oms_avail'],
                'oms_locked' => $oms['oms_locked'],
                'oms_reserved' => $oms['oms_reserved'],
                'diff' => $diff,
                'match' => $diff === 0,
            ];
            $details[] = $row;
            if ($diff !== 0) $diffCount++;
        }

        $reconcileNo = 'RC' . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);
        Db::name('inventory_reconcile_log')->insert([
            'reconcile_no' => $reconcileNo,
            'scope_type' => $scopeType,
            'scope_value' => $scopeValue,
            'total_skus' => count($allSkus),
            'diff_count' => $diffCount,
            'status' => 'pending',
            'details' => json_encode($details, JSON_UNESCAPED_UNICODE),
            'created_by' => $createdBy,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->detail($reconcileNo);
    }

    public function list(int $page = 1, int $size = 20): array
    {
        $q = Db::name('inventory_reconcile_log');
        $total = $q->count();
        $rows = (clone $q)->order('id', 'desc')->page($page, $size)
            ->field('id, reconcile_no, scope_type, scope_value, total_skus, diff_count, status, created_by, created_at, confirmed_at')
            ->select()->toArray();
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    public function detail(string $reconcileNo): array
    {
        $row = Db::name('inventory_reconcile_log')->where('reconcile_no', $reconcileNo)->find();
        if (!$row) throw new \RuntimeException('对账记录不存在');
        $row['details'] = $row['details'] ? json_decode($row['details'], true) : [];
        return $row;
    }

    public function confirm(string $reconcileNo): array
    {
        $row = Db::name('inventory_reconcile_log')->where('reconcile_no', $reconcileNo)->find();
        if (!$row) throw new \RuntimeException('对账记录不存在');
        if ($row['status'] === 'confirmed') return $this->detail($reconcileNo);
        Db::name('inventory_reconcile_log')->where('reconcile_no', $reconcileNo)->update([
            'status' => 'confirmed',
            'confirmed_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->detail($reconcileNo);
    }
}
