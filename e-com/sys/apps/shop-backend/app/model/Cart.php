<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class Cart extends Model
{
    protected $table = 'cart';
    protected $autoWriteTimestamp = false;
}
