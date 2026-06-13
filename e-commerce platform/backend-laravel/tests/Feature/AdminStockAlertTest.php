<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sku;
use App\Models\StockAlert;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * iter-11 · 后台库存预警 API + 下单触发链路集成
 */
class AdminStockAlertTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $u = User::create([
            'phone' => '13800000001', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        Sanctum::actingAs($u);
        return $u;
    }

    private function makeSku(int $stock = 100, int $threshold = 10): Sku
    {
        $cat = Category::create(['name' => 'C', 'slug' => 'sap', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'AdminAlert', 'model' => 'AA', 'status' => 'active']);
        return Sku::create([
            'product_id' => $p->id, 'sku_code' => 'AA-1',
            'base_price' => 100, 'stock' => $stock,
            'stock_threshold' => $threshold, 'status' => 'active',
        ]);
    }

    public function test_admin_list_returns_open_alerts_with_count(): void
    {
        $this->admin();
        $sku = $this->makeSku(stock: 1, threshold: 10);
        StockAlert::create([
            'sku_id' => $sku->id, 'current_stock' => 1, 'threshold' => 10,
            'status' => 'open', 'webhook_status' => 'mock_only',
            'triggered_at' => now(),
        ]);

        $r = $this->getJson('/api/v1/admin/stock-alerts');
        $r->assertOk();
        $r->assertJsonPath('data.open_count', 1);
        $this->assertCount(1, $r->json('data.items'));
        $this->assertSame('AA-1', $r->json('data.items.0.sku_code'));
    }

    public function test_admin_resolve_marks_alert_resolved(): void
    {
        $this->admin();
        $sku = $this->makeSku(stock: 1, threshold: 10);
        $alert = StockAlert::create([
            'sku_id' => $sku->id, 'current_stock' => 1, 'threshold' => 10,
            'status' => 'open', 'webhook_status' => 'mock_only',
            'triggered_at' => now(),
        ]);

        $r = $this->postJson("/api/v1/admin/stock-alerts/{$alert->id}/resolve");
        $r->assertOk();
        $this->assertSame('resolved', $alert->fresh()->status);
        $this->assertNotNull($alert->fresh()->resolved_at);
    }

    public function test_filter_by_status_resolved(): void
    {
        $this->admin();
        $sku = $this->makeSku();
        StockAlert::create([
            'sku_id' => $sku->id, 'current_stock' => 1, 'threshold' => 10,
            'status' => 'resolved', 'webhook_status' => 'sent',
            'triggered_at' => now()->subHour(), 'resolved_at' => now(),
        ]);

        $r = $this->getJson('/api/v1/admin/stock-alerts?status=resolved');
        $r->assertOk();
        $this->assertCount(1, $r->json('data.items'));
        $this->assertSame('resolved', $r->json('data.items.0.status'));
    }

    public function test_order_creation_triggers_alert_when_decrement_crosses_threshold(): void
    {
        // 创建 buyer + sku 库存 12 阈值 10
        $buyer = User::create([
            'phone' => '13800139000', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $sku = $this->makeSku(stock: 12, threshold: 10);
        $address = Address::create([
            'user_id' => $buyer->id,
            'receiver_name' => 'A', 'receiver_phone' => '13800139000',
            'province' => 'x', 'city' => 'y', 'district' => 'z',
            'detail' => 'd', 'is_default' => 1,
        ]);
        $cart = Cart::create(['user_id' => $buyer->id, 'active_role' => 'individual']);
        CartItem::create(['cart_id' => $cart->id, 'sku_id' => $sku->id, 'qty' => 5, 'selected' => 1, 'snapshot_price' => 100]);

        Sanctum::actingAs($buyer);
        $this->postJson('/api/v1/orders', ['address_id' => $address->id])->assertOk();

        // 12 - 5 = 7 ≤ 10 → 触发
        $this->assertDatabaseHas('stock_alerts', [
            'sku_id' => $sku->id, 'status' => 'open', 'current_stock' => 7,
        ]);
    }

    public function test_cancel_restores_stock_and_resolves_alert(): void
    {
        $buyer = User::create([
            'phone' => '13800139001', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $sku = $this->makeSku(stock: 12, threshold: 10);
        $address = Address::create([
            'user_id' => $buyer->id,
            'receiver_name' => 'A', 'receiver_phone' => '13800139001',
            'province' => 'x', 'city' => 'y', 'district' => 'z',
            'detail' => 'd', 'is_default' => 1,
        ]);
        $cart = Cart::create(['user_id' => $buyer->id, 'active_role' => 'individual']);
        CartItem::create(['cart_id' => $cart->id, 'sku_id' => $sku->id, 'qty' => 5, 'selected' => 1, 'snapshot_price' => 100]);

        Sanctum::actingAs($buyer);
        $this->postJson('/api/v1/orders', ['address_id' => $address->id])->assertOk();
        $orderId = \App\Models\Order::first()->id;

        // 触发后 cancel → 库存回到 12 > 阈值 10 → resolved
        $this->postJson("/api/v1/orders/{$orderId}/cancel")->assertOk();

        $this->assertDatabaseHas('stock_alerts', [
            'sku_id' => $sku->id, 'status' => 'resolved',
        ]);
        $this->assertSame(0, StockAlert::where('sku_id', $sku->id)->where('status', 'open')->count());
    }
}
