<?php
declare(strict_types=1);

namespace app\controller;

use think\Request;
use think\Response;
use think\facade\Db;

class Location
{
    public function list(Request $request): Response
    {
        $warehouse = $request->param('warehouse_code');
        $query = Db::name('locations');
        if ($warehouse) $query->where('warehouse_code', $warehouse);
        $rows = $query->order(['warehouse_code' => 'asc', 'location_code' => 'asc'])->select()->toArray();
        return json(['code' => 0, 'msg' => 'ok', 'data' => ['list' => $rows, 'total' => count($rows)]]);
    }

    public function detail(string $code): Response
    {
        $row = Db::name('locations')->where('location_code', $code)->find();
        if (!$row) return $this->err(404, '库位不存在');
        return $this->ok($row);
    }

    public function create(Request $request): Response
    {
        $code = trim((string)$request->param('location_code'));
        $warehouse = trim((string)$request->param('warehouse_code'));
        if (!$code || !$warehouse) return $this->err(400, 'location_code/warehouse_code 必传');
        if (!Db::name('warehouses')->where('warehouse_code', $warehouse)->find()) {
            return $this->err(400, 'warehouse_code 不存在');
        }
        if (Db::name('locations')->where('location_code', $code)->find()) {
            return $this->err(409, 'location_code 已存在');
        }
        Db::name('locations')->insert([
            'location_code' => $code,
            'warehouse_code' => $warehouse,
            'zone' => (string)$request->param('zone', '') ?: null,
            'rack' => (string)$request->param('rack', '') ?: null,
            'level' => (string)$request->param('level', '') ?: null,
            'location_type' => (string)$request->param('location_type', 'storage'),
            'max_weight' => $request->param('max_weight') !== null ? (float)$request->param('max_weight') : null,
            'max_volume' => $request->param('max_volume') !== null ? (float)$request->param('max_volume') : null,
            'is_golden' => (int)(bool)$request->param('is_golden', false),
            'status' => 'available',
        ]);
        return $this->ok(Db::name('locations')->where('location_code', $code)->find());
    }

    /**
     * POST /api/v1/location/batch
     * body: { warehouse_code, zone, rack_from, rack_to, level_from, level_to, location_type? }
     * 按 [zone-rack-level] 组合批量生成，已存在的自动跳过
     */
    public function batch(Request $request): Response
    {
        $warehouse = trim((string)$request->param('warehouse_code'));
        $zone = trim((string)$request->param('zone', 'A'));
        $rackFrom = max(1, (int)$request->param('rack_from', 1));
        $rackTo = (int)$request->param('rack_to', 1);
        $levelFrom = max(1, (int)$request->param('level_from', 1));
        $levelTo = (int)$request->param('level_to', 1);
        $type = (string)$request->param('location_type', 'storage');

        if (!$warehouse) return $this->err(400, 'warehouse_code 必传');
        if (!Db::name('warehouses')->where('warehouse_code', $warehouse)->find()) {
            return $this->err(400, 'warehouse_code 不存在');
        }
        if ($rackTo < $rackFrom || $levelTo < $levelFrom) {
            return $this->err(400, 'rack_to/level_to 必须 >= from');
        }
        $total = ($rackTo - $rackFrom + 1) * ($levelTo - $levelFrom + 1);
        if ($total > 500) return $this->err(400, "一次最多生成 500 个库位（当前 {$total}）");

        $created = 0;
        $skipped = 0;
        Db::startTrans();
        try {
            for ($r = $rackFrom; $r <= $rackTo; $r++) {
                for ($l = $levelFrom; $l <= $levelTo; $l++) {
                    $code = sprintf('%s-%s-%02d-%02d', $warehouse, $zone, $r, $l);
                    if (Db::name('locations')->where('location_code', $code)->find()) {
                        $skipped++;
                        continue;
                    }
                    Db::name('locations')->insert([
                        'location_code' => $code,
                        'warehouse_code' => $warehouse,
                        'zone' => $zone,
                        'rack' => (string)$r,
                        'level' => (string)$l,
                        'location_type' => $type,
                        'status' => 'available',
                    ]);
                    $created++;
                }
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            return $this->err(500, $e->getMessage());
        }
        return $this->ok(['created' => $created, 'skipped' => $skipped, 'total' => $total]);
    }

    public function update(Request $request, string $code): Response
    {
        $row = Db::name('locations')->where('location_code', $code)->find();
        if (!$row) return $this->err(404, '库位不存在');
        $update = [];
        foreach (['zone', 'rack', 'level', 'location_type'] as $f) {
            if ($request->has($f)) $update[$f] = (string)$request->param($f);
        }
        foreach (['max_weight', 'max_volume'] as $f) {
            if ($request->has($f)) {
                $v = $request->param($f);
                $update[$f] = $v !== null && $v !== '' ? (float)$v : null;
            }
        }
        if ($request->has('is_golden')) $update['is_golden'] = (int)(bool)$request->param('is_golden');
        if ($request->has('status')) {
            $status = (string)$request->param('status');
            if (!in_array($status, ['available', 'occupied', 'locked', 'disabled'], true)) {
                return $this->err(400, 'status 非法');
            }
            $update['status'] = $status;
        }
        if (!$update) return $this->err(400, '无可更新字段');
        Db::name('locations')->where('location_code', $code)->update($update);
        return $this->ok(Db::name('locations')->where('location_code', $code)->find());
    }

    public function delete(string $code): Response
    {
        $row = Db::name('locations')->where('location_code', $code)->find();
        if (!$row) return $this->err(404, '库位不存在');
        $invCount = Db::name('inventory')->where('location_code', $code)->where('quantity', '>', 0)->count();
        if ($invCount > 0) return $this->err(409, '该库位仍有库存，不可删除');
        Db::name('locations')->where('location_code', $code)->delete();
        return $this->ok(['location_code' => $code]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
