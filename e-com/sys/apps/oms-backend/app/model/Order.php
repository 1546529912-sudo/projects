<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class Order extends Model
{
    protected $table = 'orders';
    protected $pk = 'id';
    protected $autoWriteTimestamp = false;

    protected $json = ['address'];
    protected $jsonAssoc = true;
}
