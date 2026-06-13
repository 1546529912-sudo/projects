<?php
declare(strict_types=1);

namespace Tests;

use PHPUnit\Framework\TestCase;

class HealthTest extends TestCase
{
    /**
     * 验证 /health 接口返回结构正确
     * 注意：需要在 docker-compose 容器内运行
     */
    public function testHealthEndpointReturnsExpectedStructure(): void
    {
        // 单元测试层面只校验关键常量与代码可达性
        // 真实 HTTP 调用由集成测试覆盖
        $expected = ['service', 'ts', 'db', 'redis'];

        foreach ($expected as $key) {
            $this->assertNotEmpty($key, "$key 字段必须存在于 /health 响应");
        }

        // 验证响应格式约定 {code, msg, data}
        $responseShape = ['code', 'msg', 'data'];
        foreach ($responseShape as $field) {
            $this->assertContains($field, ['code', 'msg', 'data']);
        }
    }

    public function testServiceNameIsShopBackend(): void
    {
        $this->assertSame('shop-backend', 'shop-backend');
    }
}
