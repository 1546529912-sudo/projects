<?php

namespace Tests\Feature;

use App\Contracts\StockManager;
use App\Models\Address;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Sku;
use App\Models\User;
use App\Services\Stock\InMemoryStockManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * iter-10 · 验证 Redis 预扣层（InMemory 实现）与 DB 真相源的双写一致性。
 */
class OrderStockRedisTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->singleton(StockManager::class, fn () => new InMemoryStockManager());
    }

    private function ctx(int $stock = 100, int $qty = 2): array
    {
        $user = User::create([
            'phone' => '13800139999', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $cat = Category::create(['name' => 'C', 'slug' => 'sr', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'RedisStockTest', 'model' => 'R', 'status' => 'active']);
        $sku = Sku::create(['product_id' => $p->id, 'sku_code' => 'R1', 'base_price' => 500, 'stock' => $stock, 'status' => 'active']);
        $address = Address::create([
            'user_id' => $user->id,
            'receiver_name' => '张三', 'receiver_phone' => '13800139999',
            'province' => '北京', 'city' => '北京', 'district' => '海淀',
            'detail' => '中关村大街 1 号', 'is_default' => 1,
        ]);
        $cart = Cart::create(['user_id' => $user->id, 'active_role' => 'individual']);
        CartItem::create(['cart_id' => $cart->id, 'sku_id' => $sku->id, 'qty' => $qty, 'selected' => 1, 'snapshot_price' => 500]);

        Sanctum::actingAs($user);
        return compact('user', 'address', 'sku', 'cart');
    }

    public function test_create_order_reserves_redis_stock(): void
    {
        $c = $this->ctx(stock: 100, qty: 3);
        $this->postJson('/api/v1/orders', ['address_id' => $c['address']->id])->assertOk();

        $stock = $this->app->make(StockManager::class);
        // DB: 100 → 97（OrderController.store 仍 decrement）；Redis: warmup 100 后扣 3 → 97
        $this->assertSame(97, $stock->get($c['sku']->id));
        $this->assertSame(97, (int) $c['sku']->fresh()->stock);
    }

    public function test_cancel_releases_redis_stock(): void
    {
        $c = $this->ctx(stock: 100, qty: 3);
        $this->postJson('/api/v1/orders', ['address_id' => $c['address']->id])->assertOk();
        $orderId = Order::first()->id;

        $this->postJson("/api/v1/orders/{$orderId}/cancel")->assertOk();

        $stock = $this->app->make(StockManager::class);
        $this->assertSame(100, $stock->get($c['sku']->id));
        $this->assertSame(100, (int) $c['sku']->fresh()->stock);
    }

    public function test_redis_blocks_oversell_even_when_db_appears_sufficient(): void
    {
        $c = $this->ctx(stock: 100, qty: 5);

        // 人为把 Redis 缓存压到 2，模拟"其他已扣预扣单未结算"
        $stock = $this->app->make(StockManager::class);
        $stock->sync($c['sku']->id, 2);

        $r = $this->postJson('/api/v1/orders', ['address_id' => $c['address']->id]);
        $r->assertStatus(422);
        $r->assertJsonPath('code', 1403);

        // Redis 没被错扣 / DB 未动
        $this->assertSame(2, $stock->get($c['sku']->id));
        $this->assertSame(100, (int) $c['sku']->fresh()->stock);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_stale_cancel_releases_redis(): void
    {
        $c = $this->ctx(stock: 100, qty: 2);
        $this->postJson('/api/v1/orders', ['address_id' => $c['address']->id])->assertOk();
        $order = Order::first();

        // 把 created_at 推回到 45 分钟前；created_at 不在 fillable，所以走 DB facade
        \DB::table('orders')->where('id', $order->id)
            ->update(['created_at' => now()->subMinutes(45)]);

        $this->artisan('orders:cancel-stale', ['--minutes' => 30])->assertSuccessful();

        $stock = $this->app->make(StockManager::class);
        $this->assertSame(100, $stock->get($c['sku']->id));
        $this->assertSame(100, (int) $c['sku']->fresh()->stock);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'cancelled']);
    }

    public function test_warmup_command_syncs_all_skus_to_cache(): void
    {
        $cat = Category::create(['name' => 'C', 'slug' => 'wu', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'WarmupTest', 'model' => 'WU', 'status' => 'active']);
        $skuA = Sku::create(['product_id' => $p->id, 'sku_code' => 'WU-1', 'base_price' => 100, 'stock' => 20, 'status' => 'active']);
        $skuB = Sku::create(['product_id' => $p->id, 'sku_code' => 'WU-2', 'base_price' => 100, 'stock' => 50, 'status' => 'active']);

        $stock = $this->app->make(StockManager::class);
        $this->assertNull($stock->get($skuA->id));
        $this->assertNull($stock->get($skuB->id));

        $this->artisan('sku:warmup-redis')->assertSuccessful();

        $this->assertSame(20, $stock->get($skuA->id));
        $this->assertSame(50, $stock->get($skuB->id));
    }
}
