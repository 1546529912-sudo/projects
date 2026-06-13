<?php

namespace App\Console\Commands;

use App\Contracts\StockManager;
use App\Models\Sku;
use Illuminate\Console\Command;

/**
 * 把 DB 当前 sku.stock 全量写入 Redis（key: sku:stock:{id}）。
 *
 *   php artisan sku:warmup-redis
 *
 * 应用场景：
 *   - 上线首次启动
 *   - Redis 数据丢失后的修复
 *   - 后台改库后强制一致（仅当 active 状态）
 */
class SkuWarmupRedis extends Command
{
    protected $signature = 'sku:warmup-redis {--only-active : 仅同步 active SKU}';
    protected $description = '把 DB.sku.stock 全量同步到 Redis（库存预扣缓存）';

    public function handle(StockManager $stockManager): int
    {
        $q = Sku::query();
        if ($this->option('only-active')) $q->where('status', 'active');

        $count = 0;
        $q->chunkById(500, function ($skus) use ($stockManager, &$count) {
            foreach ($skus as $sku) {
                $stockManager->sync($sku->id, (int) $sku->stock);
                $count++;
            }
        });

        $this->info("已同步 {$count} 个 SKU 库存到 Redis");
        return self::SUCCESS;
    }
}
