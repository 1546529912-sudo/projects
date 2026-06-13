<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class InventoryStatus extends Model
{
    protected $table = 'inventory_status';
    protected $pk = 'sku_code';
    protected $autoWriteTimestamp = false;
}
