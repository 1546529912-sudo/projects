<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sku;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductPublicTest extends TestCase
{
    use RefreshDatabase;

    private function seedSampleProducts(): void
    {
        $cat = Category::create(['name' => '碳板', 'slug' => 'cp', 'sort_order' => 0, 'status' => 'active']);
        $cat2 = Category::create(['name' => '玻纤', 'slug' => 'gf', 'sort_order' => 1, 'status' => 'active']);

        $p1 = Product::create([
            'category_id' => $cat->id, 'name' => 'T700 板',
            'model' => 'CF-T700-3', 'keywords' => 'T700,碳板',
            'main_image_url' => 'http://x/1.jpg', 'status' => 'active',
        ]);
        Sku::create(['product_id' => $p1->id, 'sku_code' => 'CF-T700-3', 'base_price' => 1280, 'stock' => 100]);

        $p2 = Product::create([
            'category_id' => $cat2->id, 'name' => 'E 玻璃布',
            'model' => 'GF-200', 'status' => 'active',
        ]);
        Sku::create(['product_id' => $p2->id, 'sku_code' => 'GF-200', 'base_price' => 32, 'stock' => 5000]);
    }

    // TRADE-002-01 判定项 3：推荐商品 4 张卡片
    public function test_recommended_returns_active_products(): void
    {
        $this->seedSampleProducts();
        $response = $this->getJson('/api/v1/products/recommended');
        $response->assertOk();
        $this->assertCount(2, $response->json('data.items'));
    }

    // TRADE-002-03 判定项 1：关键词匹配 name/model/keywords
    public function test_search_by_keyword_matches_name(): void
    {
        $this->seedSampleProducts();
        $r = $this->getJson('/api/v1/products?keyword=T700');
        $r->assertOk();
        $this->assertCount(1, $r->json('data.items'));
        $this->assertEquals('CF-T700-3', $r->json('data.items.0.model'));
    }

    // TRADE-002-03 判定项 4：搜索无结果返回空
    public function test_search_no_match_returns_empty(): void
    {
        $this->seedSampleProducts();
        $r = $this->getJson('/api/v1/products?keyword=NOTHING');
        $r->assertOk();
        $this->assertCount(0, $r->json('data.items'));
        $this->assertEquals(0, $r->json('data.total'));
    }

    // TRADE-002-02 判定项 3：按 category_id 筛选
    public function test_filter_by_category(): void
    {
        $this->seedSampleProducts();
        $cat = Category::where('slug', 'gf')->first();
        $r = $this->getJson('/api/v1/products?category_id='.$cat->id);
        $r->assertOk();
        $this->assertCount(1, $r->json('data.items'));
        $this->assertEquals('GF-200', $r->json('data.items.0.model'));
    }

    // TRADE-002-05 判定项 1+3：详情页含 skus[]/price/stock/category（iter-7 多 SKU 后路径变化）
    public function test_detail_returns_full_product(): void
    {
        $this->seedSampleProducts();
        $product = Product::where('model', 'CF-T700-3')->first();
        $r = $this->getJson('/api/v1/products/'.$product->id);
        $r->assertOk();
        $r->assertJsonPath('data.model', 'CF-T700-3');
        $r->assertJsonPath('data.skus.0.base_price', '1280.00');
        $r->assertJsonPath('data.skus.0.stock', 100);
        $r->assertJsonPath('data.category.slug', 'cp');
    }

    // TRADE-002-05 判定项 6：缺货商品 stock_status=out_of_stock
    public function test_detail_marks_out_of_stock_when_stock_zero(): void
    {
        $this->seedSampleProducts();
        $product = Product::where('model', 'CF-T700-3')->first();
        $product->defaultSku->update(['stock' => 0]);
        $r = $this->getJson('/api/v1/products/'.$product->id);
        $r->assertJsonPath('data.skus.0.stock_status', 'out_of_stock');
    }

    // TRADE-002-04 判定项 4：下架商品不在公开列表
    public function test_inactive_products_excluded_from_public_list(): void
    {
        $this->seedSampleProducts();
        Product::where('model', 'CF-T700-3')->update(['status' => 'inactive']);
        $r = $this->getJson('/api/v1/products');
        $models = array_column($r->json('data.items'), 'model');
        $this->assertNotContains('CF-T700-3', $models);
    }

    // 详情页累加 view_count
    public function test_detail_increments_view_count(): void
    {
        $this->seedSampleProducts();
        $product = Product::where('model', 'CF-T700-3')->first();
        $before = $product->view_count;
        $this->getJson('/api/v1/products/'.$product->id);
        $this->assertEquals($before + 1, $product->fresh()->view_count);
    }
}
