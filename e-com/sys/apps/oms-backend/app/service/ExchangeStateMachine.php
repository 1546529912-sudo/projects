<?php
declare(strict_types=1);

namespace app\service;

/**
 * 换货状态机（iter-34）
 *
 *   pending_approve → approved → received_old → sent_new → completed
 *                   ↘ rejected
 *                   ↘ cancelled
 */
class ExchangeStateMachine
{
    public const PENDING = 'pending_approve';
    public const APPROVED = 'approved';
    public const REJECTED = 'rejected';
    public const CANCELLED = 'cancelled';
    public const RECEIVED_OLD = 'received_old';
    public const SENT_NEW = 'sent_new';
    public const COMPLETED = 'completed';

    private const TRANSITIONS = [
        self::PENDING => [self::APPROVED, self::REJECTED, self::CANCELLED],
        self::APPROVED => [self::RECEIVED_OLD],
        self::RECEIVED_OLD => [self::SENT_NEW],
        self::SENT_NEW => [self::COMPLETED],
        self::REJECTED => [],
        self::CANCELLED => [],
        self::COMPLETED => [],
    ];

    public static function can(string $from, string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$from] ?? [], true);
    }

    public static function assert(string $from, string $to): void
    {
        if (!self::can($from, $to)) {
            throw new \RuntimeException("换货状态非法转移: {$from} → {$to}");
        }
    }

    public static function isTerminal(string $status): bool
    {
        return in_array($status, [self::REJECTED, self::CANCELLED, self::COMPLETED], true);
    }
}
