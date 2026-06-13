<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 订单状态机
 *   pending_pay → paid → picking → shipped → completed
 *                ↘ cancelled（仅 pending_pay 可取消）
 *                ↘ exception（异常态，admin 介入恢复）
 */
class OrderStateMachine
{
    private const TRANSITIONS = [
        'pending_pay' => ['paid', 'cancelled', 'exception'],
        // iter-18 fix: paid 状态允许 admin 强制 cancelled（Admin::cancelOrder + batchCancelOrders 文档已声明）
        'paid'        => ['picking', 'cancelled', 'exception'],
        'picking'     => ['shipped', 'exception'],
        'shipped'     => ['completed', 'exception'],
        'completed'   => [],
        'cancelled'   => [],
        'exception'   => ['paid', 'picking', 'shipped', 'completed', 'cancelled'],
    ];

    public static function can(string $from, string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$from] ?? [], true);
    }

    /**
     * 切换状态 + 写日志（外层应在事务内调用）
     */
    public function transit(string $orderNo, string $to, string $operator = 'system', string $source = '', string $remark = ''): void
    {
        $order = Db::name('orders')->where('order_no', $orderNo)->lock(true)->find();
        if (!$order) {
            throw new \RuntimeException("订单不存在: {$orderNo}");
        }
        $from = (string)$order['status'];
        if (!self::can($from, $to)) {
            throw new \RuntimeException("状态非法转移: {$orderNo} {$from} → {$to}");
        }

        $update = ['status' => $to];
        if ($to === 'paid') $update['paid_at'] = date('Y-m-d H:i:s');
        if ($to === 'shipped') $update['shipped_at'] = date('Y-m-d H:i:s');
        if ($to === 'completed') $update['completed_at'] = date('Y-m-d H:i:s');
        if ($to === 'cancelled') $update['cancelled_at'] = date('Y-m-d H:i:s');

        Db::name('orders')->where('order_no', $orderNo)->update($update);
        Db::name('order_status_log')->insert([
            'order_no' => $orderNo,
            'from_status' => $from,
            'to_status' => $to,
            'operator' => $operator,
            'source' => $source,
            'remark' => $remark,
        ]);
    }
}
