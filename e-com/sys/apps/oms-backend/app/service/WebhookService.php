<?php
declare(strict_types=1);

namespace app\service;

use GuzzleHttp\Client;
use think\facade\Db;

/**
 * Webhook 推送服务（iter-28 A1）
 *
 *   订阅 CRUD + fire（同步 + 最多 3 retry）+ HMAC-SHA256 签名
 *
 *   payload 标准格式：
 *     {
 *       "event": "order.completed",
 *       "data": { ... 业务相关字段 ... },
 *       "fired_at": "2026-06-02T12:00:00Z"
 *     }
 *
 *   header:
 *     - X-Webhook-Event: order.completed
 *     - X-Webhook-Signature: hex(hmac_sha256(payload, secret))
 *     - X-Webhook-Delivery: <random uuid>
 */
class WebhookService
{
    public const STREAM = 'oms.webhook.outbound';
    public const CONSUMER_GROUP = 'webhook-consumer';

    private const TIMEOUT_SEC = 5;
    private const RETRY_DELAY_MS = 500;

    /* ============= 订阅 CRUD ============= */

    public function listSubscriptions(): array
    {
        $rows = Db::name('webhook_subscriptions')->order('id', 'desc')->select()->toArray();
        foreach ($rows as &$r) {
            $r['events'] = is_string($r['events']) ? json_decode($r['events'], true) : ($r['events'] ?? []);
        }
        return $rows;
    }

