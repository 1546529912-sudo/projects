<?php
declare(strict_types=1);

namespace app\command;

use app\service\EventBus;
use app\service\handler\WmsInventoryChangedHandler;
use think\console\Command;
use think\console\Input;
use think\console\Output;

/**
 * php think consume:wms-inventory
 *
 * 阻塞订阅 wms.inventory.changed 流，将 WMS 入库 delta 同步到 OMS available。
 * 由 supervisord 在 OMS 容器内拉起。
 *
 * 每 1000 条消息后正常退出（由 supervisord 拉回），防止内存泄漏。
 */
class ConsumeWmsInventory extends Command
{
    private const MAX_MESSAGES_PER_PROCESS = 1000;

    protected function configure(): void
    {
        $this->setName('consume:wms-inventory')
            ->setDescription('Consume wms.inventory.changed stream and add available qty');
    }

    protected function execute(Input $input, Output $output): int
    {
        $consumer = 'oms-inv-' . gethostname() . '-' . getmypid();
        $output->writeln("[consume:wms-inventory] consumer={$consumer} starting...");

        $bus = new EventBus();
        $handler = new WmsInventoryChangedHandler();
        $processed = 0;

        $bus->consume(
            'wms.inventory.changed',
            'oms-wms-inventory-group',
            $consumer,
            function (array $payload, string $eventId, string $traceId) use ($handler, $output, &$processed) {
                $output->writeln("[event] id={$eventId} trace={$traceId} inbound_no=" . ($payload['inbound_no'] ?? '?'));
                $handler($payload, $eventId, $traceId);
                $processed++;
                if ($processed >= self::MAX_MESSAGES_PER_PROCESS) {
                    $output->writeln("[consume:wms-inventory] processed {$processed} messages, exiting for supervisord restart");
                    exit(0);
                }
            }
        );

        return 0;
    }
}
