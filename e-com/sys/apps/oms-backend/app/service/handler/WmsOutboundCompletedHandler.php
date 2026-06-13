<?php
declare(strict_types=1);

namespace app\service\handler;

use app\service\OrderService;
use think\facade\Db;

/**
 * 处理 wms.outbound.completed 事件：
 *   - 调 OrderService::markShipped 完成 picking→shipped + 实物扣库存 + 回写 express_no
 *   - 幂等：picking_orders.status 已是 shipped 时直接 ACK
 */
class WmsOutboundCompletedHandler
{
    public function __construct(private OrderService $orderService = new OrderService()) {}

    /**
     * payload: { order_no, picking_no, express_no, items: [{sku_code, qty}, ...] }
     */
    public function __invoke(array $payload, string $eventId = '', string $traceId = ''): void
    {
        $orderNo = (string)($payload['order_no'] ?? '');
        $expressNo = (string)($payload['express_no'] ?? '');
        $items = $payload['items'] ?? [];
        $pickingNo = (string)($payload['picking_no'] ?? '');

        if (!$orderNo || !$expressNo || !is_array($items) || !$items) {
            throw new \RuntimeException('payload 缺字段: order_no/express_no/items');
        }

        // 幂等：订单已是 shipped/completed 则跳过
        $order = Db::name('orders')->where('order_no', $orderNo)->find();
        if (!$order) {
            throw new \RuntimeException("订单不存在: {$orderNo}");
        }
        if (in_array($order['status'], ['shipped', 'completed'], true)) {
            fwrite(STDOUT, "[handler] 订单 {$orderNo} 已 {$order['status']}，跳过\n");
            return;
        }

        $this->orderService->markShipped($orderNo, $expressNo, $items);

        if ($pickingNo) {
            Db::name('picking_orders')
                ->where('picking_no', $pickingNo)
                ->update(['status' => 'shipped']);
        }
        fwrite(STDOUT, "[handler] order_no={$orderNo} shipped, express_no={$expressNo}\n");
    }
}
