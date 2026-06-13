<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class PickingOrder extends Model
{
    protected $table = 'picking_orders';
    protected $autoWriteTimestamp = false;
}
