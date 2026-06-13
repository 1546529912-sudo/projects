<?php

namespace App\Http\Controllers\Api;

use App\Contracts\StockManager;
use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Sku;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * 订单 Controller · TRADE-004 / TRADE-006
 *
 * - POST /api/v1/orders        创建订单（从已勾选的购物车）
 * - GET  /api/v1/orders        我的订单列表（按状态 tab）
 * - GET  /api/v1/orders/{id}   订单详情
 * - POST /api/v1/orders/{id}/cancel  取消（仅 pending_payment）
 */
class OrderController extends Controller
{
    public function store(Request $request, StockManager $stockManager): JsonResponse
    {
        $data = $request->validate([
            'address_id' => 'required|integer',
            'shipping_method' => 'sometimes|in:standard,express',
            'remark' => 'nullable|string|max:512',
        ]);

        $user = $request->user();

        $address = Address::where('user_id', $user->id)->findOrFail($data['address_id']);

        $cart = Cart::where('user_id', $user->id)
            ->where('active_role', $user->active_role ?? 'individual')
            ->first();
        if (! $cart) return $this->fail(1401, '购物车为空', 422);

        $items = CartItem::with(['sku.product'])
            ->where('cart_id', $cart->id)
            ->where('selected', 1)
            ->get();

        if ($items->isEmpty()) return $this->fail(1401, '请先勾选商品', 422);

        // 失效检测先行（避免给已失效 SKU 预扣 Redis）
        foreach ($items as $item) {
            $sku = $item->sku;
            if (! $sku || $sku->status !== 'active'
                || ! $sku->product || $sku->product->status !== 'active') {
                return $this->fail(1402, '存在已失效商品，请刷新购物车', 422);
            }
        }

        // Redis Lua 原子预扣（防超卖兜底）；任一失败则回滚已预扣的并拒绝
        $reserved = [];
        foreach ($items as $item) {
            if (! $stockManager->tryReserve($item->sku_id, $item->qty)) {
                foreach ($reserved as $r) {
                    $stockManager->release($r['sku_id'], $r['qty']);
                }
                return $this->fail(1403, "商品 {$item->sku->product->name} 库存不足", 422);
            }
            $reserved[] = ['sku_id' => $item->sku_id, 'qty' => $item->qty];
        }

        try {
            return DB::transaction(function () use ($items, $address, $data, $user, $cart) {
            $shippingFee = 10.00; // 简化：固定运费
            // 用阶梯价快照（CartItem.snapshot_price），兜底 sku.base_price
            $productAmount = $items->sum(function ($i) {
                $price = $i->snapshot_price !== null
                    ? (float) $i->snapshot_price
                    : (float) $i->sku->base_price;
                return $price * $i->qty;
            });
            $totalAmount = $productAmount + $shippingFee;

            $orderNo = $this->generateOrderNo();

            $order = Order::create([
                'order_no' => $orderNo,
                'user_id' => $user->id,
                'active_role' => $user->active_role ?? 'individual',
                'product_amount' => $productAmount,
                'shipping_fee' => $shippingFee,
                'discount_amount' => 0,
                'total_amount' => $totalAmount,
                'status' => 'pending_payment',
                'shipping_method' => $data['shipping_method'] ?? 'standard',
                'shipping_address' => [
                    'receiver_name' => $address->receiver_name,
                    'receiver_phone' => $address->receiver_phone,
                    'province' => $address->province,
                    'city' => $address->city,
                    'district' => $address->district,
                    'detail' => $address->detail,
                ],
                'remark' => $data['remark'] ?? null,
            ]);

            foreach ($items as $item) {
                $sku = $item->sku;
                $unitPrice = $item->snapshot_price !== null
                    ? (float) $item->snapshot_price
                    : (float) $sku->base_price;
                OrderItem::create([
                    'order_id' => $order->id,
                    'sku_id' => $sku->id,
                    'product_name' => $sku->product->name,
                    'sku_code' => $sku->sku_code,
                    'product_image' => $sku->product->main_image_url,
                    'qty' => $item->qty,
                    'unit_price' => $unitPrice,
                    'total_price' => $unitPrice * $item->qty,
                ]);

                // 简化：MySQL/SQLite 直接扣库存（生产用 Redis 预扣）
                $sku->decrement('stock', $item->qty);
                app(\App\Services\StockAlertService::class)->check($sku->id);
            }

            // 清掉本次下单的购物车项
            CartItem::whereIn('id', $items->pluck('id'))->delete();

            return $this->ok([
                'order' => $this->orderDetail($order->fresh('items')),
            ]);
        });
        } catch (\Throwable $e) {
            // DB 落库失败 → 回滚 Redis 预扣，避免幽灵库存
            foreach ($reserved as $r) {
                $stockManager->release($r['sku_id'], $r['qty']);
            }
            throw $e;
        }
    }

    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status');
        $perPage = (int) $request->input('per_page', 10);

