<?php
declare(strict_types=1);

namespace app\controller;

use app\service\StockAlertService;
use think\Request;
use think\Response;

class StockAlert
{
    private StockAlertService $svc;
    public function __construct() { $this->svc = new StockAlertService(); }

    public function alertList(Request $request): Response
    {
        return $this->ok(['list' => $this->svc->listAlerts()]);
    }

    public function ruleList(Request $request): Response
    {
        return $this->ok(['list' => $this->svc->listRules()]);
    }

    public function ruleUpsert(Request $request): Response
    {
        $data = $request->only(['sku_code', 'threshold', 'enabled', 'remark', 'notify_webhook_url', 'notify_cooldown_minutes']);
        $data['created_by'] = $request->admin['username'] ?? 'admin';
        try { return $this->ok($this->svc->upsertRule($data)); }
        catch (\Throwable $e) { return $this->err(400, $e->getMessage()); }
    }

    public function ruleDelete(Request $request, string $sku): Response
    {
        $this->svc->deleteRule($sku);
        return $this->ok(['sku_code' => $sku]);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
