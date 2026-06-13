<?php

namespace Tests\Feature;

use App\Contracts\StockManager;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sku;
use App\Services\Stock\InMemoryStockManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * iter-10 · StockManager 接口契约测试（针对测试用 InMemory 实现，行为与 Redis Lua 等价）。
 */
class StockManagerTest extends TestCase
{
    use RefreshDatabase;

    private StockManager $stock;

    protected function setUp(): void
    {
        parent::setUp();
        // 每个 test 重新绑一份干净的 InMemory（避免 singleton 跨 test 状态泄漏）
        $this->app->singleton(StockManager::class, fn () => new InMemoryStockManager());
        $this->stock = $this->app->make(StockManager::class);
    }

    public function test_reserve_decrements_in_cache(): void
    {
        $this->stock->sync(1, 10);
        $this->assertTrue($this->stock->tryReserve(1, 3));
        $this->assertSame(7, $this->stock->get(1));
    }

    public function test_reserve_fails_when_insufficient(): void
    {
        $this->stock->sync(1, 2);
        $this->assertFalse($this->stock->tryReserve(1, 5));
        $this->assertSame(2, $this->stock->get(1)); // 失败不扣
    }

    public function test_release_increments(): void
    {
        $this->stock->sync(1, 5);
        $this->stock->tryReserve(1, 4);
        $this->stock->release(1, 2);
        $this->assertSame(3, $this->stock->get(1));
    }

    public function test_reserve_zero_or_negative_returns_false(): void
    {
        $this->stock->sync(1, 10);
        $this->assertFalse($this->stock->tryReserve(1, 0));
        $this->assertFalse($this->stock->tryReserve(1, -1));
    }

    public function test_auto_warmup_from_db_when_key_missing(): void
    {
        $cat = Category::create(['name' => 'C', 'slug' => 'sm', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'WarmTest', 'model' => 'W', 'status' => 'active']);
        $sku = Sku::create(['product_id' => $p->id, 'sku_code' => 'W1', 'base_price' => 100, 'stock' => 42, 'status' => 'active']);

        // 缓存未初始化
        $this->assertNull($this->stock->get($sku->id));

        // 第一次 reserve 自动从 DB warmup（42）后扣 5 → 剩 37
        $this->assertTrue($this->stock->tryReserve($sku->id, 5));
        $this->assertSame(37, $this->stock->get($sku->id));
    }

    public function test_reserve_returns_false_when_sku_not_found(): void
    {
        $this->assertFalse($this->stock->tryReserve(999999, 1));
    }

    public function test_concurrent_reservations_prevent_oversell(): void
    {
        // 模拟"并发"：库存 10，连扣到 0，再扣失败
        $this->stock->sync(1, 10);
        $success = 0;
        for ($i = 0; $i < 12; $i++) {
            if ($this->stock->tryReserve(1, 1)) $success++;
        }
        $this->assertSame(10, $success);
        $this->assertSame(0, $this->stock->get(1));
    }
}
