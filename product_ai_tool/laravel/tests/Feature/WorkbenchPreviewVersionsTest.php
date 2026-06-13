<?php

namespace Tests\Feature;

use App\Models\Demo;
use App\Models\DemoVersion;
use App\Services\DemoGenerationService;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkbenchPreviewVersionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
        config(['services.deepseek.key' => null]);
    }

    public function test_workbench_store_creates_demo_with_initial_version_without_api_key(): void
    {
        $this->post(route('workbench.demos.store'), [
            'title' => '我的 Demo',
            'prompt' => '做一个按钮',
        ])->assertRedirect(route('workbench.index', ['demo' => 1]));

        $this->assertDatabaseCount('demos', 1);
        $this->assertDatabaseCount('demo_versions', 1);
        $demo = Demo::first();
        $this->assertNotNull($demo->current_version_id);
        $this->assertStringContainsString('<!DOCTYPE html>', $demo->currentVersion->html_code);
    }

    public function test_preview_returns_current_version_html(): void
    {
        $demo = Demo::create([
            'title' => 't',
            'prompt' => 'p',
            'model' => 'deepseek-v4-flash',
        ]);
        $v = DemoVersion::create([
            'demo_id' => $demo->id,
            'version_no' => 1,
            'html_code' => '<!DOCTYPE html><html><head><title>x</title></head><body>hi</body></html>',
            'model' => 'deepseek-v4-flash',
            'source_type' => 'initial_generate',
            'prompt' => 'p',
        ]);
        $demo->update(['current_version_id' => $v->id]);

        $this->get(route('demos.preview', $demo))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=UTF-8')
            ->assertSee('hi', false);
    }

    public function test_versions_index_lists_rows_and_current_pointer(): void
    {
        $demo = Demo::create([
            'title' => 't',
            'prompt' => 'p',
            'model' => 'deepseek-v4-flash',
        ]);
        $v1 = DemoVersion::create([
            'demo_id' => $demo->id,
            'version_no' => 1,
            'html_code' => '<html><body>1</body></html>',
            'model' => 'deepseek-v4-flash',
            'source_type' => 'initial_generate',
            'prompt' => 'p',
        ]);
        $v2 = DemoVersion::create([
            'demo_id' => $demo->id,
            'version_no' => 2,
            'html_code' => '<html><body>2</body></html>',
            'model' => 'deepseek-v4-flash',
            'source_type' => 'annotation_revision',
            'prompt' => 'x',
        ]);
        $demo->update(['current_version_id' => $v2->id]);

        $this->getJson('/api/demos/'.$demo->id.'/versions')
            ->assertOk()
            ->assertJsonPath('current_version_id', $v2->id)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.version_no', 1)
            ->assertJsonPath('data.1.version_no', 2)
            ->assertJsonPath('data.1.source_type', 'annotation_revision');
    }

    public function test_generation_service_sets_current_version_in_transaction(): void
    {
        $svc = app(DemoGenerationService::class);
        $demo = $svc->createInitialDemo('t', 'prompt body');

        $this->assertSame(1, $demo->versions()->count());
        $this->assertEquals($demo->current_version_id, $demo->currentVersion->id);
    }
}
