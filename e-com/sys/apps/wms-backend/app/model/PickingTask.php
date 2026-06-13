<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class PickingTask extends Model
{
    protected $table = 'picking_tasks';
    protected $autoWriteTimestamp = false;
}
