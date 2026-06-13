<?php
declare(strict_types=1);

namespace app\service\handler;

use think\facade\Db;

/**
 * 处理 oms.refund.approved（iter-26 P0-1）
 *   payload: { refund_no, order_no, type, amount, operator, event_at }
 *
 *   当前仅 audit log；后续 hook：return_refund 时可以预创建入库单等待用户发货
 */
class OmsRefundApprovedHandler
{
    public function __invoke(array $payload, string $eventId = '', string $traceId = ''): void
    {
        $refundNo = (string)($payload['refund_no'] ?? '');
        if (!$refundNo) throw new \RuntimeException('payload 缺 refund_no');
        $dup = Db::name('oms_event_audit_log')
            ->where('event_type', 'oms.refund.approved')
            ->where('ref_no', $refundNo)
            ->find();
        if ($dup) {
            fwrite(STDOUT, "[handler] 跳过已处理 approved refund_no={$refundNo}\n");
            return;
        }
        Db::name('oms_event_audit_log')->insert([
            'event_type' => 'oms.refund.approved',
            'ref_no' => $refundNo,
            'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
            'received_at' => date('Y-m-d H:i:s'),
        ]);
        fwrite(STDOUT, "[handler] audit refund_no={$refundNo} approved\n");
    }
}
