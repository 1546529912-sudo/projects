<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class Warehouse extends Model
{
    protected $table = 'warehouses';
    protected $autoWriteTimestamp = false;
}
