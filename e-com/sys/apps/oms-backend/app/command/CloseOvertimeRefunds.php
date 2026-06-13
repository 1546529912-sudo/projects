<?php
declare(strict_types=1);

namespace app\command;

use app\service\RefundService;
use think\console\Command;
use think\console\Input;
use think\console\Output;

/**
 * php think refund:close-overdue
 *
 * 定时扫描超过 N 天仍未发起退货物流（status=approved）的 return_refund 单，
 * 自动转 closed_overtime + 释放 reserved 库存。
 *
 * 由 supervisord 拉起，循环 sleep(3600)，每小时扫一次。
 *
 * 退出条件：连续 240 次扫描后退出（约 10 天）由 supervisord 重拉，防止 PHP 长期运行内存泄漏。
 */
class CloseOvertimeRefunds extends Command
{
    private const SCAN_INTERVAL_SEC = 3600;          // 1 小时一次
    private const OVERDUE_DAYS = 7;                  // 超时阈值
    private const MAX_SCANS_PER_PROCESS = 240;       // ~10 天后退出

    protected function configure(): void
    {
        $this->setName('refund:close-overdue')
            ->setDescription('Scan and close return_refund orders overdue ' . self::OVERDUE_DAYS . ' days');
    }

    protected function execute(Input $input, Output $output): int
    {
        $output->writeln("[close-overdue] start, overdue=" . self::OVERDUE_DAYS . "d, interval=" . self::SCAN_INTERVAL_SEC . "s");
        $svc = new RefundService();
        $scans = 0;

        while (true) {
            try {
                $list = $svc->listOvertime(self::OVERDUE_DAYS);
                if ($list) {
                    $output->writeln('[close-overdue] found ' . count($list) . ' overdue refunds');
                    foreach ($list as $no) {
                        try {
                            $svc->closeOvertime($no, 'system');
                            $output->writeln("[close-overdue] closed {$no}");
                        } catch (\Throwable $e) {
                            $output->writeln("[close-overdue] fail {$no}: " . $e->getMessage());
                        }
                    }
                } else {
                    $output->writeln('[close-overdue] no overdue refunds');
                }
            } catch (\Throwable $e) {
                fwrite(STDERR, "[close-overdue] scan error: " . $e->getMessage() . "\n");
            }
            $scans++;
            if ($scans >= self::MAX_SCANS_PER_PROCESS) {
                $output->writeln("[close-overdue] reached {$scans} scans, exiting for supervisord restart");
                return 0;
            }
            sleep(self::SCAN_INTERVAL_SEC);
        }
    }
}
