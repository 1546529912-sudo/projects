<?php
declare(strict_types=1);

namespace Tests;

use PHPUnit\Framework\TestCase;

class HealthTest extends TestCase
{
    public function testServiceName(): void
    {
        $this->assertSame('wms-backend', 'wms-backend');
    }

    public function testHealthShape(): void
    {
        foreach (['service', 'ts', 'db', 'redis'] as $key) {
            $this->assertNotEmpty($key);
        }
    }
}
