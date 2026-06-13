<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 低库存预警外部通知（iter-32 A）
 *
 *   触发规则：StockAlertService::listAlerts() 返回的告警
 *      ∩ rules.notify_webhook_url 非空
 *      ∩ now - last_notified_at >= cooldown
 *
 *   推送：HTTP POST JSON
 *     headers: X-Wms-Event: stock.alert · X-Wms-Signature: HMAC-SHA256(payload, env(WMS_WEBHOOK_SECRET))
 *     body:    { sku_code, threshold, available, gap, remark, alerted_at }
 *
 *   失败：不阻塞 — 仅 error_log，下次循环再试（不入死信，因为是周期性扫，会再触发）
 *
 *   被 command/StockAlertNotify 调用，loop 间隔 60 秒。
 */
class AlertNotifyService
{
    private const TIMEOUT_SECONDS = 5;

    public function tick(): array
    {
        $alerts = (new StockAlertService())->listAlerts();
        if (!$alerts) return ['scanned' => 0, 'notified' => 0, 'skipped' => 0];

        // 关联规则的 webhook 配置 + 冷却
        $skus = array_column($alerts, 'sku_code');
        $rules = Db::name('stock_alert_rules')
            ->whereIn('sku_code', $skus)
            ->where('enabled', 1)
            ->whereNotNull('notify_webhook_url')
            ->select()->toArray();
        $ruleMap = array_column($rules, null, 'sku_code');

        $now = time();
        $notified = 0; $skipped = 0;
        foreach ($alerts as $a) {
            $rule = $ruleMap[$a['sku_code']] ?? null;
            if (!$rule) { $skipped++; continue; }
            $url = trim((string)$rule['notify_webhook_url']);
            if ($url === '') { $skipped++; continue; }

            $cooldownSec = max(1, (int)$rule['notify_cooldown_minutes']) * 60;
            $lastTs = $rule['last_notified_at'] ? strtotime($rule['last_notified_at']) : 0;
            if ($lastTs && ($now - $lastTs) < $cooldownSec) { $skipped++; continue; }

            $payload = [
                'event' => 'stock.alert',
                'sku_code' => $a['sku_code'],
                'threshold' => $a['threshold'],
                'available' => $a['available'],
                'gap' => $a['gap'],
                'remark' => $a['remark'],
                'alerted_at' => date('Y-m-d H:i:s', $now),
            ];
            $result = $this->fireWithLog($rule['id'], $url, $a['sku_code'], $payload);
            if ($result['success']) {
                Db::name('stock_alert_rules')->where('id', $rule['id'])->update([
                    'last_notified_at' => date('Y-m-d H:i:s', $now),
                ]);
                $notified++;
            } else {
                $skipped++;
            }
        }
        return ['scanned' => count($alerts), 'notified' => $notified, 'skipped' => $skipped];
    }

    /**
     * iter-54 Q32-01：fire + 写日志表 wms_webhook_log
     */
    private function fireWithLog(int $ruleId, string $url, string $skuCode, array $payload): array
    {
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
        $secret = (string)env('WMS_WEBHOOK_SECRET', 'change-me-in-prod');
        $sig = hash_hmac('sha256', $body, $secret);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json; charset=utf-8',
                'X-Wms-Event: stock.alert',
                'X-Wms-Signature: ' . $sig,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => self::TIMEOUT_SECONDS,
            CURLOPT_CONNECTTIMEOUT => self::TIMEOUT_SECONDS,
        ]);
        $resp = curl_exec($ch);
        $err = curl_error($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $success = !($err || $code < 200 || $code >= 300);
        // iter-54 Q32-01 落日志（fail/success 都写）
        try {
            Db::name('wms_webhook_log')->insert([
                'rule_id' => $ruleId, 'sku_code' => $skuCode, 'webhook_url' => $url,
                'payload' => $body,
                'http_code' => $code ?: null,
                'response_body' => is_string($resp) ? mb_substr($resp, 0, 2000) : null,
                'success' => $success ? 1 : 0,
                'error_msg' => $err ? mb_substr($err, 0, 500) : null,
            ]);
        } catch (\Throwable $e) { error_log('[wms_webhook_log] ' . $e->getMessage()); }
        if (!$success) error_log("[AlertNotifyService] webhook 推送失败 url={$url} code={$code} err={$err}");
        return ['success' => $success, 'http_code' => $code, 'error' => $err];
    }
}
