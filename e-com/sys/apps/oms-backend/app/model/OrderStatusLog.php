<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class OrderStatusLog extends Model
{
    protected $table = 'order_status_log';
    protected $autoWriteTimestamp = false;
}
