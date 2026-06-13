<?php
declare(strict_types=1);

namespace app\controller;

use app\service\WebhookService;
use think\Request;
use think\Response;

/**
 * Webhook 订阅管理（iter-28 A1）
 *   - super_admin 独占
 */
class Webhook
{
    private WebhookService $svc;
    public function __construct() { $this->svc = new WebhookService(); }

    public function list(Request $request): Response
    {
        return $this->ok(['list' => $this->svc->listSubscriptions()]);
    }

    public function create(Request $request): Response
    {
        $data = $request->only(['name', 'url', 'events', 'secret', 'enabled', 'retry_max']);
        $data['created_by'] = $request->admin['username'] ?? 'admin';
        try { return $this->ok($this->svc->create($data)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function update(Request $request, int $id): Response
    {
        $data = $request->only(['name', 'url', 'events', 'enabled', 'retry_max']);
        try { return $this->ok($this->svc->update($id, $data)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function delete(Request $request, int $id): Response
    {
        $this->svc->delete($id);
        return $this->ok(['id' => $id]);
    }

    public function test(Request $request, int $id): Response
    {
        try {
            $sub = $this->svc->detail($id);
            $this->svc->fire('test', [
                'subscription_id' => $id,
                'message' => 'iter-28 webhook 测试',
            ]);
            return $this->ok(['fired' => true, 'subscription' => $sub]);
        } catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
