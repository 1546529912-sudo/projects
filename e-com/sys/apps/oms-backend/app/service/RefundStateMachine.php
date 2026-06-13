<?php
declare(strict_types=1);

namespace app\service;

/**
 * 退款状态机
 *   pending_approve → approved → received_back → refunded
 *                   ↘ rejected
 *
 * refund_only: pending_approve → approved → refunded（不经 received_back）
 * return_refund: pending_approve → approved → received_back → refunded
 */
class RefundStateMachine
{
    private const TRANSITIONS = [
        'pending_approve' => ['approved', 'rejected'],
        'approved'        => ['received_back', 'refunded', 'closed_overtime'],   // iter-16: approved 超时未发起退货 → closed_overtime
        'received_back'   => ['refunded'],
        'refunded'        => [],
        'rejected'        => [],
        'closed_overtime' => [],
    ];

    public static function can(string $from, string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$from] ?? [], true);
    }
}
