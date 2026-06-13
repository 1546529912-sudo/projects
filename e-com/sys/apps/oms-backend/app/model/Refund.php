<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

/**
 * 退款主表（iter-28 P1-3）
 *
 *   渐进式 Model 封装：
 *     - 当前 RefundService 仍主要用 Db::name('refund_orders') 裸调用
 *     - 提供本 Model 供新代码使用 / 查询便利方法
 *     - 写操作仍走原路径（避免双写不一致风险，留 M3+ 全替换）
 */
class Refund extends Model
{
    protected $name = 'refund_orders';
    protected $pk = 'id';
    protected $autoWriteTimestamp = false;

    protected $type = [
        'amount' => 'integer',
        'user_id' => 'integer',
    ];

    public function items()
    {
        return $this->hasMany(RefundItem::class, 'refund_no', 'refund_no');
    }

    /**
     * 状态机辅助：是否可执行某状态转移
     */
    public static function canTransit(string $from, string $to): bool
    {
        $map = [
            'pending_approve' => ['approved', 'rejected'],
            'approved' => ['received_back', 'refunded', 'closed_overtime'],
            'received_back' => ['refunded'],
        ];
        return in_array($to, $map[$from] ?? [], true);
    }
}