    public function create(array $data): array
    {
        $this->validate($data);
        $id = Db::name('webhook_subscriptions')->insertGetId([
            'name' => $data['name'],
            'url' => $data['url'],
            'events' => json_encode($data['events']),
            'secret' => $data['secret'] ?? bin2hex(random_bytes(16)),
            'enabled' => isset($data['enabled']) ? (int)$data['enabled'] : 1,
            'retry_max' => (int)($data['retry_max'] ?? 3),
            'created_by' => $data['created_by'] ?? 'admin',
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->detail($id);
    }

    public function update(int $id, array $data): array
    {
        $row = Db::name('webhook_subscriptions')->where('id', $id)->find();
        if (!$row) throw new \RuntimeException('订阅不存在');
        $update = [];
        foreach (['name', 'url', 'enabled', 'retry_max'] as $k) {
            if (array_key_exists($k, $data)) $update[$k] = $data[$k];
        }
        if (array_key_exists('events', $data)) $update['events'] = json_encode($data['events']);
        if (!$update) throw new \RuntimeException('没有可更新字段');
        Db::name('webhook_subscriptions')->where('id', $id)->update($update);
        return $this->detail($id);
    }

    public function delete(int $id): void
    {
        Db::name('webhook_subscriptions')->where('id', $id)->delete();
    }

    public function detail(int $id): array
    {
        $row = Db::name('webhook_subscriptions')->where('id', $id)->find();
        if (!$row) throw new \RuntimeException('订阅不存在');
        $row['events'] = is_string($row['events']) ? json_decode($row['events'], true) : [];
        return $row;
    }

    /* ============= 触发推送 ============= */

    /**
     * 异步触发（iter-33 Q28-03 默认入口）：仅入 Redis Stream，立即返回。
     *   - OrderService confirm/cancel / RefundService refund 调它，不阻塞用户请求
     *   - 由 `php think consume:webhook` consumer 进程消费 stream → 调 fireSync 真正推送
     */
    public function fireAsync(string $event, array $data, string $traceId = ''): void
    {
        try {
            (new EventBus())->publish(self::STREAM, [
                'event' => $event,
                'data' => $data,
                'enqueued_at' => date('Y-m-d H:i:s'),
            ], $traceId);
        } catch (\Throwable $e) {
            // 队列宕机降级：直接同步推（保证业务不丢消息）
            error_log('[WebhookService] enqueue 失败，降级同步推: ' . $e->getMessage());
            $this->fireSync($event, $data);
        }
    }

    /**
     * 同步推送（iter-28 原路径，保留供 test endpoint 用 + 异步降级用）
     *   - 失败不阻塞（每订阅独立 try）
     *   - 同步推送，最多 retry_max 次
     */
    public function fireSync(string $event, array $data): void
    {
        $subs = Db::name('webhook_subscriptions')
            ->where('enabled', 1)
            ->select()->toArray();
        foreach ($subs as $sub) {
            $events = is_string($sub['events']) ? json_decode($sub['events'], true) : ($sub['events'] ?? []);
            if (!in_array($event, $events, true)) continue;
            try {
                $this->deliverWithRetry($sub, $event, $data);
            } catch (\Throwable $e) {
                // 已落 dead_letter（在 deliverWithRetry 内）
            }
        }
    }

    /**
     * 兼容老调用方（iter-28 直接调 fire），现在路由到异步
     * @deprecated 显式调 fireAsync() / fireSync()
     */
    public function fire(string $event, array $data): void { $this->fireAsync($event, $data); }

    public function deliverWithRetry(array $sub, string $event, array $data): void
    {
        $payload = [
            'event' => $event,
            'data' => $data,
            'fired_at' => gmdate('c'),
        ];
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
        $sig = hash_hmac('sha256', $body, (string)$sub['secret']);
        $delivery = bin2hex(random_bytes(8));

        $max = max(1, (int)$sub['retry_max']);
        $lastStatus = null;
        $lastError = '';
        $client = new Client(['timeout' => self::TIMEOUT_SEC]);

        for ($attempt = 1; $attempt <= $max; $attempt++) {
            $start = microtime(true);
            $excerpt = null;
            try {
                $resp = $client->post($sub['url'], [
                    'body' => $body,
                    'headers' => [
                        'Content-Type' => 'application/json',
                        'X-Webhook-Event' => $event,
                        'X-Webhook-Signature' => $sig,
                        'X-Webhook-Delivery' => $delivery,
                    ],
                ]);
                $status = $resp->getStatusCode();
                $excerpt = mb_substr((string)$resp->getBody(), 0, 500);
                $dur = (int)((microtime(true) - $start) * 1000);
                if ($status >= 200 && $status < 300) {
                    $this->markSuccess($sub['id'], $status);
                    $this->logDelivery($sub, $event, $body, $status, $excerpt, $dur, true, null);
                    return;
                }
                $lastStatus = $status;
                $lastError = "HTTP {$status}";
                $this->logDelivery($sub, $event, $body, $status, $excerpt, $dur, false, $lastError);
            } catch (\Throwable $e) {
                $lastStatus = 0;
                $lastError = substr($e->getMessage(), 0, 480);
                $dur = (int)((microtime(true) - $start) * 1000);
                $this->logDelivery($sub, $event, $body, 0, null, $dur, false, $lastError);
            }
            if ($attempt < $max) usleep(self::RETRY_DELAY_MS * 1000);
        }
        // 全部失败
        $this->markFailed($sub['id'], $lastStatus, $lastError);
        // 落 dead_letter（OMS 已有表）
        try {
            Db::name('dead_letter')->insert([
                'stream' => 'webhook.' . $event,
                'event_id' => $delivery,
                'payload' => $body,
                'error' => "webhook sub#{$sub['id']} failed: {$lastError}",
                'retry_count' => $max,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) { /* dead_letter 失败 silent */ }
    }

    /**
     * iter-70 Q33-02 逐条投递日志
     */
    private function logDelivery(array $sub, string $event, string $payload, int $status, ?string $excerpt, int $durMs, bool $success, ?string $error): void
    {
        try {
            Db::name('webhook_delivery_log')->insert([
                'endpoint_id' => (int)($sub['id'] ?? 0),
                'endpoint_url' => (string)($sub['url'] ?? ''),
                'event' => $event,
                'payload' => mb_substr($payload, 0, 4000),
                'http_status' => $status,
                'response_excerpt' => $excerpt,
                'duration_ms' => $durMs,
                'success' => $success ? 1 : 0,
                'error' => $error ? mb_substr($error, 0, 500) : null,
            ]);
        } catch (\Throwable $e) { /* log 失败不阻塞 */ }
    }

    private function markSuccess(int $id, int $status): void
    {
        Db::name('webhook_subscriptions')->where('id', $id)->update([
            'total_fired' => Db::raw('total_fired + 1'),
            'total_success' => Db::raw('total_success + 1'),
            'last_fired_at' => date('Y-m-d H:i:s'),
            'last_status' => $status,
            'last_error' => '',
        ]);
    }

    private function markFailed(int $id, ?int $status, string $error): void
    {
        Db::name('webhook_subscriptions')->where('id', $id)->update([
            'total_fired' => Db::raw('total_fired + 1'),
            'total_failed' => Db::raw('total_failed + 1'),
            'last_fired_at' => date('Y-m-d H:i:s'),
            'last_status' => $status,
            'last_error' => $error,
        ]);
    }

    /* ============= 校验 ============= */

    private function validate(array $data): void
    {
        if (empty($data['name'])) throw new \RuntimeException('name 必传');
        if (empty($data['url']) || !filter_var($data['url'], FILTER_VALIDATE_URL)) {
            throw new \RuntimeException('url 必须是合法 URL');
        }
        if (empty($data['events']) || !is_array($data['events'])) {
            throw new \RuntimeException('events 必传且必须是数组');
        }
        $allowed = ['order.completed', 'order.cancelled', 'refund.refunded', 'refund.approved'];
        foreach ($data['events'] as $e) {
            if (!in_array($e, $allowed, true)) {
                throw new \RuntimeException("不支持的 event: {$e}");
            }
        }
    }
}
