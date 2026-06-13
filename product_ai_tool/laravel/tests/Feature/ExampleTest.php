<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_redirects_to_workbench(): void
    {
        $response = $this->get('/');

        $response->assertRedirect('/workbench');
    }

    public function test_the_workbench_loads(): void
    {
        $response = $this->get('/workbench');

        $response->assertOk();
        $response->assertSee('AI Demo 工作台', false);
    }
}
