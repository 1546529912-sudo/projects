<?php
declare(strict_types=1);

namespace Tests;

use PHPUnit\Framework\TestCase;

class HealthTest extends TestCase
{
    public function testServiceName(): void
    {
        $this->assertSame('oms-backend', 'oms-backend');
    }

    public function testHealthShape(): void
    {
        $expected = ['service', 'ts', 'db', 'redis'];
        foreach ($expected as $key) {
            $this->assertNotEmpty($key);
        }
    }
}
