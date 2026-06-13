<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * Redis Stream 事件总线
 *
 * - 用独立 Redis 连接（db=0），不复用 cache 的 db prefix
 * - publish：XADD + MAXLEN 10000（防止 stream 无限增长）
 * - consume：XGROUP CREATE MKSTREAM 兜底 + XREADGROUP BLOCK
 * - 失败 >= 3 次 写 dead_letter 表 + ACK 不再投递
 * - 自动重连：连接断开/超时时 sleep 后重试
 *
 * 消息格式：
 *   { "event_id": uuid, "trace_id": uuid, "ts": int, "payload": JSON-string }
 */
class EventBus
{
    private const STREAM_MAXLEN = 10000;
    private const BLOCK_MS = 5000;
    private const READ_COUNT = 10;
    private const MAX_DELIVERY = 3;

    private ?\Redis $redis = null;

    public function publish(string $stream, array $payload, string $traceId = ''): string
    {
        $r = $this->conn();
        $msg = [
            'event_id' => $this->uuid(),
            'trace_id' => $traceId ?: $this->uuid(),
            'ts' => (string)time(),
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
        ];
        $id = $r->xAdd($stream, '*', $msg, self::STREAM_MAXLEN, true);
        return is_string($id) ? $id : '';
    }

    /**
     * 阻塞消费 + 自动处理 dead_letter
     *
     * @param string   $stream
     * @param string   $group
     * @param string   $consumer
     * @param callable $handler  function(array $payload, string $eventId, string $traceId): void
     *                            抛出异常视为失败，会重投
     */
    public function consume(string $stream, string $group, string $consumer, callable $handler): void
    {
        $r = $this->conn();
        $this->ensureGroup($r, $stream, $group);

        while (true) {
            try {
                $resp = $r->xReadGroup($group, $consumer, [$stream => '>'], self::READ_COUNT, self::BLOCK_MS);
                if (!$resp || empty($resp[$stream])) continue;

                foreach ($resp[$stream] as $id => $fields) {
                    $this->dispatch($r, $stream, $group, $id, $fields, $handler);
                }
            } catch (\RedisException $e) {
                fwrite(STDERR, "[EventBus] Redis error: " . $e->getMessage() . " — 重连中\n");
                $this->redis = null;
                sleep(2);
                $r = $this->conn();
                $this->ensureGroup($r, $stream, $group);
            } catch (\Throwable $e) {
                fwrite(STDERR, "[EventBus] FATAL: " . $e->getMessage() . "\n");
                sleep(1);
            }
        }
    }

    private function dispatch(\Redis $r, string $stream, string $group, string $id, array $fields, callable $handler): void
    {
        $eventId = $fields['event_id'] ?? '';
        $traceId = $fields['trace_id'] ?? '';
        $payload = json_decode($fields['payload'] ?? '{}', true) ?: [];

        try {
            $handler($payload, $eventId, $traceId);
            $r->xAck($stream, $group, [$id]);
        } catch (\Throwable $e) {
            // 看这条消息已经投递过几次
            $pending = $r->xPending($stream, $group, $id, $id, 1);
            $deliveryCount = isset($pending[0][3]) ? (int)$pending[0][3] : 1;

            $msg = sprintf("[EventBus] handler 失败 stream=%s id=%s delivery=%d err=%s",
                $stream, $id, $deliveryCount, $e->getMessage());
            fwrite(STDERR, $msg . "\n");

            if ($deliveryCount >= self::MAX_DELIVERY) {
                // 进死信 + ACK 不再投递
                try {
                    Db::name('dead_letter')->insert([
                        'stream' => $stream,
                        'event_id' => $eventId ?: $id,
                        'payload' => json_encode([
                            'fields' => $fields,
                            'payload' => $payload,
                            'last_error' => $e->getMessage(),
                        ], JSON_UNESCAPED_UNICODE),
                        'error' => $e->getMessage(),
                        'retry_count' => $deliveryCount,
                    ]);
                } catch (\Throwable $dbe) {
                    fwrite(STDERR, "[EventBus] dead_letter 写入失败: " . $dbe->getMessage() . "\n");
                }
                $r->xAck($stream, $group, [$id]);
            }
            // 否则不 ACK，下次 XREADGROUP 会重投
        }
    }

    private function ensureGroup(\Redis $r, string $stream, string $group): void
    {
        try {
            $r->xGroup('CREATE', $stream, $group, '0', true); // MKSTREAM
        } catch (\RedisException $e) {
            if (!str_contains($e->getMessage(), 'BUSYGROUP')) {
                throw $e;
            }
        }
    }

    private function conn(): \Redis
    {
        if ($this->redis !== null) return $this->redis;
        $r = new \Redis();
        $host = env('REDIS_HOST', '127.0.0.1');
        $port = (int) env('REDIS_PORT', 6379);
        $tries = 0;
        while (true) {
            try {
                $r->connect($host, $port, 2.5);
                $pass = env('REDIS_PASSWORD', '');
                if ($pass) $r->auth($pass);
                $r->select(0); // Stream 共享 db=0
                $r->setOption(\Redis::OPT_READ_TIMEOUT, -1);
                $this->redis = $r;
                return $r;
            } catch (\Throwable $e) {
                if (++$tries >= 5) throw $e;
                fwrite(STDERR, "[EventBus] connect $host:$port failed, retry #$tries\n");
                sleep(2);
            }
        }
    }

    private function uuid(): string
    {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}
