<?php

namespace Tests\Feature;

use App\Models\Demo;
use App\Models\DemoVersion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkbenchLastDemoSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_bare_workbench_redirects_when_session_has_last_demo(): void
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

        $this->withSession(['last_workbench_demo_id' => $demo->id])
            ->get('/workbench')
            ->assertRedirect(route('workbench.index', ['demo' => $demo->id]));
    }

    public function test_workbench_with_demo_query_sets_session(): void
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

        $this->get(route('workbench.index', ['demo' => $demo->id]))
            ->assertOk()
            ->assertSessionHas('last_workbench_demo_id', $demo->id);
    }
}
