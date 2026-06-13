<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Category;
use App\Models\LogisticsTrack;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Sku;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LogisticsAndStaleOrderTest extends TestCase
{
    use RefreshDatabase;

    private function buildOrder(string $status = 'pending_shipment', int $stock = 100, int $qty = 2): array
    {
        $user = User::create(['phone' => '13800139001', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        $cat = Category::create(['name' => 'L', 'slug' => 'lg', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'L', 'model' => 'L-1', 'status' => 'active']);
        $sku = Sku::create(['product_id' => $p->id, 'sku_code' => 'L-1', 'base_price' => 100, 'stock' => $stock, 'status' => 'active']);

        $order = Order::create([
            'order_no' => 'L'.uniqid(),
            'user_id' => $user->id, 'active_role' => 'individual',
            'product_amount' => 100 * $qty, 'shipping_fee' => 10, 'total_amount' => 100 * $qty + 10,
            'status' => $status,
            'shipping_address' => ['receiver_name' => 'A', 'receiver_phone' => '13800139001',
                'province' => '广东省', 'city' => '深圳市', 'district' => '南山区', 'detail' => '科技园'],
        ]);
        OrderItem::create(['order_id' => $order->id, 'sku_id' => $sku->id, 'product_name' => 'L',
            'sku_code' => 'L-1', 'qty' => $qty, 'unit_price' => 100, 'total_price' => 100 * $qty]);

        return compact('user', 'sku', 'order');
    }

    // 发货生成 3 条物流轨迹（揽件/转运/派送）
    public function test_ship_generates_logistics_tracks(): void
    {
        $admin = User::create(['phone' => '13800139999', 'role' => 'admin', 'active_role' => 'individual', 'status' => 'active']);
        $ctx = $this->buildOrder();
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/orders/{$ctx['order']->id}/ship", [
            'tracking_company' => '顺丰', 'tracking_no' => 'SF1234567890',
        ])->assertOk();

        $tracks = LogisticsTrack::where('order_id', $ctx['order']->id)->get();
        $this->assertCount(3, $tracks);
        $this->assertEqualsCanonicalizing(['accepted', 'transit', 'dispatching'], $tracks->pluck('node')->toArray());
    }

    // 确认收货时追加 delivered 节点
    public function test_confirm_receipt_appends_delivered_track(): void
    {
        $ctx = $this->buildOrder('shipped');
        $ctx['order']->update(['shipped_at' => now()]);
        Sanctum::actingAs($ctx['user']);

        $this->postJson("/api/v1/orders/{$ctx['order']->id}/confirm-receipt")->assertOk();

        $this->assertTrue(LogisticsTrack::where('order_id', $ctx['order']->id)->where('node', 'delivered')->exists());
    }

    // 订单详情包含 tracks 字段
    public function test_order_detail_includes_tracks(): void
    {
        $ctx = $this->buildOrder('shipped');
        $ctx['order']->update(['shipped_at' => now(), 'tracking_company' => '顺丰', 'tracking_no' => 'SF111']);
        app(\App\Services\LogisticsService::class)->generateMockTracks($ctx['order']->fresh(), '顺丰', 'SF111');
        Sanctum::actingAs($ctx['user']);

        $r = $this->getJson("/api/v1/orders/{$ctx['order']->id}");
        $r->assertOk();
        $nodes = collect($r->json('data.order.tracks'))->pluck('node')->toArray();
        $this->assertContains('accepted', $nodes);
        $this->assertContains('transit', $nodes);
        $this->assertContains('dispatching', $nodes);
        // 接口按时间倒序，最新（dispatching）在前
        $this->assertEquals('dispatching', $nodes[0]);
    }

    // 超时未支付订单被 artisan 命令取消，库存恢复
    public function test_cancel_stale_orders_command_cancels_old_pending(): void
    {
        $ctx = $this->buildOrder('pending_payment', stock: 100, qty: 2);
        // 把 created_at 改到 45 分钟前
        // created_at 不在 fillable，用 DB::table 强制改
        \DB::table('orders')->where('id', $ctx['order']->id)->update(['created_at' => now()->subMinutes(45)]);

        $this->artisan('orders:cancel-stale', ['--minutes' => 30])->assertSuccessful();

        $this->assertDatabaseHas('orders', ['id' => $ctx['order']->id, 'status' => 'cancelled']);
        $this->assertStringContainsString('系统自动取消', $ctx['order']->fresh()->cancel_reason);
        // 库存恢复
        $this->assertEquals(102, $ctx['sku']->fresh()->stock);
    }

    // 未到阈值的不取消
    public function test_cancel_stale_command_skips_recent_orders(): void
    {
        $ctx = $this->buildOrder('pending_payment', stock: 100, qty: 2);
        $ctx['order']->update(['created_at' => now()->subMinutes(10)]);

        $this->artisan('orders:cancel-stale', ['--minutes' => 30])->assertSuccessful();

        $this->assertDatabaseHas('orders', ['id' => $ctx['order']->id, 'status' => 'pending_payment']);
        $this->assertEquals(100, $ctx['sku']->fresh()->stock);
    }
}
