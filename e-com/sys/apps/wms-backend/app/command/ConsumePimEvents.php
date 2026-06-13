<?php
declare(strict_types=1);

namespace app\command;

use app\service\EventBus;
use app\service\handler\PimSkuChangedHandler;
use think\console\Command;
use think\console\Input;
use think\console\Output;

/**
 * php think consume:pim
 *
 * 阻塞订阅 pim.sku.changed 流，同步 PIM SKU 主数据到 wms_products。
 * 由 supervisord 在 WMS 容器内拉起。
 *
 * 每 1000 条消息后正常退出（由 supervisord 拉回），防止内存泄漏。
 */
class ConsumePimEvents extends Command
{
    private const MAX_MESSAGES_PER_PROCESS = 1000;

    protected function configure(): void
    {
        $this->setName('consume:pim')
            ->setDescription('Consume pim.sku.changed stream and sync wms_products');
    }

    protected function execute(Input $input, Output $output): int
    {
        $consumer = 'wms-pim-' . gethostname() . '-' . getmypid();
        $output->writeln("[consume:pim] consumer={$consumer} starting...");

        $bus = new EventBus();
        $handler = new PimSkuChangedHandler();
        $processed = 0;

        $bus->consume(
            'pim.sku.changed',
            'wms-pim-sku-group',
            $consumer,
            function (array $payload, string $eventId, string $traceId) use ($handler, $output, &$processed) {
                $output->writeln("[event] id={$eventId} trace={$traceId} action=" . ($payload['action'] ?? '?') . " sku=" . ($payload['sku_code'] ?? '?'));
                $handler($payload, $eventId, $traceId);
                $processed++;
                if ($processed >= self::MAX_MESSAGES_PER_PROCESS) {
                    $output->writeln("[consume:pim] processed {$processed} messages, exiting for supervisord restart");
                    exit(0);
                }
            }
        );

        return 0;
    }
}
