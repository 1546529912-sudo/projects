<?php
declare(strict_types=1);

namespace app\service\handler;

use think\facade\Db;

/**
 * 处理 oms.order.cancelled（iter-26 P0-1）
 *   payload: { order_no, user_id, reason, cancelled_at }
 *
 *   当前仅 audit log；后续 hook：可以扩展为按 order_no 释放 reserved 或归档历史拣货单
 */
class OmsOrderCancelledHandler
{
    public function __invoke(array $payload, string $eventId = '', string $traceId = ''): void
    {
        $orderNo = (string)($payload['order_no'] ?? '');
        if (!$orderNo) {
            throw new \RuntimeException('payload 缺 order_no');
        }
        // 幂等：同 order_no 同 event_type 已存在则跳过
        $dup = Db::name('oms_event_audit_log')
            ->where('event_type', 'oms.order.cancelled')
            ->where('ref_no', $orderNo)
            ->find();
        if ($dup) {
            fwrite(STDOUT, "[handler] 跳过已处理 cancelled order_no={$orderNo}\n");
            return;
        }
        Db::name('oms_event_audit_log')->insert([
            'event_type' => 'oms.order.cancelled',
            'ref_no' => $orderNo,
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            'received_at' => date('Y-m-d H:i:s'),
        ]);
        fwrite(STDOUT, "[handler] audit order_no={$orderNo} cancelled\n");
    }
}
