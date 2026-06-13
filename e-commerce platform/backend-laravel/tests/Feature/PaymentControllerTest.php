<?php

namespace Tests\Feature;

use App\Models\Address;
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

class PaymentControllerTest extends TestCase
{
    use RefreshDatabase;

    private function setupPendingOrder(): array
    {
        $user = User::create(['phone' => '13800138701', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        $cat = Category::create(['name' => 'X', 'slug' => 'px', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'Pay X', 'model' => 'PAY-1', 'status' => 'active']);
        $sku = Sku::create(['product_id' => $p->id, 'sku_code' => 'PAY-1', 'base_price' => 1000, 'stock' => 50, 'status' => 'active']);

        $order = Order::create([
            'order_no' => 'TEST'.uniqid(),
            'user_id' => $user->id, 'active_role' => 'individual',
            'product_amount' => 2000, 'shipping_fee' => 10, 'total_amount' => 2010,
            'status' => 'pending_payment',
            'shipping_address' => ['receiver_name' => 'X', 'receiver_phone' => '1', 'province' => 'P', 'city' => 'C', 'district' => 'D', 'detail' => 'd'],
        ]);
        OrderItem::create(['order_id' => $order->id, 'sku_id' => $sku->id, 'product_name' => 'Pay X',
            'sku_code' => 'PAY-1', 'qty' => 2, 'unit_price' => 1000, 'total_price' => 2000]);

        Sanctum::actingAs($user);
        return compact('user', 'order', 'sku');
    }

    // TRADE-005-01 判定项 1: 发起在线支付返 mock_endpoint
    public function test_initiate_online_payment_returns_mock_endpoint(): void
    {
        $ctx = $this->setupPendingOrder();
        $r = $this->postJson('/api/v1/payments', ['order_id' => $ctx['order']->id, 'method' => 'wechat']);
        $r->assertOk();
        $this->assertNotEmpty($r->json('data.mock_endpoint'));
        $this->assertNotEmpty($r->json('data.qr_code_text'));
    }

    // TRADE-005-01 判定项 4: mock 支付成功后订单转 pending_shipment
    public function test_mock_success_moves_order_to_pending_shipment(): void
    {
        $ctx = $this->setupPendingOrder();
        $initRes = $this->postJson('/api/v1/payments', ['order_id' => $ctx['order']->id, 'method' => 'wechat']);
        $paymentId = $initRes->json('data.payment.id');

        $this->postJson("/api/v1/payments/{$paymentId}/mock-success")->assertOk();

        $this->assertDatabaseHas('orders', ['id' => $ctx['order']->id, 'status' => 'pending_shipment']);
        $this->assertDatabaseHas('payments', ['id' => $paymentId, 'status' => 'success']);
        $this->assertNotNull($ctx['order']->fresh()->paid_at);
    }

    // TRADE-005-01 判定项 6: 同一订单不可重复 mock success（第二次幂等）
    public function test_mock_success_is_idempotent(): void
    {
        $ctx = $this->setupPendingOrder();
        $initRes = $this->postJson('/api/v1/payments', ['order_id' => $ctx['order']->id, 'method' => 'wechat']);
        $paymentId = $initRes->json('data.payment.id');

        $this->postJson("/api/v1/payments/{$paymentId}/mock-success")->assertOk();
        $this->postJson("/api/v1/payments/{$paymentId}/mock-success")->assertOk();
        $this->assertEquals(1, Payment::where('id', $paymentId)->where('status', 'success')->count());
    }

    // TRADE-005-02 判定项 1: 对公转账返银行账户信息
    public function test_initiate_bank_transfer_returns_bank_account(): void
    {
        $ctx = $this->setupPendingOrder();
        $r = $this->postJson('/api/v1/payments', ['order_id' => $ctx['order']->id, 'method' => 'bank_transfer']);
        $r->assertOk();
        $this->assertNotEmpty($r->json('data.bank_account.account_no'));
    }

    // TRADE-005-02 判定项 2: 上传凭证后订单转 pending_review
    public function test_upload_voucher_moves_order_to_pending_review(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');
        $ctx = $this->setupPendingOrder();
        $initRes = $this->postJson('/api/v1/payments', ['order_id' => $ctx['order']->id, 'method' => 'bank_transfer']);
        $paymentId = $initRes->json('data.payment.id');

        $this->postJson("/api/v1/payments/{$paymentId}/voucher", [
            'file' => \Illuminate\Http\UploadedFile::fake()->image('voucher.jpg'),
        ])->assertOk();

        $this->assertDatabaseHas('orders', ['id' => $ctx['order']->id, 'status' => 'pending_review']);
        $this->assertNotEmpty(Payment::find($paymentId)->voucher_url);
    }

    // 已发货订单不可再发起支付
    public function test_cannot_initiate_for_non_pending_order(): void
    {
        $ctx = $this->setupPendingOrder();
        $ctx['order']->update(['status' => 'shipped']);

        $r = $this->postJson('/api/v1/payments', ['order_id' => $ctx['order']->id, 'method' => 'wechat']);
        $r->assertStatus(404);
    }
}
