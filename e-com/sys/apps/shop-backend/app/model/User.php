<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class User extends Model
{
    protected $table = 'users';
    protected $autoWriteTimestamp = false;
    protected $json = ['last_address_snapshot'];
    protected $jsonAssoc = true;
}
