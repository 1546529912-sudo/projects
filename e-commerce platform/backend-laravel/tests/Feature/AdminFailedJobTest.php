<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * iter-19 · 死信队列后台 CRUD
 */
class AdminFailedJobTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $u = User::create([
            'phone' => '13800110100', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        Sanctum::actingAs($u);
        return $u;
    }

    private function seedFailedJob(?string $uuid = null): string
    {
        $uuid = $uuid ?? \Illuminate\Support\Str::uuid()->toString();
        DB::table('failed_jobs')->insert([
            'uuid' => $uuid,
            'connection' => 'sync',
            'queue' => 'default',
            'payload' => json_encode([
                'displayName' => 'App\\Jobs\\DispatchWebhookJob',
                'attempts' => 3,
                'data' => ['commandName' => 'App\\Jobs\\DispatchWebhookJob'],
            ]),
            'exception' => "RuntimeException: Webhook failed after 3 tries\n   at /app/Jobs/DispatchWebhookJob.php:42",
            'failed_at' => now(),
        ]);
        return $uuid;
    }

    public function test_admin_lists_failed_jobs_with_decoded_metadata(): void
    {
        $this->admin();
        $uuid = $this->seedFailedJob();

        $r = $this->getJson('/api/v1/admin/failed-jobs');
        $r->assertOk();
        $this->assertSame(1, $r->json('data.total'));
        $first = $r->json('data.items.0');
        $this->assertSame($uuid, $first['uuid']);
        $this->assertSame('App\\Jobs\\DispatchWebhookJob', $first['job_class']);
        $this->assertSame(3, $first['attempts']);
        $this->assertStringContainsString('Webhook failed', $first['exception_excerpt']);
    }

    public function test_admin_delete_removes_single_failed_job(): void
    {
        $this->admin();
        $uuid = $this->seedFailedJob();

        $this->deleteJson("/api/v1/admin/failed-jobs/{$uuid}")->assertOk();
        $this->assertSame(0, DB::table('failed_jobs')->count());
    }

    public function test_admin_delete_404_when_not_found(): void
    {
        $this->admin();
        $this->deleteJson('/api/v1/admin/failed-jobs/non-existent-uuid')->assertStatus(404);
    }

    public function test_admin_clear_removes_all(): void
    {
        $this->admin();
        $this->seedFailedJob();
        $this->seedFailedJob();
        $this->assertSame(2, DB::table('failed_jobs')->count());

        $r = $this->postJson('/api/v1/admin/failed-jobs/clear');
        $r->assertOk();
        $this->assertSame(2, $r->json('data.cleared'));
        $this->assertSame(0, DB::table('failed_jobs')->count());
    }

    public function test_admin_stats_returns_count_and_window(): void
    {
        $this->admin();
        $this->seedFailedJob();

        $r = $this->getJson('/api/v1/admin/failed-jobs/stats');
        $r->assertOk();
        $this->assertSame(1, $r->json('data.count'));
        $this->assertNotNull($r->json('data.latest_at'));
    }

    public function test_admin_retry_removes_from_failed_table(): void
    {
        $this->admin();
        $uuid = $this->seedFailedJob();

        $r = $this->postJson("/api/v1/admin/failed-jobs/{$uuid}/retry");
        $r->assertOk();
        $this->assertSame($uuid, $r->json('data.retried'));
        // queue:retry 把 failed 行删除并重新 push 到 jobs；这里只断言不在 failed_jobs
        $this->assertSame(0, DB::table('failed_jobs')->where('uuid', $uuid)->count());
    }

    public function test_admin_retry_404_when_not_found(): void
    {
        $this->admin();
        $this->postJson('/api/v1/admin/failed-jobs/non-existent/retry')->assertStatus(404);
    }

    public function test_index_returns_pagination_meta(): void
    {
        $this->admin();
        for ($i = 0; $i < 25; $i++) $this->seedFailedJob();

        $r = $this->getJson('/api/v1/admin/failed-jobs?per_page=10&page=2');
        $r->assertOk();
        $this->assertSame(25, $r->json('data.total'));
        $this->assertSame(2, $r->json('data.page'));
        $this->assertSame(10, $r->json('data.per_page'));
        $this->assertSame(3, $r->json('data.last_page'));
        $this->assertCount(10, $r->json('data.items'));
    }

    public function test_index_keyword_filters_by_payload_or_exception(): void
    {
        $this->admin();
        // 一条命中 payload
        DB::table('failed_jobs')->insert([
            'uuid' => 'uuid-payload-hit',
            'connection' => 'sync', 'queue' => 'default',
            'payload' => json_encode(['displayName' => 'App\\Jobs\\StockSyncJob']),
            'exception' => 'normal error',
            'failed_at' => now(),
        ]);
        // 一条命中 exception
        DB::table('failed_jobs')->insert([
            'uuid' => 'uuid-exception-hit',
            'connection' => 'sync', 'queue' => 'default',
            'payload' => json_encode(['displayName' => 'OtherJob']),
            'exception' => 'TimeoutException: PaymentApi 超时',
            'failed_at' => now(),
        ]);
        // 一条无关
        $this->seedFailedJob();

        $r = $this->getJson('/api/v1/admin/failed-jobs?keyword=StockSync');
        $r->assertOk();
        $this->assertSame(1, $r->json('data.total'));
        $this->assertSame('uuid-payload-hit', $r->json('data.items.0.uuid'));

        $r2 = $this->getJson('/api/v1/admin/failed-jobs?keyword=TimeoutException');
        $r2->assertOk();
        $this->assertSame(1, $r2->json('data.total'));
        $this->assertSame('uuid-exception-hit', $r2->json('data.items.0.uuid'));
    }

    public function test_index_keyword_filters_by_queue_name(): void
    {
        $this->admin();
        DB::table('failed_jobs')->insert([
            'uuid' => 'q-special',
            'connection' => 'sync', 'queue' => 'special-queue',
            'payload' => json_encode(['displayName' => 'X']),
            'exception' => 'e',
            'failed_at' => now(),
        ]);
        $this->seedFailedJob();

        $r = $this->getJson('/api/v1/admin/failed-jobs?keyword=special-queue');
        $r->assertOk();
        $this->assertSame(1, $r->json('data.total'));
    }

    public function test_per_page_capped_at_200(): void
    {
        $this->admin();
        for ($i = 0; $i < 5; $i++) $this->seedFailedJob();

        $r = $this->getJson('/api/v1/admin/failed-jobs?per_page=10000');
        $r->assertOk();
        $this->assertSame(200, $r->json('data.per_page'));
    }

    public function test_non_admin_blocked_from_all_endpoints(): void
    {
        $u = User::create([
            'phone' => '13800110101', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        Sanctum::actingAs($u);
        $this->getJson('/api/v1/admin/failed-jobs')->assertStatus(403);
        $this->getJson('/api/v1/admin/failed-jobs/stats')->assertStatus(403);
        $this->postJson('/api/v1/admin/failed-jobs/clear')->assertStatus(403);
    }
}
