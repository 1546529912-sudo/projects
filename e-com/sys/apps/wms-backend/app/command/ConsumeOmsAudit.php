<?php
declare(strict_types=1);

namespace app\command;

use app\service\EventBus;
use app\service\handler\OmsOrderCancelledHandler;
use app\service\handler\OmsRefundApprovedHandler;
use app\service\handler\OmsRefundRefundedHandler;
use think\console\Command;
use think\console\Input;
use think\console\input\Argument;
use think\console\Output;

/**
 * php think consume:oms-audit <stream>
 *
 * 阻塞订阅 OMS 推过来的 3 个 audit-only 事件之一：
 *   - oms.order.cancelled
 *   - oms.refund.approved
 *   - oms.refund.refunded
 *
 * supervisord 启 3 个实例，每个吃一条流。
 */
class ConsumeOmsAudit extends Command
{
    private const MAX_MESSAGES_PER_PROCESS = 1000;

    private const HANDLERS = [
        'oms.order.cancelled' => OmsOrderCancelledHandler::class,
        'oms.refund.approved' => OmsRefundApprovedHandler::class,
        'oms.refund.refunded' => OmsRefundRefundedHandler::class,
    ];

    private const GROUPS = [
        'oms.order.cancelled' => 'wms-oms-cancel-group',
        'oms.refund.approved' => 'wms-oms-refund-approved-group',
        'oms.refund.refunded' => 'wms-oms-refund-refunded-group',
    ];

    protected function configure(): void
    {
        $this->setName('consume:oms-audit')
            ->setDescription('Consume one of the OMS audit streams (oms.order.cancelled / oms.refund.approved / oms.refund.refunded)')
            ->addArgument('stream', Argument::REQUIRED, 'stream name');
    }

    protected function execute(Input $input, Output $output): int
    {
        $stream = (string)$input->getArgument('stream');
        if (!isset(self::HANDLERS[$stream])) {
            $output->writeln("[consume:oms-audit] unknown stream: {$stream}");
            return 1;
        }
        $handlerClass = self::HANDLERS[$stream];
        $group = self::GROUPS[$stream];
        $consumer = 'wms-' . gethostname() . '-' . getmypid();
        $output->writeln("[consume:oms-audit] stream={$stream} group={$group} consumer={$consumer} starting...");

        $bus = new EventBus();
        $handler = new $handlerClass();
        $processed = 0;

        $bus->consume(
            $stream,
            $group,
            $consumer,
            function (array $payload, string $eventId, string $traceId) use ($handler, $output, $stream, &$processed) {
                $output->writeln("[event] stream={$stream} id={$eventId} trace={$traceId}");
                $handler($payload, $eventId, $traceId);
                $processed++;
                if ($processed >= self::MAX_MESSAGES_PER_PROCESS) {
                    $output->writeln("[consume:oms-audit] processed {$processed}, exiting");
                    exit(0);
                }
            }
        );
        return 0;
    }
}
