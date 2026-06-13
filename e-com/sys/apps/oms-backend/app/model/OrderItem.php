<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class OrderItem extends Model
{
    protected $table = 'order_items';
    protected $autoWriteTimestamp = false;
    protected $json = ['sku_snapshot'];
    protected $jsonAssoc = true;
}
