<?php

namespace App\Jobs;

use App\Models\StockAlert;
use App\Services\WebhookDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * iter-17 · Webhook 异步投递 + 自动重试
 *
 * - tries=3，间隔 backoff(10s/30s/60s) 指数退避
 * - 失败不抛业务异常，但抛出网络/HTTP 异常让 Laravel queue 触发 retry
 * - 落库点：
 *   - mock_only：URL 未配 → 一次即结束，标 mock_only
 *   - sent：HTTP 成功 → 一次即结束
 *   - failed：3 次后仍失败，failed() 标 failed + attempts=3
 */
class DispatchWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [10, 30, 60];

    public function __construct(
        public string $event,
        public array $payload,
        public ?int $alertId = null,
    ) {}

    public function handle(WebhookDispatcher $dispatcher): void
    {
        $result = $dispatcher->dispatch($this->event, $this->payload);
        $attempt = $this->attempts(); // 当前是第几次

        // failed → 抛异常让 queue 重试；最后一次 failed 由 failed() 兜底
        if ($result['status'] === 'failed' && $attempt < $this->tries) {
            $this->updateAlert($result, $attempt);
            throw new \RuntimeException("Webhook failed (attempt {$attempt}/{$this->tries}): "
                . ($result['response'] ?? 'unknown'));
        }

        $this->updateAlert($result, $attempt);
    }

    public function failed(\Throwable $e): void
    {
        $this->updateAlert(
            ['status' => 'failed', 'response' => substr($e->getMessage(), 0, 500)],
            $this->tries,
        );
    }

    private function updateAlert(array $result, int $attempt): void
    {
        if (! $this->alertId) return;
        $alert = StockAlert::find($this->alertId);
        if (! $alert) return;
        $alert->update([
            'webhook_status' => $result['status'],
            'webhook_response' => $result['response'] ?? null,
            'webhook_attempts' => $attempt,
        ]);
    }
}
