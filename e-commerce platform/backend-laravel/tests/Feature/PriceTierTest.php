<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\PriceTier;
use App\Models\Product;
use App\Models\Sku;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PriceTierTest extends TestCase
{
    use RefreshDatabase;

    private function makeSkuWithTiers(array $tiers): Sku
    {
        $cat = Category::create(['name' => 'C', 'slug' => 'tc', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'Tier P', 'model' => 'T-1', 'status' => 'active']);
        $sku = Sku::create(['product_id' => $p->id, 'sku_code' => 'T-1', 'base_price' => 100, 'stock' => 5000, 'status' => 'active']);

        foreach ($tiers as $i => [$min, $max, $price]) {
            PriceTier::create(['sku_id' => $sku->id, 'min_qty' => $min, 'max_qty' => $max, 'unit_price' => $price, 'sort_order' => $i]);
        }
        return $sku;
    }

    // Sku::resolvePrice 区间命中
    public function test_resolve_price_hits_correct_tier(): void
    {
        $sku = $this->makeSkuWithTiers([
            [1, 99, 100],
            [100, 499, 90],
            [500, null, 80],
        ]);

        $this->assertEquals('100.00', $sku->resolvePrice(1));
        $this->assertEquals('100.00', $sku->resolvePrice(99));
        $this->assertEquals('90.00', $sku->resolvePrice(100));
        $this->assertEquals('90.00', $sku->resolvePrice(499));
        $this->assertEquals('80.00', $sku->resolvePrice(500));
        $this->assertEquals('80.00', $sku->resolvePrice(10000));
    }

    // 无阶梯价 → 返回 base_price
    public function test_resolve_price_falls_back_to_base_price(): void
    {
        $sku = $this->makeSkuWithTiers([]);
        $this->assertEquals('100.00', $sku->resolvePrice(1));
        $this->assertEquals('100.00', $sku->resolvePrice(99999));
    }

    // ProductController.show 返多 SKU + price_tiers
    public function test_product_show_returns_skus_with_tiers(): void
    {
        $sku = $this->makeSkuWithTiers([
            [1, 99, 100],
            [100, null, 80],
        ]);
        // 加规格
        \App\Models\SkuSpec::create(['sku_id' => $sku->id, 'spec_key' => 'thickness', 'spec_value' => '3', 'spec_unit' => 'mm']);

        $r = $this->getJson('/api/v1/products/'.$sku->product_id);
        $r->assertOk();
        $r->assertJsonCount(1, 'data.skus');
        $r->assertJsonPath('data.skus.0.price_tiers.0.unit_price', '100.00');
        $r->assertJsonPath('data.skus.0.price_tiers.1.unit_price', '80.00');
        $r->assertJsonPath('data.skus.0.specs.0.key', 'thickness');
        $r->assertJsonPath('data.price_range.min', '80.00');
        $r->assertJsonPath('data.price_range.max', '100.00');
    }

    // 加购物车按阶梯价存 snapshot_price
    public function test_cart_add_uses_tier_price_for_snapshot(): void
    {
        $sku = $this->makeSkuWithTiers([
            [1, 99, 100],
            [100, null, 80],
        ]);
        $u = User::create(['phone' => '13800139001', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        Sanctum::actingAs($u);

        $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 150])->assertOk();
        $item = CartItem::first();
        $this->assertEquals('80.00', $item->snapshot_price);
    }

    // 修改数量跨档时 snapshot_price 同步刷新
    public function test_cart_update_qty_refreshes_snapshot_price(): void
    {
        $sku = $this->makeSkuWithTiers([
            [1, 99, 100],
            [100, null, 80],
        ]);
        $u = User::create(['phone' => '13800139002', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        Sanctum::actingAs($u);

        $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 50])->assertOk();
        $item = CartItem::first();
        $this->assertEquals('100.00', $item->snapshot_price);

        $this->putJson("/api/v1/cart/items/{$item->id}", ['qty' => 200])->assertOk();
        $this->assertEquals('80.00', $item->fresh()->snapshot_price);
    }

    // 下单时订单项用阶梯价
    public function test_order_items_use_tier_price(): void
    {
        $sku = $this->makeSkuWithTiers([
            [1, 99, 100],
            [100, null, 80],
        ]);
        $u = User::create(['phone' => '13800139003', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        Sanctum::actingAs($u);

        $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 120])->assertOk();

        $addr = Address::create([
            'user_id' => $u->id, 'receiver_name' => 'X', 'receiver_phone' => '13800139003',
            'province' => 'P', 'city' => 'C', 'district' => 'D', 'detail' => 'd', 'is_default' => 1,
        ]);
        $r = $this->postJson('/api/v1/orders', ['address_id' => $addr->id]);
        $r->assertOk();

        $order = \App\Models\Order::first();
        $item = \App\Models\OrderItem::first();
        $this->assertEquals('80.00', $item->unit_price);
        $this->assertEquals('9600.00', $item->total_price);     // 80 × 120
        $this->assertEquals('9610.00', $order->total_amount);   // + 10 运费
    }
}
