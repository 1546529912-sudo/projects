<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthControllerTest extends TestCase
{
    public function test_health_endpoint_returns_json(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertJsonStructure([
            'code',
            'message',
            'data' => [
                'service',
                'version',
                'checks' => ['mysql', 'redis', 'ai_service'],
                'timestamp',
            ],
        ]);
    }

    public function test_health_endpoint_includes_service_name(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertJsonPath('data.service', 'zhongyan-platform-backend');
    }
}
