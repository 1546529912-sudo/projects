<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AuditService;
use think\facade\Db;
use think\Request;
use think\Response;

/**
 * 后台评价管理（iter-20）
 *   - 读 shop_db.reviews（通过 shop 副连接）
 *   - hide / restore 软切 status
 *   - 路由层 super_admin + sales_ops
 */
class Review
{
    private function tbl(string $name)
    {
        return Db::connect('shop')->name($name);
    }

    public function list(Request $request): Response
    {
        $page = max(1, (int)$request->param('page', 1));
        $size = min(100, max(1, (int)$request->param('size', 20)));
        $status = (string)$request->param('status', '');
        $spuId = (int)$request->param('spu_id', 0);

        $q = $this->tbl('reviews');
        if ($status !== '') $q->where('status', $status);
        if ($spuId > 0) $q->where('spu_id', $spuId);

        $total = $q->count();
        $rows = (clone $q)
            ->order('id', 'desc')
            ->page($page, $size)
            ->select()
            ->toArray();
        foreach ($rows as &$r) {
            $r['images'] = $r['images'] ? json_decode($r['images'], true) : [];
        }
        return $this->ok(['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows]);
    }

    public function hide(Request $request, int $id): Response
    {
        $row = $this->tbl('reviews')->where('id', $id)->find();
        if (!$row) return $this->err(404, '评价不存在');
        $this->tbl('reviews')->where('id', $id)->update(['status' => 'hidden']);
        $this->audit($request, 'review.hide', (string)$id, $row, ['status' => 'hidden']);
        return $this->ok(['id' => $id, 'status' => 'hidden']);
    }

    public function restore(Request $request, int $id): Response
    {
        $row = $this->tbl('reviews')->where('id', $id)->find();
        if (!$row) return $this->err(404, '评价不存在');
        $this->tbl('reviews')->where('id', $id)->update(['status' => 'active']);
        $this->audit($request, 'review.restore', (string)$id, $row, ['status' => 'active']);
        return $this->ok(['id' => $id, 'status' => 'active']);
    }

    private function audit(Request $request, string $action, string $targetId, ?array $before, ?array $after): void
    {
        $op = $request->admin['username'] ?? 'admin';
        AuditService::log($action, 'review', $targetId, $before, $after, null, $op);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
