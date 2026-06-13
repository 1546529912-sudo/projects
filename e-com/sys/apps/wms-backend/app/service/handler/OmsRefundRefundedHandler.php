<?php
declare(strict_types=1);

namespace app\service\handler;

use think\facade\Db;

/**
 * 处理 oms.refund.refunded（iter-26 P0-1）
 *   payload: { refund_no, order_no, type, amount, operator, event_at }
 */
class OmsRefundRefundedHandler
{
    public function __invoke(array $payload, string $eventId = '', string $traceId = ''): void
    {
        $refundNo = (string)($payload['refund_no'] ?? '');
        if (!$refundNo) throw new \RuntimeException('payload 缺 refund_no');
        $dup = Db::name('oms_event_audit_log')
            ->where('event_type', 'oms.refund.refunded')
            ->where('ref_no', $refundNo)
            ->find();
        if ($dup) {
            fwrite(STDOUT, "[handler] 跳过已处理 refunded refund_no={$refundNo}\n");
            return;
        }
        Db::name('oms_event_audit_log')->insert([
            'event_type' => 'oms.refund.refunded',
            'ref_no' => $refundNo,
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            'received_at' => date('Y-m-d H:i:s'),
        ]);
        fwrite(STDOUT, "[handler] audit refund_no={$refundNo} refunded\n");
    }
}
