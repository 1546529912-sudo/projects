<?php
declare(strict_types=1);

namespace app\model;

use think\Model;

class SmsLog extends Model
{
    protected $table = 'sms_log';
    protected $autoWriteTimestamp = false;
}
