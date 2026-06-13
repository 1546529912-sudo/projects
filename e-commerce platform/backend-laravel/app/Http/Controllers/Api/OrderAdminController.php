<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Sku;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * 后台订单 Controller · TRADE-008-02/04
 */
class OrderAdminController extends Controller
{
    // GET /api/v1/admin/orders
    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status');
        $kw = $request->input('keyword');
        $perPage = (int) $request->input('per_page', 20);

        $q = Order::with(['items', 'payments', 'user'])->latest();
        if ($status && $status !== 'all') $q->where('status', $status);
        if ($kw) {
            $q->where(fn ($qq) => $qq
                ->where('order_no', 'like', "%$kw%")
                ->orWhereHas('user', fn ($u) => $u->where('phone', 'like', "%$kw%")));
        }

        $page = $q->paginate($perPage);

        return $this->ok([
            'items' => array_map(fn ($o) => $this->adminListJson($o), $page->items()),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
        ]);
    }

    // POST /api/v1/admin/orders/{id}/ship · TRADE-008-02
    public function ship(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'tracking_company' => 'required|string|max:64',
            'tracking_no' => 'required|string|max:64',
        ]);

        $order = Order::findOrFail($id);
        if ($order->status !== 'pending_shipment') {
            return $this->fail(1601, '订单当前状态不可发货', 422);
        }

        $order->update([
            'tracking_company' => $data['tracking_company'],
            'tracking_no' => $data['tracking_no'],
            'status' => 'shipped',
            'shipped_at' => now(),
        ]);

        // 生成 mock 物流轨迹（生产环境换为 LogisticsService\Drivers\KdNiao）
        app(\App\Services\LogisticsService::class)->generateMockTracks(
            $order->fresh(),
            $data['tracking_company'],
            $data['tracking_no'],
        );

        return $this->ok(['order' => $order->fresh()]);
    }

    // POST /api/v1/admin/payments/{id}/review · TRADE-008-04 对公转账凭证审核
    public function reviewVoucher(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'action' => 'required|in:approve,reject',
            'reject_reason' => 'required_if:action,reject|string|max:512',
        ]);

        $payment = Payment::with('order')->findOrFail($id);

        if ($payment->method !== 'bank_transfer') {
            return $this->fail(1602, '仅对公转账凭证可审核', 422);
        }
        if ($payment->status !== 'pending') {
            return $this->fail(1603, '该支付单已审核', 422);
        }
        if ($payment->order->status !== 'pending_review') {
            return $this->fail(1604, '订单状态异常', 422);
        }

        return DB::transaction(function () use ($payment, $data, $request) {
            if ($data['action'] === 'approve') {
                $payment->update([
                    'status' => 'success',
                    'transaction_id' => 'BANK_'.uniqid(),
                    'paid_at' => now(),
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);
                $payment->order->update([
                    'status' => 'pending_shipment',
                    'paid_at' => now(),
                    'paid_amount' => $payment->order->total_amount,
                ]);
            } else {
                $payment->update([
                    'status' => 'failed',
                    'reject_reason' => $data['reject_reason'],
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);
                // 订单回到 pending_payment 让用户重新付款或上传新凭证
                $payment->order->update(['status' => 'pending_payment']);
            }

            return $this->ok([
                'payment' => $payment->fresh(),
                'order' => $payment->order->fresh(),
            ]);
        });
    }

    private function adminListJson(Order $o): array
    {
        $bankPayment = $o->payments->firstWhere('method', 'bank_transfer');
        return [
            'id' => $o->id,
            'order_no' => $o->order_no,
            'status' => $o->status,
            'user' => $o->user ? [
                'id' => $o->user->id,
                'phone' => $o->user->phone,
            ] : null,
            'total_amount' => $o->total_amount,
            'paid_amount' => $o->paid_amount,
            'shipping_address' => $o->shipping_address,
            'tracking_company' => $o->tracking_company,
            'tracking_no' => $o->tracking_no,
            'first_product_name' => $o->items->first()?->product_name,
            'item_count' => $o->items->sum('qty'),
            'pending_voucher' => $bankPayment && $bankPayment->status === 'pending' && $bankPayment->voucher_url ? [
                'payment_id' => $bankPayment->id,
                'voucher_url' => $bankPayment->voucher_url,
            ] : null,
            'created_at' => $o->created_at?->toIso8601String(),
        ];
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
