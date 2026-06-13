<?php
declare(strict_types=1);

namespace app\controller;

use app\service\FavoriteService;
use think\Request;
use think\Response;

/**
 * 收藏（iter-20）
 *   POST   /favorite/:spuId
 *   DELETE /favorite/:spuId
 *   GET    /favorite/list
 *   GET    /favorite/check/:spuId（详情页查询是否已收藏）
 */
class Favorite
{
    private FavoriteService $svc;
    public function __construct() { $this->svc = new FavoriteService(); }

    public function add(Request $request, int $spuId): Response
    {
        $uid = (int)($request->user_id ?? 0);
        // iter-67 Q20-05 收藏分组（默认"默认"）
        $group = trim((string)$request->param('group_name', '默认'));
        $this->svc->add($uid, $spuId, $group);
        return $this->ok(['spu_id' => $spuId, 'favored' => true, 'group_name' => $group]);
    }

    // iter-67 Q20-05 改分组 + 切降价通知开关
    public function updateGroup(Request $request, int $spuId): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $group = trim((string)$request->param('group_name', ''));
        $notify = $request->param('notify_enabled');
        try {
            return $this->ok($this->svc->updateGroup($uid, $spuId, $group ?: null, $notify === null ? null : (int)$notify));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function remove(Request $request, int $spuId): Response
    {
        $uid = (int)($request->user_id ?? 0);
        $this->svc->remove($uid, $spuId);
        return $this->ok(['spu_id' => $spuId, 'favored' => false]);
    }

    public function check(Request $request, int $spuId): Response
    {
        $uid = (int)($request->user_id ?? 0);
        return $this->ok(['spu_id' => $spuId, 'favored' => $this->svc->isFav($uid, $spuId)]);
    }

    public function list(Request $request): Response
    {
        $uid = (int)($request->user_id ?? 0);
        return $this->ok($this->svc->list($uid));
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
