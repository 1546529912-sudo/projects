<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sku;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderAdminTest extends TestCase
{
    use RefreshDatabase;

    private function setupShippableOrder(): array
    {
        $admin = User::create(['phone' => '13800138998', 'role' => 'admin', 'active_role' => 'individual', 'status' => 'active']);
        $user = User::create(['phone' => '13800138801', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        $cat = Category::create(['name' => 'A', 'slug' => 'aa', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'A', 'model' => 'A-1', 'status' => 'active']);
        $sku = Sku::create(['product_id' => $p->id, 'sku_code' => 'A-1', 'base_price' => 100, 'stock' => 50, 'status' => 'active']);

        $order = Order::create([
            'order_no' => 'TST'.uniqid(),
            'user_id' => $user->id, 'active_role' => 'individual',
            'product_amount' => 100, 'shipping_fee' => 10, 'total_amount' => 110,
            'status' => 'pending_shipment',
            'shipping_address' => ['receiver_name' => 'X', 'receiver_phone' => '1', 'province' => 'P', 'city' => 'C', 'district' => 'D', 'detail' => 'd'],
        ]);
        OrderItem::create(['order_id' => $order->id, 'sku_id' => $sku->id, 'product_name' => 'A',
            'sku_code' => 'A-1', 'qty' => 1, 'unit_price' => 100, 'total_price' => 100]);

        Sanctum::actingAs($admin);
        return compact('admin', 'user', 'order');
    }

    // TRADE-008-02: 后台发货
    public function test_admin_ship_sets_tracking_and_status(): void
    {
        $ctx = $this->setupShippableOrder();
        $r = $this->postJson("/api/v1/admin/orders/{$ctx['order']->id}/ship", [
            'tracking_company' => '顺丰',
            'tracking_no' => 'SF1234567890',
        ]);
        $r->assertOk();
        $this->assertDatabaseHas('orders', [
            'id' => $ctx['order']->id, 'status' => 'shipped',
            'tracking_company' => '顺丰', 'tracking_no' => 'SF1234567890',
        ]);
    }

    // 已发货订单不可再次发货
    public function test_admin_ship_rejects_non_pending_shipment(): void
    {
        $ctx = $this->setupShippableOrder();
        $ctx['order']->update(['status' => 'shipped']);
        $r = $this->postJson("/api/v1/admin/orders/{$ctx['order']->id}/ship", [
            'tracking_company' => 'X', 'tracking_no' => '1',
        ]);
        $r->assertStatus(422);
    }

    // TRADE-008-04: 凭证审核通过 → pending_shipment
    public function test_admin_approve_voucher_advances_order(): void
    {
        $ctx = $this->setupShippableOrder();
        $ctx['order']->update(['status' => 'pending_review']);
        $payment = Payment::create([
            'order_id' => $ctx['order']->id,
            'payment_no' => 'BT'.uniqid(),
            'method' => 'bank_transfer',
            'amount' => 110,
            'status' => 'pending',
            'voucher_url' => 'http://x/v.jpg',
        ]);

        $this->postJson("/api/v1/admin/payments/{$payment->id}/review", ['action' => 'approve'])->assertOk();
        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'success']);
        $this->assertDatabaseHas('orders', ['id' => $ctx['order']->id, 'status' => 'pending_shipment']);
    }

    // 凭证驳回 → 订单回到 pending_payment + 必须填原因
    public function test_admin_reject_voucher_returns_order_to_pending_payment(): void
    {
        $ctx = $this->setupShippableOrder();
        $ctx['order']->update(['status' => 'pending_review']);
        $payment = Payment::create([
            'order_id' => $ctx['order']->id, 'payment_no' => 'BT'.uniqid(),
            'method' => 'bank_transfer', 'amount' => 110, 'status' => 'pending',
            'voucher_url' => 'http://x/v.jpg',
        ]);

        // 不填原因 → 422
        $this->postJson("/api/v1/admin/payments/{$payment->id}/review", ['action' => 'reject'])->assertStatus(422);

        // 填了 → ok
        $this->postJson("/api/v1/admin/payments/{$payment->id}/review", [
            'action' => 'reject', 'reject_reason' => '金额不符',
        ])->assertOk();
        $this->assertDatabaseHas('orders', ['id' => $ctx['order']->id, 'status' => 'pending_payment']);
    }
}
