<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

/**
 * 退款明细（iter-28 P1-3）
 */
class RefundItem extends Model
{
    protected $name = 'refund_items';
    protected $pk = 'id';
    protected $autoWriteTimestamp = false;

    protected $type = [
        'qty' => 'integer',
    ];

    public function refund()
    {
        return $this->belongsTo(Refund::class, 'refund_no', 'refund_no');
    }
}
