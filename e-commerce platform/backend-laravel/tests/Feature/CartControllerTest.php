<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sku;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CartControllerTest extends TestCase
{
    use RefreshDatabase;

    private function setupContext(): array
    {
        $user = User::create([
            'phone' => '13800138301', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $cat = Category::create(['name' => 'C', 'slug' => 'c', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create([
            'category_id' => $cat->id, 'name' => 'X', 'model' => 'X-1', 'status' => 'active',
        ]);
        $sku = Sku::create([
            'product_id' => $p->id, 'sku_code' => 'X-1',
            'base_price' => 100, 'stock' => 50, 'status' => 'active',
        ]);
        Sanctum::actingAs($user);
        return [$user, $p, $sku];
    }

    // TRADE-003-01 判定项 1：加购物车后 cart_items 新增
    public function test_add_creates_cart_item(): void
    {
        [$user, $p, $sku] = $this->setupContext();
        $r = $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 2]);
        $r->assertOk();
        $this->assertDatabaseHas('cart_items', ['sku_id' => $sku->id, 'qty' => 2, 'selected' => 1]);
        $this->assertEquals(2, $r->json('data.totals.selected_qty'));
    }

    // TRADE-003-01 判定项 4：超过库存阻断
    public function test_add_rejects_when_qty_exceeds_stock(): void
    {
        [, , $sku] = $this->setupContext();
        $r = $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 100]);
        $r->assertStatus(422);
        $r->assertJsonPath('code', 1302);
    }

    // TRADE-003-01 判定项 5：同 SKU 重复加入合并数量
    public function test_add_same_sku_increments_qty(): void
    {
        [, , $sku] = $this->setupContext();
        $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 2])->assertOk();
        $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 3])->assertOk();
        $this->assertDatabaseHas('cart_items', ['sku_id' => $sku->id, 'qty' => 5]);
    }

    // TRADE-003-02 判定项 2：修改数量
    public function test_update_qty(): void
    {
        [, , $sku] = $this->setupContext();
        $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 2])->assertOk();
        $itemId = \App\Models\CartItem::first()->id;

        $this->putJson("/api/v1/cart/items/{$itemId}", ['qty' => 8])->assertOk();
        $this->assertDatabaseHas('cart_items', ['id' => $itemId, 'qty' => 8]);
    }

    // TRADE-003-02 判定项 3：删除项
    public function test_remove_item(): void
    {
        [, , $sku] = $this->setupContext();
        $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 2]);
        $itemId = \App\Models\CartItem::first()->id;

        $this->deleteJson("/api/v1/cart/items/{$itemId}")->assertOk();
        $this->assertDatabaseMissing('cart_items', ['id' => $itemId]);
    }

    // TRADE-003-03 判定项 1：总价 = 选中商品总价 + 运费
    public function test_totals_include_shipping_fee(): void
    {
        [, , $sku] = $this->setupContext();
        $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 3]);
        $r = $this->getJson('/api/v1/cart');
        $r->assertOk();
        $this->assertEquals('300.00', $r->json('data.totals.product_amount'));
        $this->assertEquals('10.00', $r->json('data.totals.shipping_fee'));
        $this->assertEquals('310.00', $r->json('data.totals.total_amount'));
    }

    // TRADE-003-04 判定项 1：下架商品标 invalid
    public function test_invalid_when_product_inactive(): void
    {
        [, $p, $sku] = $this->setupContext();
        $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 2]);
        $p->update(['status' => 'inactive']);

        $r = $this->getJson('/api/v1/cart');
        $this->assertTrue($r->json('data.items.0.invalid'));
    }

    // 加购前先校验商品下架
    public function test_add_rejects_inactive_product(): void
    {
        [, $p, $sku] = $this->setupContext();
        $p->update(['status' => 'inactive']);
        $r = $this->postJson('/api/v1/cart/items', ['sku_id' => $sku->id, 'qty' => 1]);
        $r->assertStatus(422);
        $r->assertJsonPath('code', 1301);
    }
}
