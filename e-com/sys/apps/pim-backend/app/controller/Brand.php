<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AuditService;
use think\Request;
use think\Response;
use think\facade\Db;

class Brand
{
    public function list(Request $request): Response
    {
        $rows = Db::name('brands')
            ->whereNull('deleted_at')
            ->order('sort', 'asc')
            ->select()->toArray();
        return json(['code' => 0, 'msg' => 'ok', 'data' => ['list' => $rows, 'total' => count($rows)]]);
    }

    public function detail(int $id): Response
    {
        $row = Db::name('brands')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) return $this->err(404, '品牌不存在');
        return $this->ok($row);
    }

    public function create(Request $request): Response
    {
        $code = trim((string)$request->param('code'));
        $name = trim((string)$request->param('name'));
        $logoUrl = (string)$request->param('logo_url', '');
        $desc = (string)$request->param('desc', '');
        $sort = (int)$request->param('sort', 0);

        if (!$code || !$name) return $this->err(400, 'code/name 必传');
        if (Db::name('brands')->where('code', $code)->whereNull('deleted_at')->find()) {
            return $this->err(409, 'code 已存在: ' . $code);
        }

        $id = Db::name('brands')->insertGetId([
            'code' => $code, 'name' => $name,
            'logo_url' => $logoUrl ?: null, 'desc' => $desc ?: null,
            'sort' => $sort, 'status' => 'enabled',
        ]);
        AuditService::log('brand.create', 'brand', (string)$id, null, ['code' => $code, 'name' => $name]);
        return $this->ok(Db::name('brands')->where('id', $id)->find());
    }

    public function update(Request $request, int $id): Response
    {
        $row = Db::name('brands')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) return $this->err(404, '品牌不存在');

        $update = [];
        foreach (['name', 'logo_url', 'desc'] as $field) {
            if ($request->has($field)) {
                $v = (string)$request->param($field);
                $update[$field] = $v ?: null;
            }
        }
        if ($request->has('sort')) $update['sort'] = (int)$request->param('sort');
        if ($request->has('status')) {
            $status = (string)$request->param('status');
            if (!in_array($status, ['enabled', 'disabled'], true)) {
                return $this->err(400, 'status 只能 enabled/disabled');
            }
            $update['status'] = $status;
        }
        if (!$update) return $this->err(400, '无可更新字段');

        Db::name('brands')->where('id', $id)->update($update);
        AuditService::log('brand.update', 'brand', (string)$id,
            array_intersect_key($row, $update), $update);
        return $this->ok(Db::name('brands')->where('id', $id)->find());
    }

    public function delete(int $id): Response
    {
        $row = Db::name('brands')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) return $this->err(404, '品牌不存在');

        $spuCount = Db::name('spus')->where('brand_id', $id)->whereNull('deleted_at')->count();
        if ($spuCount > 0) return $this->err(409, "存在 {$spuCount} 个 SPU 引用此品牌，不可删除");

        Db::name('brands')->where('id', $id)->update(['deleted_at' => date('Y-m-d H:i:s')]);
        AuditService::log('brand.delete', 'brand', (string)$id, $row, null);
        return $this->ok(['id' => $id]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
