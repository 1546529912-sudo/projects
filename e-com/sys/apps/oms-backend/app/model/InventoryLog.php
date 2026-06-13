<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class InventoryLog extends Model
{
    protected $table = 'inventory_log';
    protected $autoWriteTimestamp = false;
}
