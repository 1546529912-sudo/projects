<?php

namespace App\Services;

use App\Jobs\DispatchWebhookJob;
use App\Models\Sku;
use App\Models\StockAlert;
use Illuminate\Support\Facades\DB;

/**
 * 库存预警 Service · iter-11
 *
 * 调用点：每次 SKU stock 变更后（下单扣 / 取消回 / 后台编辑）。
 * 规则：
 *   stock <= threshold 且无 open 告警 → 创建 open + Webhook
 *   stock >  threshold 且有 open 告警 → resolve（库存补回来了）
 */
class StockAlertService
{
    public function __construct(private WebhookDispatcher $webhook) {}

    /**
     * 检查指定 SKU 当前是否需要触发/解除预警。
     * 返回 'triggered' | 'resolved' | 'noop'。
     */
    public function check(int $skuId): string
    {
        $sku = Sku::find($skuId);
        if (! $sku) return 'noop';

        $open = StockAlert::where('sku_id', $skuId)->where('status', 'open')->first();

        if ($sku->stock <= $sku->stock_threshold) {
            if ($open) {
                // 已有 open，更新当前 stock 快照（不重复发 webhook）
                $open->update(['current_stock' => (int) $sku->stock]);
                return 'noop';
            }
            return $this->trigger($sku);
        }

        // stock > threshold
        if ($open) {
            $open->update(['status' => 'resolved', 'resolved_at' => now()]);
            return 'resolved';
        }
        return 'noop';
    }

    private function trigger(Sku $sku): string
    {
        return DB::transaction(function () use ($sku) {
            $alert = StockAlert::create([
                'sku_id' => $sku->id,
                'current_stock' => (int) $sku->stock,
                'threshold' => (int) $sku->stock_threshold,
                'status' => 'open',
                'webhook_status' => 'pending',
                'triggered_at' => now(),
            ]);

            // iter-17：webhook 走 queue，主流程不阻塞
            // sync queue（默认）会立即执行；redis queue 则异步
            DispatchWebhookJob::dispatch('stock.low', [
                'sku_id' => $sku->id,
                'sku_code' => $sku->sku_code,
                'product_id' => $sku->product_id,
                'current_stock' => (int) $sku->stock,
                'threshold' => (int) $sku->stock_threshold,
            ], $alert->id);

            return 'triggered';
        });
    }
}
