<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_health_check_returns_200(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'code',
                'message',
                'data' => [
                    'status',
                    'timestamp',
                    'version',
                ],
            ])
            ->assertJson([
                'code' => 0,
                'message' => 'ok',
            ]);
    }

    public function test_health_check_includes_database_status(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['database'],
            ]);
    }

    public function test_health_check_data_status_is_healthy(): void
    {
        $response = $this->getJson('/api/health');
        $data = $response->json('data');

        $this->assertContains($data['status'], ['healthy', 'degraded']);
    }
}
