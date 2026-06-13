<?php

namespace Tests\Feature;

use App\Models\Annotation;
use App\Models\Demo;
use App\Models\DemoVersion;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RevisionVersionRegenerateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ValidateCsrfToken::class);
        config(['services.deepseek.key' => 'sk-test-key']);
        config(['services.deepseek.base' => 'https://api.deepseek.com/v1']);
    }

    private function seedDemoTwoVersions(): Demo
    {
        $demo = Demo::create([
            'title' => 't',
            'prompt' => 'p',
            'model' => 'deepseek-v4-flash',
        ]);
        $v1 = DemoVersion::create([
            'demo_id' => $demo->id,
            'version_no' => 1,
            'html_code' => '<!DOCTYPE html><html><body>v1</body></html>',
            'model' => 'deepseek-v4-flash',
            'source_type' => 'initial_generate',
            'prompt' => 'p',
        ]);
        $v2 = DemoVersion::create([
            'demo_id' => $demo->id,
            'version_no' => 2,
            'html_code' => '<!DOCTYPE html><html><body>v2</body></html>',
            'model' => 'deepseek-v4-flash',
            'source_type' => 'annotation_revision',
            'prompt' => 'x',
        ]);
        $demo->update(['current_version_id' => $v2->id]);

        return $demo->fresh();
    }

    public function test_annotation_revise_creates_version_and_completes_annotation(): void
    {
        Http::fake([
            '*' => Http::response([
                'choices' => [
                    ['message' => [
                        'content' => '<!DOCTYPE html><html><body>revised</body></html>',
                    ]],
                ],
            ], 200),
        ]);

        $demo = Demo::create([
            'title' => 't',
            'prompt' => 'p',
            'model' => 'deepseek-v4-flash',
        ]);
        $v1 = DemoVersion::create([
            'demo_id' => $demo->id,
            'version_no' => 1,
            'html_code' => '<!DOCTYPE html><html><body>orig</body></html>',
            'model' => 'deepseek-v4-flash',
            'source_type' => 'initial_generate',
            'prompt' => 'p',
        ]);
        $demo->update(['current_version_id' => $v1->id]);

        $ann = Annotation::create([
            'demo_id' => $demo->id,
            'demo_version_id' => $v1->id,
            'page_key' => 'home',
            'x_percent' => 10,
            'y_percent' => 20,
            'title' => 'fix',
            'description' => 'make btn bigger',
            'type' => '修改建议',
            'status' => '未处理',
        ]);

        $this->postJson('/api/annotations/'.$ann->id.'/revise', [
            'user_instruction' => 'emphasize CTA',
        ])->assertOk()
            ->assertJsonPath('ok', true);

        $demo->refresh();
        $this->assertEquals(2, $demo->versions()->count());
        $this->assertStringContainsString('revised', $demo->currentVersion->html_code);
        $this->assertSame('已完成', $ann->fresh()->status);
    }

    public function test_restore_version_switches_current(): void
    {
        $demo = $this->seedDemoTwoVersions();
        $v1 = $demo->versions()->where('version_no', 1)->first();

        $this->postJson('/api/demos/'.$demo->id.'/versions/'.$v1->id.'/restore', [])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertEquals($v1->id, $demo->fresh()->current_version_id);
    }

    public function test_regenerate_requires_confirm_when_annotations_exist(): void
    {
        $demo = Demo::create([
            'title' => 't',
            'prompt' => 'old',
            'model' => 'deepseek-v4-flash',
        ]);
        $v = DemoVersion::create([
            'demo_id' => $demo->id,
            'version_no' => 1,
            'html_code' => '<html><body>a</body></html>',
            'model' => 'deepseek-v4-flash',
            'source_type' => 'initial_generate',
            'prompt' => 'old',
        ]);
        $demo->update(['current_version_id' => $v->id]);

        Annotation::create([
            'demo_id' => $demo->id,
            'demo_version_id' => $v->id,
            'page_key' => 'home',
            'x_percent' => 1,
            'y_percent' => 2,
            'title' => 'x',
            'type' => '说明',
            'status' => '未处理',
        ]);

        $this->post(route('workbench.demos.regenerate', $demo), [
            'prompt' => 'new prompt only',
        ])->assertSessionHasErrors('confirm_regenerate');
    }

    public function test_regenerate_with_confirm_adds_version(): void
    {
        Http::fake([
            '*' => Http::response([
                'choices' => [
                    ['message' => [
                        'content' => '<!DOCTYPE html><html><body>regen</body></html>',
                    ]],
                ],
            ], 200),
        ]);

        $demo = Demo::create([
            'title' => 't',
            'prompt' => 'old',
            'model' => 'deepseek-v4-flash',
        ]);
        $v = DemoVersion::create([
            'demo_id' => $demo->id,
            'version_no' => 1,
            'html_code' => '<html><body>a</body></html>',
            'model' => 'deepseek-v4-flash',
            'source_type' => 'initial_generate',
            'prompt' => 'old',
        ]);
        $demo->update(['current_version_id' => $v->id]);

        Annotation::create([
            'demo_id' => $demo->id,
            'demo_version_id' => $v->id,
            'page_key' => 'home',
            'x_percent' => 1,
            'y_percent' => 2,
            'title' => 'x',
            'type' => '说明',
            'status' => '未处理',
        ]);

        $this->post(route('workbench.demos.regenerate', $demo), [
            'prompt' => 'new full regen',
            'confirm_regenerate' => '1',
        ])->assertRedirect(route('workbench.index', ['demo' => $demo->id]));

        $this->assertEquals(2, $demo->fresh()->versions()->count());
        $this->assertSame('regenerate', $demo->fresh()->currentVersion->source_type);
    }
}
