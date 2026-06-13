<?php

namespace App\Services;

use App\Models\LogisticsTrack;
use App\Models\Order;
use Carbon\Carbon;

/**
 * 物流服务
 *
 * - Mock provider：生成模拟的 4 节点轨迹（accepted/transit/dispatching/delivered）
 * - 真实接入快递鸟时：替换 fetchRealTracks() 为 KdNiao SDK 调用
 */
class LogisticsService
{
    /**
     * 发货时生成 mock 物流轨迹（4 节点）。
     * 节点时间按 "已揽件 = 发货后 30 分、转运 = +6h、派送 = +24h、签收 = +36h" 推算。
     */
    public function generateMockTracks(Order $order, string $company, string $trackingNo): void
    {
        if (! $order->shipped_at) {
            $order->shipped_at = now();
        }

        // 收货地址用作目的地
        $address = $order->shipping_address;
        $destCity = trim(($address['city'] ?? '').($address['district'] ?? ''));
        $base = Carbon::parse($order->shipped_at);

        $nodes = [
            [
                'node' => 'accepted',
                'location' => '广东省深圳市南山区中研复材仓库',
                'description' => "【{$company}】快递员已揽件，运单号 {$trackingNo}",
                'occurred_at' => $base->copy()->addMinutes(30),
            ],
            [
                'node' => 'transit',
                'location' => '深圳转运中心',
                'description' => '【转运中】快件已离开深圳，发往目的城市',
                'occurred_at' => $base->copy()->addHours(6),
            ],
            [
                'node' => 'dispatching',
                'location' => $destCity ?: '目的城市',
                'description' => '【派送中】快件已到达派送网点，开始派送',
                'occurred_at' => $base->copy()->addHours(24),
            ],
            // 签收节点不立即生成（等用户确认收货时再写入）
        ];

        foreach ($nodes as $node) {
            LogisticsTrack::create(array_merge(['order_id' => $order->id], $node));
        }
    }

    /** 用户确认收货时追加签收节点 */
    public function appendDeliveredNode(Order $order): void
    {
        LogisticsTrack::create([
            'order_id' => $order->id,
            'node' => 'delivered',
            'location' => trim((string) ($order->shipping_address['city'] ?? '')),
            'description' => '【已签收】买家已确认收货',
            'occurred_at' => $order->received_at ?? now(),
        ]);
    }

    /** 取订单物流轨迹（按时间倒序，最新在前）*/
    public function getTracks(Order $order)
    {
        return LogisticsTrack::where('order_id', $order->id)
            ->orderByDesc('occurred_at')
            ->get();
    }
}
