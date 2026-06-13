<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class OutboundItem extends Model
{
    protected $table = 'outbound_items';
    protected $autoWriteTimestamp = false;
}
