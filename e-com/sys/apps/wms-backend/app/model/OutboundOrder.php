<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class OutboundOrder extends Model
{
    protected $table = 'outbound_orders';
    protected $autoWriteTimestamp = false;
    protected $json = ['address'];
    protected $jsonAssoc = true;
}
