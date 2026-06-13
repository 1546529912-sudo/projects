<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AuditService;
use think\Request;
use think\Response;
use think\facade\Db;

class Category
{
    public function list(Request $request): Response
    {
        $rows = Db::name('categories')
            ->whereNull('deleted_at')
            ->order(['parent_id' => 'asc', 'sort' => 'asc'])
            ->select()->toArray();
        return json(['code' => 0, 'msg' => 'ok', 'data' => ['list' => $rows, 'total' => count($rows)]]);
    }

    public function detail(int $id): Response
    {
        $row = Db::name('categories')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) return $this->err(404, '类目不存在');
        return $this->ok($row);
    }

    public function create(Request $request): Response
    {
        $code = trim((string)$request->param('code'));
        $name = trim((string)$request->param('name'));
        $parentId = (int)$request->param('parent_id', 0);
        $level = (int)$request->param('level', 1);
        $sort = (int)$request->param('sort', 0);
        $iconUrl = (string)$request->param('icon_url', '');

        if (!$code || !$name) return $this->err(400, 'code/name 必传');
        if (Db::name('categories')->where('code', $code)->whereNull('deleted_at')->find()) {
            return $this->err(409, 'code 已存在: ' . $code);
        }
        if ($parentId > 0) {
            $parent = Db::name('categories')->where('id', $parentId)->whereNull('deleted_at')->find();
            if (!$parent) return $this->err(400, 'parent_id 不存在');
            $level = (int)$parent['level'] + 1;
            if ($level > 5) return $this->err(400, '类目最多 5 级');
        }

        $id = Db::name('categories')->insertGetId([
            'code' => $code, 'name' => $name, 'parent_id' => $parentId,
            'level' => $level, 'sort' => $sort, 'status' => 'enabled',
            'icon_url' => $iconUrl ?: null,
        ]);
        AuditService::log('category.create', 'category', (string)$id, null,
            ['code' => $code, 'name' => $name, 'parent_id' => $parentId, 'level' => $level]);
        return $this->ok(Db::name('categories')->where('id', $id)->find());
    }

    public function update(Request $request, int $id): Response
    {
        $row = Db::name('categories')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) return $this->err(404, '类目不存在');

        $update = [];
        if ($request->has('name')) $update['name'] = trim((string)$request->param('name'));
        if ($request->has('sort')) $update['sort'] = (int)$request->param('sort');
        if ($request->has('icon_url')) $update['icon_url'] = (string)$request->param('icon_url') ?: null;
        if ($request->has('status')) {
            $status = (string)$request->param('status');
            if (!in_array($status, ['enabled', 'disabled'], true)) {
                return $this->err(400, 'status 只能 enabled/disabled');
            }
            $update['status'] = $status;
        }
        if (!$update) return $this->err(400, '无可更新字段');

        Db::name('categories')->where('id', $id)->update($update);
        AuditService::log('category.update', 'category', (string)$id,
            array_intersect_key($row, $update), $update);
        return $this->ok(Db::name('categories')->where('id', $id)->find());
    }

    public function delete(int $id): Response
    {
        $row = Db::name('categories')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) return $this->err(404, '类目不存在');

        $childCount = Db::name('categories')->where('parent_id', $id)->whereNull('deleted_at')->count();
        if ($childCount > 0) return $this->err(409, "存在 {$childCount} 个子类目，不可删除");
        $spuCount = Db::name('spus')->where('category_id', $id)->whereNull('deleted_at')->count();
        if ($spuCount > 0) return $this->err(409, "存在 {$spuCount} 个 SPU 引用此类目，不可删除");

        Db::name('categories')->where('id', $id)->update(['deleted_at' => date('Y-m-d H:i:s')]);
        AuditService::log('category.delete', 'category', (string)$id, $row, null);
        return $this->ok(['id' => $id]);
    }

    public function reorder(Request $request): Response
    {
        $items = $request->param('items', []);
        if (!is_array($items) || !$items) return $this->err(400, 'items 必传');
        Db::startTrans();
        try {
            foreach ($items as $it) {
                $cid = (int)($it['id'] ?? 0);
                $sort = (int)($it['sort'] ?? 0);
                if ($cid > 0) {
                    Db::name('categories')->where('id', $cid)->update(['sort' => $sort]);
                }
            }
            Db::commit();
        } catch (\Throwable $e) {
            Db::rollback();
            return $this->err(500, $e->getMessage());
        }
        AuditService::log('category.reorder', 'category', '*', null,
            ['updated_ids' => array_map(fn($it) => (int)($it['id'] ?? 0), $items)]);
        return $this->ok(['updated' => count($items)]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
