<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class Inventory extends Model
{
    protected $table = 'inventory';
    protected $autoWriteTimestamp = false;
}
