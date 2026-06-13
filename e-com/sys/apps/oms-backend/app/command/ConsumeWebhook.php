<?php
declare(strict_types=1);

namespace app\command;

use app\service\EventBus;
use app\service\WebhookService;
use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Db;

/**
 * Webhook 异步消费者（iter-33 Q28-03）
 *
 *   订阅 stream: oms.webhook.outbound
 *   group:      webhook-consumer
 *
 *   流程：
 *     1. 收到一条 payload {event, data, enqueued_at}
 *     2. 遍历 enabled webhook_subscriptions 匹配 event
 *     3. 各订阅独立 deliverWithRetry（失败 retry_max 次后自动落 dead_letter）
 *     4. 全部投递完成才 ACK（EventBus.dispatch 内）
 *
 *   被 supervisord 拉起：php /var/www/html/think consume:webhook
 */
class ConsumeWebhook extends Command
{
    protected function configure(): void
    {
        $this->setName('consume:webhook')
             ->setDescription('OMS webhook 异步推送消费者');
    }

    protected function execute(Input $input, Output $output): int
    {
        $output->writeln('[ConsumeWebhook] 启动，stream=' . WebhookService::STREAM);

        $bus = new EventBus();
        $svc = new WebhookService();

        $bus->consume(
            WebhookService::STREAM,
            WebhookService::CONSUMER_GROUP,
            'consumer-1',
            function (array $payload, string $eventId, string $traceId) use ($svc, $output) {
                $event = (string)($payload['event'] ?? '');
                $data = $payload['data'] ?? [];
                if (!$event) throw new \RuntimeException('payload 缺少 event 字段');

                $subs = Db::name('webhook_subscriptions')
                    ->where('enabled', 1)
                    ->select()->toArray();

                $matched = 0;
                foreach ($subs as $sub) {
                    $events = is_string($sub['events']) ? json_decode($sub['events'], true) : ($sub['events'] ?? []);
                    if (!in_array($event, $events, true)) continue;
                    $matched++;
                    // 每订阅独立 try：单订阅失败不影响其他订阅
                    try {
                        $svc->deliverWithRetry($sub, $event, $data);
                    } catch (\Throwable $e) {
                        // deliverWithRetry 内已落 dead_letter + markFailed
                    }
                }
                $output->writeln(date('[Y-m-d H:i:s]') . " 消费 event={$event} matched={$matched}");
            }
        );
        return 0;
    }
}
