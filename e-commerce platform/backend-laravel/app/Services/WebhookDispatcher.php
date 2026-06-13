<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Webhook 投递器：URL 未配置 → mock 模式（仅记录日志，写表标 mock_only）；
 * 配置后 → 真实 HTTP POST，3 秒超时，失败标 failed 不抛异常（预警不阻塞业务）。
 */
class WebhookDispatcher
{
    public function dispatch(string $event, array $payload): array
    {
        $url = $this->resolveUrl($event);
        $body = ['event' => $event, 'payload' => $payload, 'timestamp' => now()->toIso8601String()];

        if (! $url) {
            Log::info('[webhook][mock] '.$event, $body);
            return ['status' => 'mock_only', 'response' => 'no url configured'];
        }

        try {
            $resp = Http::timeout(3)->post($url, $body);
            return [
                'status' => $resp->successful() ? 'sent' : 'failed',
                'response' => substr((string) $resp->body(), 0, 500).' ['.$resp->status().']',
            ];
        } catch (\Throwable $e) {
            Log::warning('[webhook][fail] '.$event.' '.$e->getMessage());
            return ['status' => 'failed', 'response' => substr($e->getMessage(), 0, 500)];
        }
    }

    /**
     * iter-24 · 按 event 前缀路由 URL：stock.* / auth.* / 其他事件可继续扩展
     */
    private function resolveUrl(string $event): ?string
    {
        return match (true) {
            str_starts_with($event, 'stock.') => config('services.webhook.stock_alert_url'),
            str_starts_with($event, 'auth.')  => config('services.webhook.auth_new_device_url'),
            default => null,
        };
    }
}
