<?php
declare(strict_types=1);

namespace app\controller;

use app\service\WmsStatsService;
use think\Request;
use think\Response;

class Stats
{
    private WmsStatsService $svc;
    public function __construct() { $this->svc = new WmsStatsService(); }

    public function stats(Request $request): Response
    {
        $days = (int)$request->param('days', 7);
        return json(['code' => 0, 'msg' => 'ok', 'data' => $this->svc->stats($days)]);
    }
}
