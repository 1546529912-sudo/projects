<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sku;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderControllerTest extends TestCase
{
    use RefreshDatabase;

    private function setupOrderContext(int $stock = 100, int $qty = 2): array
    {
        $user = User::create([
            'phone' => '13800138401', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $cat = Category::create(['name' => 'C', 'slug' => 'oc', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'Order Test', 'model' => 'O-1', 'status' => 'active']);
        $sku = Sku::create(['product_id' => $p->id, 'sku_code' => 'O-1', 'base_price' => 500, 'stock' => $stock, 'status' => 'active']);

        $address = Address::create([
            'user_id' => $user->id,
            'receiver_name' => '张三', 'receiver_phone' => '13800138401',
            'province' => '北京', 'city' => '北京', 'district' => '海淀',
            'detail' => '中关村大街 1 号', 'is_default' => 1,
        ]);

        $cart = Cart::create(['user_id' => $user->id, 'active_role' => 'individual']);
        CartItem::create(['cart_id' => $cart->id, 'sku_id' => $sku->id, 'qty' => $qty, 'selected' => 1, 'snapshot_price' => 500]);

        Sanctum::actingAs($user);
        return compact('user', 'address', 'sku', 'cart');
    }

    // TRADE-004-03 判定项 1：提交订单后 orders + order_items + 扣库存
    public function test_create_order_persists_items_and_decrements_stock(): void
    {
        $ctx = $this->setupOrderContext(stock: 100, qty: 2);

        $r = $this->postJson('/api/v1/orders', ['address_id' => $ctx['address']->id]);
        $r->assertOk();
        $r->assertJsonPath('data.order.status', 'pending_payment');

        $this->assertDatabaseHas('orders', ['user_id' => $ctx['user']->id, 'status' => 'pending_payment']);
        $this->assertDatabaseHas('order_items', ['sku_id' => $ctx['sku']->id, 'qty' => 2]);
        $this->assertEquals(98, $ctx['sku']->fresh()->stock);

        // 购物车清空
        $this->assertEquals(0, CartItem::where('cart_id', $ctx['cart']->id)->count());
    }

    // TRADE-004-03 判定项 3：库存不足阻断
    public function test_create_order_rejects_when_stock_insufficient(): void
    {
        $ctx = $this->setupOrderContext(stock: 1, qty: 5);
        $r = $this->postJson('/api/v1/orders', ['address_id' => $ctx['address']->id]);
        $r->assertStatus(422);
        $r->assertJsonPath('code', 1403);
    }

    // 没勾选则阻断
    public function test_create_order_rejects_when_no_selected(): void
    {
        $ctx = $this->setupOrderContext();
        CartItem::where('cart_id', $ctx['cart']->id)->update(['selected' => 0]);

        $r = $this->postJson('/api/v1/orders', ['address_id' => $ctx['address']->id]);
        $r->assertStatus(422);
        $r->assertJsonPath('code', 1401);
    }

    // 订单详情含地址快照（即使原地址修改）
    public function test_order_snapshots_address(): void
    {
        $ctx = $this->setupOrderContext();
        $this->postJson('/api/v1/orders', ['address_id' => $ctx['address']->id])->assertOk();

        $ctx['address']->update(['detail' => '改后地址']);

        $orderId = \App\Models\Order::first()->id;
        $r = $this->getJson("/api/v1/orders/{$orderId}");
        $this->assertEquals('中关村大街 1 号', $r->json('data.order.shipping_address.detail'));
    }

    // TRADE-006-05 判定项 1：pending_payment 用户可直接取消，库存回归
    public function test_cancel_pending_payment_restores_stock(): void
    {
        $ctx = $this->setupOrderContext(stock: 100, qty: 2);
        $this->postJson('/api/v1/orders', ['address_id' => $ctx['address']->id])->assertOk();

        $orderId = \App\Models\Order::first()->id;
        $this->postJson("/api/v1/orders/{$orderId}/cancel", ['reason' => '不想要了'])->assertOk();

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => 'cancelled']);
        $this->assertEquals(100, $ctx['sku']->fresh()->stock);
    }

    // 用户只能取消 pending_payment 状态
    public function test_cancel_rejected_for_non_pending(): void
    {
        $ctx = $this->setupOrderContext();
        $this->postJson('/api/v1/orders', ['address_id' => $ctx['address']->id])->assertOk();
        $order = \App\Models\Order::first();
        $order->update(['status' => 'shipped']);

        $r = $this->postJson("/api/v1/orders/{$order->id}/cancel");
        $r->assertStatus(422);
        $r->assertJsonPath('code', 1404);
    }

    // 订单列表按状态筛选
    public function test_list_filters_by_status(): void
    {
        $ctx = $this->setupOrderContext();
        $this->postJson('/api/v1/orders', ['address_id' => $ctx['address']->id])->assertOk();

        $r = $this->getJson('/api/v1/orders?status=pending_payment');
        $r->assertOk();
        $this->assertCount(1, $r->json('data.items'));

        $r2 = $this->getJson('/api/v1/orders?status=completed');
        $this->assertCount(0, $r2->json('data.items'));
    }

    // TRADE-006-04: 已发货可确认收货 → completed
    public function test_confirm_receipt_completes_order(): void
    {
        $ctx = $this->setupOrderContext();
        $this->postJson('/api/v1/orders', ['address_id' => $ctx['address']->id])->assertOk();
        $order = \App\Models\Order::first();
        $order->update(['status' => 'shipped', 'shipped_at' => now()]);

        $r = $this->postJson("/api/v1/orders/{$order->id}/confirm-receipt");
        $r->assertOk();
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'completed']);
        $this->assertNotNull($order->fresh()->received_at);
        $this->assertNotNull($order->fresh()->completed_at);
    }

    // 非 shipped 状态不可确认收货
    public function test_confirm_receipt_rejected_when_not_shipped(): void
    {
        $ctx = $this->setupOrderContext();
        $this->postJson('/api/v1/orders', ['address_id' => $ctx['address']->id])->assertOk();
        $orderId = \App\Models\Order::first()->id;

        $this->postJson("/api/v1/orders/{$orderId}/confirm-receipt")
            ->assertStatus(422)
            ->assertJsonPath('code', 1405);
    }
}
