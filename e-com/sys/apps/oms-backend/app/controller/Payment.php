<?php
declare(strict_types=1);

namespace app\controller;

use app\service\OrderService;
use think\Request;
use think\Response;

class Payment
{
    public function __construct(private OrderService $orderService = new OrderService()) {}

    /**
     * mock 支付回调：直接置 paid
     * 真实接入：M3 校验微信签名后再调本方法
     */
    public function callback(Request $request): Response
    {
        $orderNo = (string)$request->param('order_no');
        $source = (string)$request->param('source', 'mock');
        if (!$orderNo) {
            return json(['code' => 400, 'msg' => 'order_no 必传', 'data' => null]);
        }
        try {
            // iter-37 BIZ-08-3: 父单整付 — 如果 order_no 以 PO 开头视为父单，标所有子单 paid
            if (str_starts_with($orderNo, 'PO')) {
                $data = $this->orderService->markPaidByParent($orderNo, $source);
            } else {
                $data = $this->orderService->markPaid($orderNo, $source);
            }
            return json(['code' => 0, 'msg' => 'ok', 'data' => $data]);
        } catch (\Throwable $e) {
            return json(['code' => 409, 'msg' => $e->getMessage(), 'data' => null]);
        }
    }
}
