<?php
declare(strict_types=1);

namespace app\command;

use app\service\EventBus;
use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Db;

/**
 * iter-72 Q42-03 worker：dead_letter 自动 replay
 *
 *   每 30 秒扫一遍 dead_letter：
 *     - error NOT LIKE %replayed at%（即未尝试过 auto-replay）
 *     - retry_count < stream_replay_policies.max_retries（按 stream 个性化）
 *     - stream_replay_policies.enabled = 1
 *   命中后 EventBus::publish 重发 + 把 dead_letter.error 加 "auto-replayed at YYYY-mm-dd HH:ii:ss"
 *
 *   退出：连续 1000 次扫（~8 小时）由 supervisord 重拉
 */
class DeadLetterAutoReplay extends Command
{
    private const SCAN_INTERVAL_SEC = 30;
    private const MAX_SCANS_PER_PROCESS = 1000;
    private const PER_SCAN_LIMIT = 50;

    protected function configure(): void
    {
        $this->setName('dead-letter:auto-replay')
            ->setDescription('iter-72 Q42-03 dead_letter 按 stream_replay_policies 自动 replay');
    }

    protected function execute(Input $input, Output $output): int
    {
        $output->writeln('[dead-replay] start interval=' . self::SCAN_INTERVAL_SEC . 's');
        $scans = 0;
        $bus = new EventBus();

        while (true) {
            try {
                $policies = Db::name('stream_replay_policies')->where('enabled', 1)->select()->toArray();
                $policyByStream = array_column($policies, null, 'stream');
                if (!$policyByStream) {
                    $output->writeln('[dead-replay] no enabled policies, skipping');
                    sleep(self::SCAN_INTERVAL_SEC);
                    continue;
                }

                $rows = Db::name('dead_letter')
                    ->whereIn('stream', array_keys($policyByStream))
                    ->whereRaw("(error IS NULL OR error NOT LIKE '%auto-replayed at%')")
                    ->order('id', 'asc')->limit(self::PER_SCAN_LIMIT)->select()->toArray();

                if (!$rows) {
                    $output->writeln('[dead-replay] no candidates');
                } else {
                    $output->writeln('[dead-replay] found ' . count($rows) . ' candidates');
                    foreach ($rows as $r) {
                        $stream = $r['stream'];
                        $policy = $policyByStream[$stream] ?? null;
                        if (!$policy) continue;
                        if ((int)$r['retry_count'] >= (int)$policy['max_retries']) continue;
                        try {
                            $payload = is_string($r['payload']) ? (json_decode($r['payload'], true) ?: ['raw' => $r['payload']]) : ($r['payload'] ?: []);
                            $eventPayload = $payload['payload'] ?? $payload['fields']['payload'] ?? $payload;
                            if (is_array($eventPayload)) $eventPayload = json_encode($eventPayload, JSON_UNESCAPED_UNICODE);
                            $bus->publish($stream, [
                                'payload' => $eventPayload,
                                'replayed_from_dead_letter_id' => (string)$r['id'],
                                'auto_replay' => '1',
                            ]);
                            $marker = '; auto-replayed at ' . date('Y-m-d H:i:s');
                            Db::name('dead_letter')->where('id', $r['id'])->update([
                                'error' => ($r['error'] ?? '') . $marker,
                                'retry_count' => Db::raw('retry_count + 1'),
                            ]);
                            $output->writeln("[dead-replay] replayed id={$r['id']} stream={$stream}");
                        } catch (\Throwable $e) {
                            $output->writeln("[dead-replay] fail id={$r['id']}: " . $e->getMessage());
                        }
                    }
                }
            } catch (\Throwable $e) {
                fwrite(STDERR, "[dead-replay] scan error: " . $e->getMessage() . "\n");
            }
            $scans++;
            if ($scans >= self::MAX_SCANS_PER_PROCESS) {
                $output->writeln("[dead-replay] {$scans} scans, exiting for restart");
                return 0;
            }
            sleep(self::SCAN_INTERVAL_SEC);
        }
    }
}
