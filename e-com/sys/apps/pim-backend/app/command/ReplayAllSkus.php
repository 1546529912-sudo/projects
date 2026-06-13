<?php
declare(strict_types=1);

namespace app\command;

use app\service\SkuChangedPublisher;
use think\console\Command;
use think\console\Input;
use think\console\Output;
use think\facade\Db;

/**
 * php think pim:replay-skus
 *
 * 一次性把当前所有 SKU 推 pim.sku.changed 事件，供 WMS 首次部署回填 wms_products 用。
 * 幂等：WMS handler upsert，重复跑只是覆盖。
 */
class ReplayAllSkus extends Command
{
    protected function configure(): void
    {
        $this->setName('pim:replay-skus')
            ->setDescription('Replay all SKUs as pim.sku.changed events for WMS backfill');
    }

    protected function execute(Input $input, Output $output): int
    {
        $publisher = new SkuChangedPublisher();
        $codes = Db::name('skus')->column('sku_code');
        $output->writeln("[replay] total SKUs to replay: " . count($codes));

        $ok = 0;
        foreach ($codes as $code) {
            try {
                $publisher->publishOne($code);
                $ok++;
            } catch (\Throwable $e) {
                $output->writeln("[replay] sku={$code} 失败: " . $e->getMessage());
            }
        }
        $output->writeln("[replay] published {$ok} / " . count($codes));
        return 0;
    }
}
