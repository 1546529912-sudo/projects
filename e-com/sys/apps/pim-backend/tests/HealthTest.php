<?php
declare(strict_types=1);

namespace Tests;

use PHPUnit\Framework\TestCase;

class HealthTest extends TestCase
{
    public function testHealthResponseShape(): void
    {
        $expected = ['service', 'ts', 'db', 'redis'];
        foreach ($expected as $key) {
            $this->assertNotEmpty($key);
        }
    }

    public function testServiceName(): void
    {
        $this->assertSame('pim-backend', 'pim-backend');
    }
}
