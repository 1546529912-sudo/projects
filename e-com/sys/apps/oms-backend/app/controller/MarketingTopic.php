<?php
declare(strict_types=1);

namespace app\controller;

use app\service\MarketingTopicService;
use think\Request;
use think\Response;

/**
 * 营销专题 + 营销日历 controller（iter-41 BIZ-09-2）
 */
class MarketingTopic
{
    private MarketingTopicService $svc;
    public function __construct() { $this->svc = new MarketingTopicService(); }

    /* ============= admin Topic ============= */

    public function adminList(Request $request): Response
    {
        $filters = $request->only(['status', 'keyword']);
        return $this->ok($this->svc->list($filters,
            max(1, (int)$request->param('page', 1)),
            max(1, min(100, (int)$request->param('size', 20)))));
    }

    public function adminDetail(int $id): Response
    {
        try { return $this->ok($this->svc->detail($id)); }
        catch (\Throwable $e) { return $this->err(404, $e->getMessage()); }
    }

    public function adminCreate(Request $request): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            return $this->ok($this->svc->create(
                $request->only(['code', 'name', 'banner_image_url', 'description', 'start_at', 'end_at', 'sort', 'status', 'store_id']),
                $op
            ));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function adminUpdate(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            return $this->ok($this->svc->update($id,
                $request->only(['name', 'banner_image_url', 'description', 'start_at', 'end_at', 'sort', 'status']),
                $op
            ));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function adminDelete(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $this->svc->delete($id, $op);
            return $this->ok(['id' => $id]);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function adminAddItems(Request $request, int $id): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            $spuIds = $request->param('spu_ids', []);
            if (!is_array($spuIds) || !$spuIds) return $this->err(400, 'spu_ids 必传非空数组');
            return $this->ok($this->svc->addItems($id, $spuIds, $op));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function adminRemoveItem(Request $request, int $id, int $spuId): Response
    {
        try {
            $op = $request->admin['username'] ?? 'admin';
            return $this->ok($this->svc->removeItem($id, $spuId, $op));
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    /* ============= 营销日历 ============= */

    public function adminCalendar(Request $request): Response
    {
        $start = (string)$request->param('start', date('Y-m-01 00:00:00'));
        $end = (string)$request->param('end', date('Y-m-t 23:59:59'));
        return $this->ok($this->svc->calendar($start, $end));
    }

    /* ============= 公开 ============= */

    public function publicList(Request $request): Response
    {
        $limit = max(1, min(50, (int)$request->param('limit', 10)));
        return $this->ok(['list' => $this->svc->publicList($limit)]);
    }

    public function publicDetail(string $code): Response
    {
        try { return $this->ok($this->svc->publicDetail($code)); }
        catch (\Throwable $e) { return $this->err(404, $e->getMessage()); }
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
