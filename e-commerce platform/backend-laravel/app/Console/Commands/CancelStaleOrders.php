<?php

namespace App\Console\Commands;

use App\Contracts\StockManager;
use App\Models\Order;
use App\Models\Sku;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * 30 分钟未支付的 pending_payment 订单自动取消并释放库存。
 *
 * 由 Schedule 每分钟跑一次；也可手动：
 *   php artisan orders:cancel-stale [--minutes=30]
 */
class CancelStaleOrders extends Command
{
    protected $signature = 'orders:cancel-stale {--minutes=30 : 超时分钟数}';
    protected $description = '取消超时未支付订单，释放占用库存';

    public function handle(StockManager $stockManager): int
    {
        $minutes = (int) $this->option('minutes');
        $threshold = now()->subMinutes($minutes);

        $orders = Order::with('items')
            ->where('status', 'pending_payment')
            ->where('created_at', '<', $threshold)
            ->get();

        $cancelled = 0;
        foreach ($orders as $order) {
            DB::transaction(function () use ($order, &$cancelled, $stockManager) {
                $order->update([
                    'status' => 'cancelled',
                    'cancel_reason' => "{$this->option('minutes')} 分钟内未支付，系统自动取消",
                    'cancelled_at' => now(),
                ]);
                foreach ($order->items as $item) {
                    Sku::where('id', $item->sku_id)->increment('stock', $item->qty);
                    $stockManager->release($item->sku_id, $item->qty);
                    app(\App\Services\StockAlertService::class)->check($item->sku_id);
                }
                $cancelled++;
            });
        }

        $this->info("已取消 {$cancelled} 个超时订单（阈值：{$minutes} 分钟）");
        return self::SUCCESS;
    }
}
