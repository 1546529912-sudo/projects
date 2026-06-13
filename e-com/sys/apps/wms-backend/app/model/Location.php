<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class Location extends Model
{
    protected $table = 'locations';
    protected $autoWriteTimestamp = false;
}
