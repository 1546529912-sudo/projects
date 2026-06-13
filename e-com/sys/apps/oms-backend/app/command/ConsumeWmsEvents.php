<?php
declare(strict_types=1);

namespace app\command;

use app\service\EventBus;
use app\service\handler\WmsOutboundCompletedHandler;
use think\console\Command;
use think\console\Input;
use think\console\Output;

/**
 * php think consume:wms
 *
 * 阻塞订阅 wms.outbound.completed 流。
 * 由 supervisord 在 OMS 容器内拉起。
 *
 * 每 1000 条消息后正常退出（由 supervisord 拉回），防止内存泄漏。
 */
class ConsumeWmsEvents extends Command
{
    private const MAX_MESSAGES_PER_PROCESS = 1000;

    protected function configure(): void
    {
        $this->setName('consume:wms')
            ->setDescription('Consume wms.outbound.completed stream and mark orders shipped');
    }

    protected function execute(Input $input, Output $output): int
    {
        $consumer = 'oms-' . gethostname() . '-' . getmypid();
        $output->writeln("[consume:wms] consumer={$consumer} starting...");

        $bus = new EventBus();
        $handler = new WmsOutboundCompletedHandler();
        $processed = 0;

        $bus->consume(
            'wms.outbound.completed',
            'oms-wms-outbound-group',
            $consumer,
            function (array $payload, string $eventId, string $traceId) use ($handler, $output, &$processed) {
                $output->writeln("[event] id={$eventId} trace={$traceId} order_no=" . ($payload['order_no'] ?? '?'));
                $handler($payload, $eventId, $traceId);
                $processed++;
                if ($processed >= self::MAX_MESSAGES_PER_PROCESS) {
                    $output->writeln("[consume:wms] processed {$processed} messages, exiting for supervisord restart");
                    exit(0);
                }
            }
        );

        return 0;
    }
}