        $q = Order::with('items')->where('user_id', $request->user()->id);
        if ($status && $status !== 'all') {
            $q->where('status', $status);
        }
        $page = $q->latest()->paginate($perPage);

        return $this->ok([
            'items' => array_map(fn ($o) => $this->orderListJson($o), $page->items()),
            'total' => $page->total(),
            'page' => $page->currentPage(),
            'per_page' => $page->perPage(),
        ]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $order = Order::with('items')
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);
        return $this->ok(['order' => $this->orderDetail($order)]);
    }

    public function cancel(Request $request, int $id, StockManager $stockManager): JsonResponse
    {
        $order = Order::with('items')
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $data = $request->validate(['reason' => 'nullable|string|max:255']);

        if ($order->status !== 'pending_payment') {
            return $this->fail(1404, '订单当前状态不可直接取消', 422);
        }

        return DB::transaction(function () use ($order, $data, $stockManager) {
            $order->update([
                'status' => 'cancelled',
                'cancel_reason' => $data['reason'] ?? '用户主动取消',
                'cancelled_at' => now(),
            ]);
            // 释放库存：DB + Redis 双写（DB 是真相源，Redis 是预扣视图）
            foreach ($order->items as $oi) {
                Sku::where('id', $oi->sku_id)->increment('stock', $oi->qty);
                $stockManager->release($oi->sku_id, $oi->qty);
                app(\App\Services\StockAlertService::class)->check($oi->sku_id);
            }
            return $this->ok(['order' => $this->orderDetail($order->fresh('items'))]);
        });
    }

    // POST /api/v1/orders/{id}/confirm-receipt · TRADE-006-04
    public function confirmReceipt(Request $request, int $id): JsonResponse
    {
        $order = Order::with('items')
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        if ($order->status !== 'shipped') {
            return $this->fail(1405, '只有已发货订单可确认收货', 422);
        }

        $order->update([
            'status' => 'completed',
            'received_at' => now(),
            'completed_at' => now(),
        ]);

        // 追加"已签收"物流节点
        app(\App\Services\LogisticsService::class)->appendDeliveredNode($order->fresh());

        return $this->ok(['order' => $this->orderDetail($order->fresh('items'))]);
    }

    private function generateOrderNo(): string
    {
        return now()->format('YmdHis').str_pad(random_int(0, 999), 3, '0', STR_PAD_LEFT);
    }

    private function orderListJson(Order $o): array
    {
        return [
            'id' => $o->id,
            'order_no' => $o->order_no,
            'status' => $o->status,
            'total_amount' => $o->total_amount,
            'item_count' => $o->items->sum('qty'),
            'thumbs' => $o->items->take(3)->map(fn ($i) => $i->product_image)->toArray(),
            'first_product_name' => $o->items->first()?->product_name,
            'created_at' => $o->created_at?->toIso8601String(),
        ];
    }

    private function orderDetail(Order $o): array
    {
        return [
            'id' => $o->id,
            'order_no' => $o->order_no,
            'status' => $o->status,
            'product_amount' => $o->product_amount,
            'shipping_fee' => $o->shipping_fee,
            'total_amount' => $o->total_amount,
            'paid_amount' => $o->paid_amount,
            'shipping_method' => $o->shipping_method,
            'shipping_address' => $o->shipping_address,
            'tracking_company' => $o->tracking_company,
            'tracking_no' => $o->tracking_no,
            'tracks' => app(\App\Services\LogisticsService::class)->getTracks($o)->map(fn ($t) => [
                'id' => $t->id,
                'node' => $t->node,
                'location' => $t->location,
                'description' => $t->description,
                'occurred_at' => $t->occurred_at?->toIso8601String(),
            ])->values(),
            'remark' => $o->remark,
            'cancel_reason' => $o->cancel_reason,
            'created_at' => $o->created_at?->toIso8601String(),
            'paid_at' => $o->paid_at?->toIso8601String(),
            'shipped_at' => $o->shipped_at?->toIso8601String(),
            'received_at' => $o->received_at?->toIso8601String(),
            'completed_at' => $o->completed_at?->toIso8601String(),
            'cancelled_at' => $o->cancelled_at?->toIso8601String(),
            'items' => $o->items->map(fn ($i) => [
                'id' => $i->id,
                'sku_id' => $i->sku_id,
                'product_name' => $i->product_name,
                'sku_code' => $i->sku_code,
                'product_image' => $i->product_image,
                'qty' => $i->qty,
                'unit_price' => $i->unit_price,
                'total_price' => $i->total_price,
            ]),
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
