<?php

namespace Tests\Feature;

use App\Models\Annotation;
use App\Models\Demo;
use App\Models\DemoVersion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnnotationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
    }

    private function seedDemoWithVersion(): Demo
    {
        $demo = Demo::create([
            'title' => 't',
            'prompt' => 'p',
            'model' => 'deepseek-v4-flash',
        ]);
        $v = DemoVersion::create([
            'demo_id' => $demo->id,
            'version_no' => 1,
            'html_code' => '<html><body>x</body></html>',
            'model' => 'deepseek-v4-flash',
            'source_type' => 'initial_generate',
            'prompt' => 'p',
        ]);
        $demo->update(['current_version_id' => $v->id]);

        return $demo->fresh();
    }

    public function test_store_and_list_annotations(): void
    {
        $demo = $this->seedDemoWithVersion();

        $response = $this->postJson('/api/demos/'.$demo->id.'/annotations', [
            'page_key' => 'home',
            'x_percent' => 10.5,
            'y_percent' => 20,
            'title' => '测试',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.demo_version_id', $demo->current_version_id);

        $this->assertDatabaseCount('annotations', 1);

        $list = $this->getJson('/api/demos/'.$demo->id.'/annotations?all=1');
        $list->assertOk();
        $list->assertJsonPath('data.0.page_key', 'home');
    }

    public function test_patch_and_delete_annotation(): void
    {
        $demo = $this->seedDemoWithVersion();
        $ann = Annotation::create([
            'demo_id' => $demo->id,
            'demo_version_id' => $demo->current_version_id,
            'page_key' => 'home',
            'x_percent' => 1,
            'y_percent' => 2,
            'title' => 'a',
            'type' => '说明',
            'status' => '未处理',
        ]);

        $this->patchJson('/api/annotations/'.$ann->id, [
            'title' => 'b',
            'status' => '已完成',
        ])->assertOk()->assertJsonPath('data.title', 'b');

        $this->deleteJson('/api/annotations/'.$ann->id)->assertOk();
        $this->assertDatabaseCount('annotations', 0);
    }

    public function test_index_filters_by_page_key_and_status(): void
    {
        $demo = $this->seedDemoWithVersion();

        Annotation::create([
            'demo_id' => $demo->id,
            'demo_version_id' => $demo->current_version_id,
            'page_key' => 'home',
            'x_percent' => 1,
            'y_percent' => 2,
            'title' => 'a',
            'type' => '说明',
            'status' => '未处理',
        ]);
        Annotation::create([
            'demo_id' => $demo->id,
            'demo_version_id' => $demo->current_version_id,
            'page_key' => 'settings',
            'x_percent' => 3,
            'y_percent' => 4,
            'title' => 'b',
            'type' => '说明',
            'status' => '已完成',
        ]);

        $home = $this->getJson('/api/demos/'.$demo->id.'/annotations?page_key=home');
        $home->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'a');

        $done = $this->getJson('/api/demos/'.$demo->id.'/annotations?all=1&status=已完成');
        $done->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.page_key', 'settings');
    }
}
