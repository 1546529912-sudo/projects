<?php
declare(strict_types=1);

namespace app\controller;

use app\service\OutboundService;
use think\Request;
use think\Response;

class Outbound
{
    public function __construct(private OutboundService $service = new OutboundService()) {}

    public function list(Request $request): Response
    {
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(100, (int)$request->param('size', 20)));
        return json(['code' => 0, 'msg' => 'ok', 'data' => $this->service->listAll($page, $size)]);
    }

    public function detail(string $outboundNo): Response
    {
        try {
            return json(['code' => 0, 'msg' => 'ok', 'data' => $this->service->detail($outboundNo)]);
        } catch (\Throwable $e) {
            return json(['code' => 404, 'msg' => $e->getMessage(), 'data' => null]);
        }
    }

    /**
     * POST /api/v1/outbound/:no/auto-complete
     * 模拟 PDA 一键完成（pick + review + ship）+ 回传 OMS
     */
    public function autoComplete(string $outboundNo): Response
    {
        try {
            return json(['code' => 0, 'msg' => 'ok', 'data' => $this->service->autoComplete($outboundNo)]);
        } catch (\Throwable $e) {
            return json(['code' => 409, 'msg' => $e->getMessage(), 'data' => null]);
        }
    }
}
