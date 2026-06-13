<?php
declare(strict_types=1);

namespace app\controller;

use think\Response;
use think\facade\Db;
use think\facade\Cache;

class Health
{
    public function index(): Response
    {
        $dbOk = false;
        try { Db::query('SELECT 1'); $dbOk = true; } catch (\Throwable $e) {}

        $redisOk = false;
        try {
            Cache::set('healthcheck', '1', 5);
            $redisOk = Cache::get('healthcheck') === '1';
        } catch (\Throwable $e) {}

        return json([
            'code' => 0, 'msg' => 'ok',
            'data' => [
                'service' => 'wms-backend',
                'ts'      => time(),
                'db'      => $dbOk ? 'ok' : 'down',
                'redis'   => $redisOk ? 'ok' : 'down',
            ],
        ]);
    }
}
