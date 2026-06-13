<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sku;
use App\Models\StockAlert;
use App\Services\StockAlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * iter-11 · 库存预警 Service + Webhook 路径
 */
class StockAlertServiceTest extends TestCase
{
    use RefreshDatabase;

    private function makeSku(int $stock, int $threshold = 10): Sku
    {
        $cat = Category::create(['name' => 'C', 'slug' => 'sa', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'AlertTest', 'model' => 'AT', 'status' => 'active']);
        return Sku::create([
            'product_id' => $p->id, 'sku_code' => 'AT-1',
            'base_price' => 100, 'stock' => $stock,
            'stock_threshold' => $threshold, 'status' => 'active',
        ]);
    }

    public function test_triggers_alert_when_stock_at_or_below_threshold(): void
    {
        $sku = $this->makeSku(stock: 5, threshold: 10);
        $r = app(StockAlertService::class)->check($sku->id);

        $this->assertSame('triggered', $r);
        $this->assertDatabaseHas('stock_alerts', [
            'sku_id' => $sku->id, 'status' => 'open',
            'current_stock' => 5, 'threshold' => 10,
        ]);
    }

    public function test_does_not_double_trigger_when_open_alert_exists(): void
    {
        $sku = $this->makeSku(stock: 5, threshold: 10);
        app(StockAlertService::class)->check($sku->id);

        $sku->update(['stock' => 3]);
        $r2 = app(StockAlertService::class)->check($sku->id);

        $this->assertSame('noop', $r2);
        $this->assertSame(1, StockAlert::where('sku_id', $sku->id)->where('status', 'open')->count());
        $this->assertSame(3, (int) StockAlert::where('sku_id', $sku->id)->where('status', 'open')->first()->current_stock);
    }

    public function test_resolves_open_alert_when_stock_recovers(): void
    {
        $sku = $this->makeSku(stock: 5, threshold: 10);
        app(StockAlertService::class)->check($sku->id);

        $sku->update(['stock' => 50]);
        $r = app(StockAlertService::class)->check($sku->id);

        $this->assertSame('resolved', $r);
        $alert = StockAlert::where('sku_id', $sku->id)->latest()->first();
        $this->assertSame('resolved', $alert->status);
        $this->assertNotNull($alert->resolved_at);
    }

    public function test_no_action_when_stock_above_threshold_and_no_open(): void
    {
        $sku = $this->makeSku(stock: 100, threshold: 10);
        $r = app(StockAlertService::class)->check($sku->id);

        $this->assertSame('noop', $r);
        $this->assertSame(0, StockAlert::count());
    }

    public function test_webhook_mock_only_when_no_url_configured(): void
    {
        config()->set('services.webhook.stock_alert_url', null);
        putenv('STOCK_ALERT_WEBHOOK_URL');

        $sku = $this->makeSku(stock: 1, threshold: 10);
        app(StockAlertService::class)->check($sku->id);

        $alert = StockAlert::where('sku_id', $sku->id)->first();
        $this->assertSame('mock_only', $alert->webhook_status);
    }

    public function test_webhook_real_call_when_url_configured(): void
    {
        Http::fake(['https://example.test/hook' => Http::response(['ok' => true], 200)]);
        config()->set('services.webhook.stock_alert_url', 'https://example.test/hook');

        $sku = $this->makeSku(stock: 1, threshold: 10);
        app(StockAlertService::class)->check($sku->id);

        Http::assertSent(fn ($req) => $req->url() === 'https://example.test/hook'
            && $req['event'] === 'stock.low'
            && $req['payload']['sku_id'] === $sku->id);

        $alert = StockAlert::where('sku_id', $sku->id)->first();
        $this->assertSame('sent', $alert->webhook_status);
    }
}
