<?php

namespace Tests\Feature;

use App\Jobs\DispatchWebhookJob;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sku;
use App\Models\StockAlert;
use App\Services\StockAlertService;
use App\Services\WebhookDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * iter-17 · DispatchWebhookJob 队列化 + 重试
 */
class WebhookJobTest extends TestCase
{
    use RefreshDatabase;

    private function makeSku(int $stock = 5, int $threshold = 10): Sku
    {
        $cat = Category::create(['name' => 'C', 'slug' => 'wj', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'WJ', 'model' => 'WJ', 'status' => 'active']);
        return Sku::create([
            'product_id' => $p->id, 'sku_code' => 'WJ-1',
            'base_price' => 100, 'stock' => $stock,
            'stock_threshold' => $threshold, 'status' => 'active',
        ]);
    }

    private function makeAlert(int $skuId): StockAlert
    {
        return StockAlert::create([
            'sku_id' => $skuId, 'current_stock' => 5, 'threshold' => 10,
            'status' => 'open', 'webhook_status' => 'pending',
            'triggered_at' => now(),
        ]);
    }

    public function test_trigger_dispatches_webhook_job(): void
    {
        Bus::fake();
        $sku = $this->makeSku(stock: 5, threshold: 10);

        app(StockAlertService::class)->check($sku->id);

        Bus::assertDispatched(DispatchWebhookJob::class, function (DispatchWebhookJob $job) use ($sku) {
            return $job->event === 'stock.low'
                && $job->payload['sku_id'] === $sku->id
                && $job->alertId !== null;
        });
    }

    public function test_job_handles_success_marks_sent(): void
    {
        config()->set('services.webhook.stock_alert_url', 'https://example.test/hook');
        Http::fake(['https://example.test/hook' => Http::response(['ok' => true], 200)]);

        $sku = $this->makeSku();
        $alert = $this->makeAlert($sku->id);

        $job = new DispatchWebhookJob('stock.low', ['sku_id' => $sku->id], $alert->id);
        $job->handle(app(WebhookDispatcher::class));

        $alert->refresh();
        $this->assertSame('sent', $alert->webhook_status);
        // attempts() 在脱离 queue 调用时返 1
        $this->assertSame(1, (int) $alert->webhook_attempts);
    }

    public function test_job_throws_on_failure_to_let_queue_retry(): void
    {
        config()->set('services.webhook.stock_alert_url', 'https://example.test/hook');
        Http::fake(['https://example.test/hook' => Http::response('boom', 500)]);

        $sku = $this->makeSku();
        $alert = $this->makeAlert($sku->id);

        $job = new DispatchWebhookJob('stock.low', ['sku_id' => $sku->id], $alert->id);

        $this->expectException(\RuntimeException::class);
        $job->handle(app(WebhookDispatcher::class));
    }

    public function test_failed_handler_marks_alert_failed_with_attempts_eq_tries(): void
    {
        $sku = $this->makeSku();
        $alert = $this->makeAlert($sku->id);

        $job = new DispatchWebhookJob('stock.low', ['sku_id' => $sku->id], $alert->id);
        $job->failed(new \RuntimeException('all retries exhausted'));

        $alert->refresh();
        $this->assertSame('failed', $alert->webhook_status);
        $this->assertSame(3, (int) $alert->webhook_attempts);
        $this->assertStringContainsString('all retries exhausted', $alert->webhook_response);
    }

    public function test_mock_only_when_no_url_marks_immediately(): void
    {
        config()->set('services.webhook.stock_alert_url', null);
        putenv('STOCK_ALERT_WEBHOOK_URL');

        $sku = $this->makeSku();
        $alert = $this->makeAlert($sku->id);

        $job = new DispatchWebhookJob('stock.low', ['sku_id' => $sku->id], $alert->id);
        $job->handle(app(WebhookDispatcher::class));

        $alert->refresh();
        $this->assertSame('mock_only', $alert->webhook_status);
    }

    public function test_job_has_correct_retry_config(): void
    {
        $job = new DispatchWebhookJob('stock.low', []);
        $this->assertSame(3, $job->tries);
        $this->assertSame([10, 30, 60], $job->backoff);
    }
}
