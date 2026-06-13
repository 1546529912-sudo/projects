<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * iter-12 · 后端 admin 路由权限兜底
 *
 * 锁住"非 admin 登录用户调 /api/v1/admin/* 必须 403"这个行为，
 * 不能再回退到只靠前端拦截。
 */
class AdminPolicyTest extends TestCase
{
    use RefreshDatabase;

    /** @return string[] 所有 admin 端点的代表路径 */
    private function adminEndpoints(): array
    {
        return [
            'GET /api/v1/admin/products',
            'GET /api/v1/admin/orders',
            'GET /api/v1/admin/knowledge',
            'GET /api/v1/admin/companies/pending',
            'GET /api/v1/admin/stock-alerts',
        ];
    }

    public function test_unauthenticated_request_to_admin_returns_401(): void
    {
        foreach ($this->adminEndpoints() as $line) {
            [$method, $path] = explode(' ', $line, 2);
            $r = $this->json($method, $path);
            $r->assertStatus(401);
            $this->assertSame(401, $r->json('code'), "Endpoint {$line} should 401");
        }
    }

    public function test_individual_user_cannot_access_admin_endpoints(): void
    {
        $user = User::create([
            'phone' => '13800100100', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        foreach ($this->adminEndpoints() as $line) {
            [$method, $path] = explode(' ', $line, 2);
            $r = $this->json($method, $path);
            $r->assertStatus(403);
            $this->assertSame(403, $r->json('code'), "Endpoint {$line} should 403 for individual");
            $this->assertStringContainsString('管理员', (string) $r->json('message'));
        }
    }

    public function test_enterprise_user_also_cannot_access_admin_endpoints(): void
    {
        $user = User::create([
            'phone' => '13800100200', 'role' => 'enterprise',
            'active_role' => 'enterprise', 'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        $r = $this->getJson('/api/v1/admin/products');
        $r->assertStatus(403);
    }

    public function test_admin_user_can_access_admin_endpoints(): void
    {
        $admin = User::create([
            'phone' => '13800100300', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        Sanctum::actingAs($admin);

        foreach ($this->adminEndpoints() as $line) {
            [$method, $path] = explode(' ', $line, 2);
            $r = $this->json($method, $path);
            $r->assertStatus(200);
            $this->assertSame(0, $r->json('code'), "Endpoint {$line} should return 0 code for admin");
        }
    }

    public function test_non_admin_blocked_from_write_endpoints_too(): void
    {
        $user = User::create([
            'phone' => '13800100400', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        // 写接口（最危险），确认确实被挡
        $r1 = $this->postJson('/api/v1/admin/products', ['name' => 'hack']);
        $r1->assertStatus(403);

        $r2 = $this->postJson('/api/v1/admin/orders/1/ship', [
            'tracking_company' => 'X', 'tracking_no' => 'Y',
        ]);
        $r2->assertStatus(403);
    }
}
