<?php
declare(strict_types=1);

namespace app\controller;

use app\service\ReviewService;
use think\Request;
use think\Response;

/**
 * 评价（iter-20）
 *   POST /review                     提交（需登录）
 *   GET  /review/my                  我的评价
 *   GET  /review/by-spu/:spuId       SPU 评价列表（公开，不强制登录但走 Auth 组 ok）
 */
class Review
{
    private ReviewService $svc;
    public function __construct() { $this->svc = new ReviewService(); }

    public function submit(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $orderNo = (string)$request->param('order_no');
        $skuCode = (string)$request->param('sku_code');
        $rating = (int)$request->param('rating', 0);
        $content = (string)$request->param('content', '');
        $images = $request->param('images', []);
        if (!is_array($images)) $images = [];
        // iter-67 Q20-01 多维度打分
        $extra = [
            'rating_logistics' => max(0, min(5, (int)$request->param('rating_logistics', 0))),
            'rating_service' => max(0, min(5, (int)$request->param('rating_service', 0))),
            'rating_quality' => max(0, min(5, (int)$request->param('rating_quality', 0))),
        ];
        if (!$orderNo || !$skuCode) return $this->err(400, 'order_no 与 sku_code 必传');
        try {
            $row = $this->svc->submit($uid, $orderNo, $skuCode, $rating, $content, $images, $extra);
            return $this->ok($row);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    // iter-67 Q20-03 评价点赞
    public function like(Request $request, int $id): Response
    {
        $uid = (int)($request->user_id ?? 0);
        if (!$uid) return $this->err(401, '未登录');
        try { return $this->ok($this->svc->like($id, $uid)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    // iter-67 Q20-03 商家回复
    public function reply(Request $request, int $id): Response
    {
        $role = (string)($request->admin['role'] ?? '');
        if (!in_array($role, ['super_admin', 'sales_ops', 'store_owner'], true)) return $this->err(403, '仅运营/店主');
        $reply = trim((string)$request->param('reply', ''));
        if (!$reply) return $this->err(400, 'reply 必填');
        try { return $this->ok($this->svc->reply($id, $reply)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function bySpu(Request $request, int $spuId): Response
    {
        $page = max(1, (int)$request->param('page', 1));
        $size = min(50, max(1, (int)$request->param('size', 20)));
        return $this->ok($this->svc->bySpu($spuId, $page, $size));
    }

    public function my(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $page = max(1, (int)$request->param('page', 1));
        $size = min(50, max(1, (int)$request->param('size', 20)));
        return $this->ok($this->svc->my($uid, $page, $size));
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
