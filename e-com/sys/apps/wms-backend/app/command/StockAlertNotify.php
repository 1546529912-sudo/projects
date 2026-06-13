<?php
declare(strict_types=1);

namespace app\command;

use app\service\AlertNotifyService;
use think\console\Command;
use think\console\Input;
use think\console\Output;

/**
 * 低库存预警 webhook 推送循环（iter-32 A）
 *
 *   php think wms:stock-alert-notify
 *
 *   supervisord 启动 → 死循环 → 每 60 秒扫一次 stock_alert_rules
 *   有 webhook_url + 超过 cooldown + 当前触发告警 → POST 通知
 *
 *   单次 tick 失败不阻塞 — 下一轮再试
 */
class StockAlertNotify extends Command
{
    protected function configure(): void
    {
        $this->setName('wms:stock-alert-notify')
             ->setDescription('低库存预警 webhook 推送（loop 60s）');
    }

    protected function execute(Input $input, Output $output): int
    {
        $output->writeln('[StockAlertNotify] 启动，间隔 60s');
        $svc = new AlertNotifyService();
        while (true) {
            try {
                $r = $svc->tick();
                if ($r['notified'] > 0) {
                    $output->writeln(date('[Y-m-d H:i:s]') . " tick: scanned={$r['scanned']} notified={$r['notified']} skipped={$r['skipped']}");
                }
            } catch (\Throwable $e) {
                $output->writeln(date('[Y-m-d H:i:s]') . ' tick 异常: ' . $e->getMessage());
            }
            sleep(60);
        }
    }
}
