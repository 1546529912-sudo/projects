<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Payment Controller · TRADE-005
 *
 * 第一期为简化版：
 * - 在线支付走 mock 通道（POST /payments/{id}/mock-success）
 * - 对公转账走凭证上传 + admin 审核
 *
 * 真实接入：替换 mockSuccess 为微信/支付宝 SDK callback
 */
class PaymentController extends Controller
{
    // POST /api/v1/payments  发起支付
    public function initiate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => 'required|integer',
            'method' => 'required|in:wechat,alipay,bank_transfer',
        ]);

        $order = Order::where('user_id', $request->user()->id)
            ->where('status', 'pending_payment')
            ->findOrFail($data['order_id']);

        $payment = Payment::create([
            'order_id' => $order->id,
            'payment_no' => $this->generatePaymentNo($order->order_no, $data['method']),
            'method' => $data['method'],
            'amount' => $order->total_amount,
            'status' => 'pending',
        ]);

        // 返回支付方式相关的"前端展示数据"
        $payload = [
            'payment' => $payment,
            'order_no' => $order->order_no,
            'amount' => $order->total_amount,
        ];

        if (in_array($data['method'], ['wechat', 'alipay'])) {
            // mock 二维码内容
            $payload['qr_code_text'] = "MOCK://pay/{$payment->payment_no}";
            $payload['mock_endpoint'] = url("/api/v1/payments/{$payment->id}/mock-success");
        } elseif ($data['method'] === 'bank_transfer') {
            $payload['bank_account'] = [
                'name' => '中研复材（深圳）科技有限公司',
                'bank' => '招商银行深圳分行营业部',
                'account_no' => '755 1234 5678 9012',
            ];
        }

        return $this->ok($payload);
    }

    // POST /api/v1/payments/{id}/mock-success  模拟在线支付回调
    public function mockSuccess(Request $request, int $id): JsonResponse
    {
        $payment = Payment::with('order')->findOrFail($id);
        $order = $payment->order;

        if ($order->user_id !== $request->user()->id) {
            return $this->fail(403, '无权限', 403);
        }
        if (! in_array($payment->method, ['wechat', 'alipay'])) {
            return $this->fail(1501, 'mock 通道仅支持在线支付方式', 422);
        }
        if ($payment->status === 'success') {
            return $this->ok(['payment' => $payment, 'order' => $order->fresh()]);
        }
        if ($payment->status !== 'pending') {
            return $this->fail(1502, '支付单状态不允许此操作', 422);
        }

        return DB::transaction(function () use ($payment, $order) {
            $payment->update([
                'status' => 'success',
                'transaction_id' => 'MOCK_'.uniqid(),
                'paid_at' => now(),
            ]);
            $order->update([
                'status' => 'pending_shipment',
                'paid_at' => now(),
                'paid_amount' => $order->total_amount,
            ]);
            return $this->ok(['payment' => $payment->fresh(), 'order' => $order->fresh()]);
        });
    }

    // POST /api/v1/payments/{id}/voucher  对公转账上传凭证
    public function uploadVoucher(Request $request, int $id): JsonResponse
    {
        $payment = Payment::with('order')->findOrFail($id);

        if ($payment->order->user_id !== $request->user()->id) {
            return $this->fail(403, '无权限', 403);
        }
        if ($payment->method !== 'bank_transfer') {
            return $this->fail(1503, '仅对公转账支持凭证上传', 422);
        }
        if ($payment->status !== 'pending') {
            return $this->fail(1502, '该支付单已不可修改', 422);
        }

        $request->validate([
            'file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $path = $request->file('file')->store('vouchers', 'public');
        $url = url(Storage::url($path));

        return DB::transaction(function () use ($payment, $url) {
            $payment->update(['voucher_url' => $url]);
            $payment->order->update(['status' => 'pending_review']);
            return $this->ok([
                'payment' => $payment->fresh(),
                'order' => $payment->order->fresh(),
                'url' => $url,
            ]);
        });
    }

    private function generatePaymentNo(string $orderNo, string $method): string
    {
        $methodPrefix = ['wechat' => 'WX', 'alipay' => 'AL', 'bank_transfer' => 'BT'][$method];
        return $methodPrefix.$orderNo.str_pad((string) random_int(0, 999), 3, '0', STR_PAD_LEFT);
    }

    private function ok(array $data): JsonResponse
    {
        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $data]);
    }

    private function fail(int $code, string $message, int $status = 400): JsonResponse
    {
        return response()->json(['code' => $code, 'message' => $message, 'data' => null], $status);
    }
}
