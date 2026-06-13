<?php
declare(strict_types=1);

namespace app\command;

use app\service\EventBus;
use app\service\handler\OmsOrderPaidHandler;
use think\console\Command;
use think\console\Input;
use think\console\Output;

/**
 * php think consume:oms
 *
 * 阻塞订阅 oms.order.paid 流。由 supervisord 在 WMS 容器内拉起。
 * 处理 1000 条后正常退出（supervisord 拉回），防止内存泄漏。
 */
class ConsumeOmsEvents extends Command
{
    private const MAX_MESSAGES_PER_PROCESS = 1000;

    protected function configure(): void
    {
        $this->setName('consume:oms')
            ->setDescription('Consume oms.order.paid stream and create WMS outbound orders');
    }

    protected function execute(Input $input, Output $output): int
    {
        $consumer = 'wms-' . gethostname() . '-' . getmypid();
        $output->writeln("[consume:oms] consumer={$consumer} starting...");

        $bus = new EventBus();
        $handler = new OmsOrderPaidHandler();
        $processed = 0;

        $bus->consume(
            'oms.order.paid',
            'wms-oms-paid-group',
            $consumer,
            function (array $payload, string $eventId, string $traceId) use ($handler, $output, &$processed) {
                $output->writeln("[event] id={$eventId} trace={$traceId} order_no=" . ($payload['order_no'] ?? '?'));
                $handler($payload, $eventId, $traceId);
                $processed++;
                if ($processed >= self::MAX_MESSAGES_PER_PROCESS) {
                    $output->writeln("[consume:oms] processed {$processed} messages, exiting for supervisord restart");
                    exit(0);
                }
            }
        );

        return 0;
    }
}
