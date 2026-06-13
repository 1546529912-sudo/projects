<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * Redis Stream 事件总线（PIM 版本，仅 publish，与 OMS/WMS 版完全一致）
 * 详见 outputs/architecture/event-bus.md
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
            $pending = $r->xPending($stream, $group, $id, $id, 1);
            $deliveryCount = isset($pending[0][3]) ? (int)$pending[0][3] : 1;
            fwrite(STDERR, "[EventBus] handler 失败 stream={$stream} id={$id} delivery={$deliveryCount} err=" . $e->getMessage() . "\n");
            if ($deliveryCount >= self::MAX_DELIVERY) {
                try {
                    Db::name('dead_letter')->insert([
                        'stream' => $stream,
                        'event_id' => $eventId ?: $id,
                        'payload' => json_encode(['fields' => $fields, 'payload' => $payload, 'last_error' => $e->getMessage()], JSON_UNESCAPED_UNICODE),
                        'error' => $e->getMessage(),
                        'retry_count' => $deliveryCount,
                    ]);
                } catch (\Throwable $dbe) {
                    fwrite(STDERR, "[EventBus] dead_letter 写入失败: " . $dbe->getMessage() . "\n");
                }
                $r->xAck($stream, $group, [$id]);
            }
        }
    }

    private function ensureGroup(\Redis $r, string $stream, string $group): void
    {
        try {
            $r->xGroup('CREATE', $stream, $group, '0', true);
        } catch (\RedisException $e) {
            if (!str_contains($e->getMessage(), 'BUSYGROUP')) throw $e;
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
                $r->select(0);
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
