<?php
declare(strict_types=1);

namespace app\controller;

use think\Request;
use think\Response;
use think\facade\Db;

class Inventory
{
    public function list(Request $request): Response
    {
        $sku = $request->param('sku_code');
        $query = Db::name('inventory');
        // iter-38 BIZ-08-4: 店铺过滤
        $storeIds = $request->store_ids ?? null;
        if ($storeIds !== null) {
            if (!$storeIds) { return json(['code' => 0, 'msg' => 'ok', 'data' => ['list' => [], 'total' => 0]]); }
            $query->whereIn('store_id', $storeIds);
        }
        if ($sid = (int)$request->param('store_id', 0)) $query->where('store_id', $sid);
        if ($sku) $query->where('sku_code', $sku);
        $rows = $query->order(['sku_code' => 'asc', 'location_code' => 'asc'])->select()->toArray();
        return json(['code' => 0, 'msg' => 'ok', 'data' => ['list' => $rows, 'total' => count($rows)]]);
    }

    /**
     * iter-24 P0-1: 库存变动日志查询
     *   GET /admin/inventory-log/list?sku_code=&location_code=&change_type=&ref_no=&page=&size=
     */
    public function logList(Request $request): Response
    {
        $q = Db::name('inventory_log');
        if ($sku = $request->param('sku_code')) $q->where('sku_code', $sku);
        if ($loc = $request->param('location_code')) $q->where('location_code', $loc);
        if ($ct = $request->param('change_type')) $q->where('change_type', $ct);
        if ($ref = $request->param('ref_no')) $q->where('ref_no', $ref);
        $page = max(1, (int)$request->param('page', 1));
        $size = min(200, max(1, (int)$request->param('size', 50)));
        $total = $q->count();
        $rows = (clone $q)->order('id', 'desc')->page($page, $size)->select()->toArray();
        return json(['code' => 0, 'msg' => 'ok', 'data' => ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows]]);
    }
}
