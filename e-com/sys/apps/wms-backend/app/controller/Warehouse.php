<?php
declare(strict_types=1);

namespace app\controller;

use think\Request;
use think\Response;
use think\facade\Db;

class Warehouse
{
    /**
     * iter-38 BIZ-08-4 辅助：应用店铺过滤
     */
    private function applyStoreFilter($query, ?array $storeIds): void
    {
        if ($storeIds === null) return;
        if (!$storeIds) { $query->where('1=0'); return; }
        $query->whereIn('store_id', $storeIds);
    }

    private function resolveCreateStoreId(Request $request, ?array $storeIds): int
    {
        $paramSid = $request->param('store_id');
        if ($storeIds === null) return $paramSid ? (int)$paramSid : 1;
        if (!$storeIds) throw new \RuntimeException('当前账号未关联任何店铺');
        if (count($storeIds) === 1) return $storeIds[0];
        if (!$paramSid) throw new \RuntimeException('当前账号关联多店，请传 store_id');
        $sid = (int)$paramSid;
        if (!in_array($sid, $storeIds, true)) throw new \RuntimeException("store_id={$sid} 不在你关联店铺内");
        return $sid;
    }

    private function assertStoreAccess(array $row, ?array $storeIds): void
    {
        if ($storeIds === null) return;
        if (!in_array((int)($row['store_id'] ?? 0), $storeIds, true)) {
            throw new \RuntimeException('无权访问此店铺数据');
        }
    }

    public function list(Request $request): Response
    {
        $query = Db::name('warehouses')->order('id', 'asc');
        $this->applyStoreFilter($query, $request->store_ids ?? null);
        if ($sid = (int)$request->param('store_id', 0)) $query->where('store_id', $sid);
        $rows = $query->select()->toArray();
        return json(['code' => 0, 'msg' => 'ok', 'data' => ['list' => $rows, 'total' => count($rows)]]);
    }

    public function detail(Request $request, string $code): Response
    {
        $row = Db::name('warehouses')->where('warehouse_code', $code)->find();
        if (!$row) return $this->err(404, '仓库不存在');
        try { $this->assertStoreAccess($row, $request->store_ids ?? null); }
        catch (\Throwable $e) { return $this->err(403, $e->getMessage()); }
        return $this->ok($row);
    }

    public function create(Request $request): Response
    {
        $code = trim((string)$request->param('warehouse_code'));
        $name = trim((string)$request->param('warehouse_name'));
        if (!$code || !$name) return $this->err(400, 'warehouse_code/warehouse_name 必传');
        if (Db::name('warehouses')->where('warehouse_code', $code)->find()) {
            return $this->err(409, 'warehouse_code 已存在');
        }
        try { $storeId = $this->resolveCreateStoreId($request, $request->store_ids ?? null); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }

        $whType = (string)$request->param('warehouse_type', $storeId === 1 ? 'self' : 'merchant');
        if (!in_array($whType, ['self', 'merchant'], true)) {
            return $this->err(400, 'warehouse_type 仅 self/merchant');
        }

        Db::name('warehouses')->insert([
            'warehouse_code' => $code,
            'warehouse_name' => $name,
            'store_id' => $storeId,
            'warehouse_type' => $whType,
            'address' => (string)$request->param('address', '') ?: null,
            'contact' => (string)$request->param('contact', '') ?: null,
            'phone' => (string)$request->param('phone', '') ?: null,
            'status' => 'enabled',
        ]);
        return $this->ok(Db::name('warehouses')->where('warehouse_code', $code)->find());
    }

    public function update(Request $request, string $code): Response
    {
        $row = Db::name('warehouses')->where('warehouse_code', $code)->find();
        if (!$row) return $this->err(404, '仓库不存在');
        try { $this->assertStoreAccess($row, $request->store_ids ?? null); }
        catch (\Throwable $e) { return $this->err(403, $e->getMessage()); }

        $update = [];
        foreach (['warehouse_name', 'address', 'contact', 'phone'] as $f) {
            if ($request->has($f)) $update[$f] = (string)$request->param($f) ?: null;
        }
        if ($request->has('status')) {
            $status = (string)$request->param('status');
            if (!in_array($status, ['enabled', 'disabled'], true)) {
                return $this->err(400, 'status 非法');
            }
            $update['status'] = $status;
        }
        if (!$update) return $this->err(400, '无可更新字段');
        Db::name('warehouses')->where('warehouse_code', $code)->update($update);
        return $this->ok(Db::name('warehouses')->where('warehouse_code', $code)->find());
    }

    public function delete(Request $request, string $code): Response
    {
        $row = Db::name('warehouses')->where('warehouse_code', $code)->find();
        if (!$row) return $this->err(404, '仓库不存在');
        try { $this->assertStoreAccess($row, $request->store_ids ?? null); }
        catch (\Throwable $e) { return $this->err(403, $e->getMessage()); }
        $locCount = Db::name('locations')->where('warehouse_code', $code)->count();
        if ($locCount > 0) return $this->err(409, "存在 {$locCount} 个库位，不可删除");
        $outCount = Db::name('outbound_orders')->where('warehouse_code', $code)->count();
        if ($outCount > 0) return $this->err(409, "存在 {$outCount} 个出库单引用，不可删除");
        $inCount = Db::name('inbound_orders')->where('warehouse_code', $code)->count();
        if ($inCount > 0) return $this->err(409, "存在 {$inCount} 个入库单引用，不可删除");
        Db::name('warehouses')->where('warehouse_code', $code)->delete();
        return $this->ok(['warehouse_code' => $code]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
