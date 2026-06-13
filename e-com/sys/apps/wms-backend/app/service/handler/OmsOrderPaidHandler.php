<?php
declare(strict_types=1);

namespace app\service\handler;

use app\service\OutboundService;
use think\facade\Db;

/**
 * 处理 oms.order.paid：
 *   - 调 OutboundService::acceptPicking 创建 outbound + 分配库位 + 锁定库存
 *   - 幂等：用 picking_no 当 Idempotency-Key
 */
class OmsOrderPaidHandler
{
    public function __construct(private OutboundService $service = new OutboundService()) {}

    /**
     * payload: { order_no, picking_no, warehouse_code, items, address }
     */
    public function __invoke(array $payload, string $eventId = '', string $traceId = ''): void
    {
        $orderNo = (string)($payload['order_no'] ?? '');
        $pickingNo = (string)($payload['picking_no'] ?? '');
        $items = $payload['items'] ?? [];
        $address = $payload['address'] ?? [];
        $warehouse = (string)($payload['warehouse_code'] ?? 'WH-DEFAULT');

        if (!$orderNo || !$pickingNo || !is_array($items) || !$items) {
            throw new \RuntimeException('payload 缺字段: order_no/picking_no/items');
        }

        // 幂等：已存在则直接返回
        $exist = Db::name('outbound_orders')->where('outbound_no', $pickingNo)->find();
        if ($exist) {
            fwrite(STDOUT, "[handler] outbound {$pickingNo} 已存在，跳过\n");
            return;
        }

        $this->service->acceptPicking([
            'outbound_no' => $pickingNo,
            'oms_order_no' => $orderNo,
            'warehouse_code' => $warehouse,
            'items' => $items,
            'address' => $address,
        ], 'oms-paid-' . $pickingNo);

        fwrite(STDOUT, "[handler] outbound {$pickingNo} created for order {$orderNo}\n");
    }
}
