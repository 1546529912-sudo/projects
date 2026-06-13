<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AuditService;
use think\Request;
use think\Response;
use think\facade\Db;

/**
 * 属性模板 CRUD（iter-30 B）
 *   - GET    /admin/attribute-template/list
 *   - GET    /admin/attribute-template/<id>
 *   - POST   /admin/attribute-template
 *   - PUT    /admin/attribute-template/<id>
 *   - DELETE /admin/attribute-template/<id>
 */
class AttributeTemplate
{
    public function list(Request $request): Response
    {
        $rows = Db::name('attribute_templates')
            ->whereNull('deleted_at')
            ->order('id', 'desc')
            ->select()->toArray();
        foreach ($rows as &$r) {
            $r['attrs'] = is_string($r['attrs']) ? (json_decode($r['attrs'], true) ?: []) : ($r['attrs'] ?? []);
        }
        return $this->ok(['list' => $rows, 'total' => count($rows)]);
    }

    public function detail(int $id): Response
    {
        $row = Db::name('attribute_templates')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) return $this->err(404, '模板不存在');
        $row['attrs'] = is_string($row['attrs']) ? (json_decode($row['attrs'], true) ?: []) : ($row['attrs'] ?? []);
        return $this->ok($row);
    }

    public function create(Request $request): Response
    {
        $code = trim((string)$request->param('code'));
        $name = trim((string)$request->param('name'));
        $desc = trim((string)$request->param('desc', ''));
        $attrs = $request->param('attrs', []);
        if (!$code || !$name) return $this->err(400, 'code/name 必填');
        if (Db::name('attribute_templates')->where('code', $code)->whereNull('deleted_at')->find()) {
            return $this->err(409, 'code 已存在: ' . $code);
        }
        if (!is_array($attrs) || !$attrs) return $this->err(400, 'attrs 至少 1 项');
        foreach ($attrs as $i => $a) {
            if (empty($a['name']) || empty($a['code'])) return $this->err(400, "attrs[{$i}] name/code 必填");
            $type = $a['type'] ?? 'text';
            if (!in_array($type, ['text', 'select', 'number'], true)) {
                return $this->err(400, "attrs[{$i}] type 仅支持 text/select/number");
            }
        }

        $id = Db::name('attribute_templates')->insertGetId([
            'code' => $code, 'name' => $name, 'desc' => $desc ?: null,
            'attrs' => json_encode($attrs, JSON_UNESCAPED_UNICODE),
            'status' => 'enabled',
        ]);
        AuditService::log('attribute_template.create', 'attribute_template', (string)$id, null,
            ['code' => $code, 'name' => $name, 'attrs_count' => count($attrs)]);
        return $this->detail($id);
    }

    public function update(Request $request, int $id): Response
    {
        $row = Db::name('attribute_templates')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) return $this->err(404, '模板不存在');

        $update = [];
        if ($request->has('name')) $update['name'] = trim((string)$request->param('name'));
        if ($request->has('desc')) $update['desc'] = trim((string)$request->param('desc')) ?: null;
        if ($request->has('attrs')) {
            $attrs = $request->param('attrs');
            if (!is_array($attrs) || !$attrs) return $this->err(400, 'attrs 至少 1 项');
            foreach ($attrs as $i => $a) {
                if (empty($a['name']) || empty($a['code'])) return $this->err(400, "attrs[{$i}] name/code 必填");
            }
            $update['attrs'] = json_encode($attrs, JSON_UNESCAPED_UNICODE);
        }
        if ($request->has('status')) {
            $s = (string)$request->param('status');
            if (!in_array($s, ['enabled', 'disabled'], true)) return $this->err(400, 'status 只能 enabled/disabled');
            $update['status'] = $s;
        }
        if (!$update) return $this->err(400, '无可更新字段');

        Db::name('attribute_templates')->where('id', $id)->update($update);
        AuditService::log('attribute_template.update', 'attribute_template', (string)$id,
            array_intersect_key($row, $update), $update);
        return $this->detail($id);
    }

    public function delete(int $id): Response
    {
        $row = Db::name('attribute_templates')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) return $this->err(404, '模板不存在');
        Db::name('attribute_templates')->where('id', $id)->update(['deleted_at' => date('Y-m-d H:i:s')]);
        AuditService::log('attribute_template.delete', 'attribute_template', (string)$id, $row, null);
        return $this->ok(['id' => $id]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
