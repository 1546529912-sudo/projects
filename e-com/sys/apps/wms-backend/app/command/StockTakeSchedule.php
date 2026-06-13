<?php
declare(strict_types=1);

namespace app\command;

use app\service\StockTakeScheduleService;
use think\console\Command;
use think\console\Input;
use think\console\Output;

/**
 * 盘点定时调度 loop（iter-32 B）
 *
 *   php think wms:stock-take-schedule
 *
 *   supervisord 启动 → 每 60 秒扫一次 stock_take_schedules
 *   到时 + enabled + 23h 未触发 → 调 StockTakeService 建盘点单
 */
class StockTakeSchedule extends Command
{
    protected function configure(): void
    {
        $this->setName('wms:stock-take-schedule')
             ->setDescription('盘点定时调度 loop（60s）');
    }

    protected function execute(Input $input, Output $output): int
    {
        $output->writeln('[StockTakeSchedule] 启动，间隔 60s');
        $svc = new StockTakeScheduleService();
        while (true) {
            try {
                $r = $svc->tick();
                if (($r['triggered'] ?? 0) > 0) {
                    $output->writeln(date('[Y-m-d H:i:s]') . " 触发 {$r['triggered']} 单：" . json_encode($r['takes'] ?? []));
                }
            } catch (\Throwable $e) {
                $output->writeln(date('[Y-m-d H:i:s]') . ' tick 异常: ' . $e->getMessage());
            }
            sleep(60);
        }
    }
}
