<?php

namespace Tests\Feature;

use App\Jobs\DispatchWebhookJob;
use App\Models\User;
use App\Services\WebhookDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * iter-24 · 新设备登录 → auth.new_device Webhook
 *
 * 复用 iter-17 DispatchWebhookJob 队列 + iter-23 deviceLabel(UA+IP)
 */
class NewDeviceWebhookTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $phone = '13800120000', string $password = 'pass12345'): User
    {
        return User::create([
            'phone' => $phone, 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
            'password' => bcrypt($password),
        ]);
    }

    public function test_first_login_from_a_device_dispatches_webhook(): void
    {
        Bus::fake();
        $user = $this->makeUser();

        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (Macintosh) Chrome/119'])
            ->postJson('/api/v1/auth/login', ['phone' => $user->phone, 'password' => 'pass12345'])
            ->assertOk();

        Bus::assertDispatched(DispatchWebhookJob::class, function (DispatchWebhookJob $job) use ($user) {
            return $job->event === 'auth.new_device'
                && $job->payload['user_id'] === $user->id
                && str_contains($job->payload['device_label'], 'Chrome')
                && str_contains($job->payload['device_label'], 'macOS');
        });
    }

    public function test_second_login_from_same_device_does_not_dispatch(): void
    {
        $user = $this->makeUser();

        // 先登一次产生 token
        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (Macintosh) Chrome/119'])
            ->postJson('/api/v1/auth/login', ['phone' => $user->phone, 'password' => 'pass12345'])
            ->assertOk();

        // 第二次 fake，应该不再 dispatch
        Bus::fake();
        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (Macintosh) Chrome/119'])
            ->postJson('/api/v1/auth/login', ['phone' => $user->phone, 'password' => 'pass12345'])
            ->assertOk();
        Bus::assertNotDispatched(DispatchWebhookJob::class);
    }

    public function test_login_from_different_ua_dispatches_again(): void
    {
        $user = $this->makeUser();
        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (Macintosh) Chrome/119'])
            ->postJson('/api/v1/auth/login', ['phone' => $user->phone, 'password' => 'pass12345'])
            ->assertOk();

        Bus::fake();
        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (Windows NT) Firefox/118'])
            ->postJson('/api/v1/auth/login', ['phone' => $user->phone, 'password' => 'pass12345'])
            ->assertOk();

        Bus::assertDispatched(DispatchWebhookJob::class, function (DispatchWebhookJob $job) {
            return str_contains($job->payload['device_label'], 'Firefox')
                && str_contains($job->payload['device_label'], 'Windows');
        });
    }

    public function test_register_dispatches_new_device_webhook(): void
    {
        Bus::fake();
        // 走 register 路径要先发短信验证码；用 Redis facade mock
        \Illuminate\Support\Facades\Redis::shouldReceive('get')
            ->with('sms:code:13800120999')->andReturn('123456');

        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (iPhone) Safari/605'])
            ->postJson('/api/v1/auth/register', [
                'phone' => '13800120999',
                'code' => '123456',
                'password' => 'pass12345',
            ])
            ->assertOk();

        Bus::assertDispatched(DispatchWebhookJob::class, function (DispatchWebhookJob $job) {
            return $job->event === 'auth.new_device'
                && str_contains($job->payload['device_label'], 'Safari');
        });
    }

    public function test_webhook_dispatcher_routes_url_by_event_prefix(): void
    {
        config()->set('services.webhook.auth_new_device_url', 'https://hooks.example.test/auth');
        config()->set('services.webhook.stock_alert_url', 'https://hooks.example.test/stock');
        Http::fake([
            'hooks.example.test/auth' => Http::response(['ok' => true], 200),
            'hooks.example.test/stock' => Http::response(['ok' => true], 200),
        ]);

        $disp = app(WebhookDispatcher::class);
        $authResult = $disp->dispatch('auth.new_device', ['x' => 1]);
        $stockResult = $disp->dispatch('stock.low', ['y' => 2]);

        $this->assertSame('sent', $authResult['status']);
        $this->assertSame('sent', $stockResult['status']);
        Http::assertSent(fn ($req) => $req->url() === 'https://hooks.example.test/auth' && $req['event'] === 'auth.new_device');
        Http::assertSent(fn ($req) => $req->url() === 'https://hooks.example.test/stock' && $req['event'] === 'stock.low');
    }

    public function test_unknown_event_prefix_returns_mock_only(): void
    {
        $disp = app(WebhookDispatcher::class);
        $r = $disp->dispatch('unknown.event', []);
        $this->assertSame('mock_only', $r['status']);
    }
}
