<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Sku;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * 购物车 Controller · TRADE-003
 *
 * - GET /api/v1/cart         读取
 * - POST /api/v1/cart/items  加入
 * - PUT /api/v1/cart/items/{id}  改数量/勾选
 * - DELETE /api/v1/cart/items/{id}  删除
 * - POST /api/v1/cart/items/select-all
 * - DELETE /api/v1/cart/items/invalid  清空失效
 */
class CartController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cart = $this->ensureCart($request);
        $items = $this->loadItems($cart);
        return $this->ok($this->cartView($items));
    }

    public function addItem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sku_id' => 'required|integer|exists:skus,id',
            'qty' => 'required|integer|min:1|max:9999',
        ]);

        $sku = Sku::with('product')->findOrFail($data['sku_id']);
        if ($sku->status !== 'active' || ! $sku->product || $sku->product->status !== 'active') {
            return $this->fail(1301, '商品已下架', 422);
        }
        if ($sku->stock < $data['qty']) {
            return $this->fail(1302, '库存不足，当前可购买 '.$sku->stock.' 件', 422);
        }

        return DB::transaction(function () use ($request, $data, $sku) {
            $cart = $this->ensureCart($request);
            $existing = CartItem::where('cart_id', $cart->id)
                ->where('sku_id', $sku->id)
                ->first();

            if ($existing) {
                $newQty = $existing->qty + $data['qty'];
                if ($newQty > $sku->stock) {
                    return $this->fail(1302, '库存不足，购物车已有 '.$existing->qty.' 件，库存 '.$sku->stock, 422);
                }
                $existing->update([
                    'qty' => $newQty,
                    'snapshot_price' => $sku->resolvePrice($newQty),
                ]);
            } else {
                CartItem::create([
                    'cart_id' => $cart->id,
                    'sku_id' => $sku->id,
                    'qty' => $data['qty'],
                    'selected' => true,
                    'snapshot_price' => $sku->resolvePrice((int) $data['qty']),
                ]);
            }

            return $this->ok($this->cartView($this->loadItems($cart->fresh())));
        });
    }

    public function updateItem(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'qty' => 'sometimes|integer|min:1|max:9999',
            'selected' => 'sometimes|boolean',
        ]);

        $cart = $this->ensureCart($request);
        $item = CartItem::where('cart_id', $cart->id)->findOrFail($id);

        if (isset($data['qty'])) {
            $sku = Sku::find($item->sku_id);
            if (! $sku || $data['qty'] > $sku->stock) {
                return $this->fail(1302, '库存不足', 422);
            }
            $item->qty = $data['qty'];
            $item->snapshot_price = $sku->resolvePrice((int) $data['qty']);
        }
        if (isset($data['selected'])) {
            $item->selected = $data['selected'];
        }
        $item->save();

        return $this->ok($this->cartView($this->loadItems($cart)));
    }

    public function removeItem(Request $request, int $id): JsonResponse
    {
        $cart = $this->ensureCart($request);
        CartItem::where('cart_id', $cart->id)->where('id', $id)->delete();
        return $this->ok($this->cartView($this->loadItems($cart)));
    }

    public function selectAll(Request $request): JsonResponse
    {
        $data = $request->validate(['selected' => 'required|boolean']);
        $cart = $this->ensureCart($request);

        CartItem::where('cart_id', $cart->id)->update(['selected' => $data['selected']]);
        return $this->ok($this->cartView($this->loadItems($cart)));
    }

    public function clearInvalid(Request $request): JsonResponse
    {
        $cart = $this->ensureCart($request);
        $items = $this->loadItems($cart);
        $invalidIds = $items->filter(fn ($it) => $it['invalid'])
            ->pluck('id')
            ->toArray();
        if (! empty($invalidIds)) {
            CartItem::whereIn('id', $invalidIds)->delete();
        }
        return $this->ok($this->cartView($this->loadItems($cart)));
    }

    private function ensureCart(Request $request): Cart
    {
        $user = $request->user();
        return Cart::firstOrCreate(
            ['user_id' => $user->id, 'active_role' => $user->active_role ?? 'individual'],
        );
    }

    private function loadItems(Cart $cart)
    {
        return CartItem::with(['sku.product'])
            ->where('cart_id', $cart->id)
            ->latest()
            ->get()
            ->map(function ($item) {
                $sku = $item->sku;
                $product = $sku?->product;
                $invalid = ! $sku || $sku->status !== 'active'
                    || ! $product || $product->status !== 'active';
                $insufficient = $sku && $sku->stock < $item->qty;

                // 用 snapshot_price（阶梯价快照）展示；回退 sku.base_price
                $unitPrice = $item->snapshot_price !== null ? (float) $item->snapshot_price : (float) ($sku?->base_price ?? 0);
                return [
                    'id' => $item->id,
                    'sku_id' => $item->sku_id,
                    'sku_code' => $sku?->sku_code,
                    'product_id' => $product?->id,
                    'product_name' => $product?->name,
                    'product_model' => $product?->model,
                    'main_image_url' => $product?->main_image_url,
                    'unit_price' => number_format($unitPrice, 2, '.', ''),
                    'qty' => $item->qty,
                    'selected' => (bool) $item->selected,
                    'stock' => $sku?->stock,
                    'invalid' => $invalid,
                    'insufficient' => $insufficient,
                    'subtotal' => number_format($unitPrice * $item->qty, 2, '.', ''),
                ];
            });
    }

    private function cartView($items): array
    {
        $valid = $items->filter(fn ($i) => ! $i['invalid']);
        $selected = $valid->filter(fn ($i) => $i['selected'] && ! $i['insufficient']);

        $productAmount = $selected->sum(fn ($i) => (float) $i['unit_price'] * $i['qty']);
        $shippingFee = $selected->count() > 0 ? 10.00 : 0.00; // 简化：固定运费
        $total = $productAmount + $shippingFee;

        return [
            'items' => $items->values(),
            'totals' => [
                'item_count' => $valid->count(),
                'selected_count' => $selected->count(),
                'selected_qty' => $selected->sum('qty'),
                'product_amount' => number_format($productAmount, 2, '.', ''),
                'shipping_fee' => number_format($shippingFee, 2, '.', ''),
                'total_amount' => number_format($total, 2, '.', ''),
            ],
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
