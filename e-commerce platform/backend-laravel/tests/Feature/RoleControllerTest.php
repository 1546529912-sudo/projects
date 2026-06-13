<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleControllerTest extends TestCase
{
    use RefreshDatabase;

    // TRADE-001-06 判定项 1：企业账号切到 enterprise active_role 成功
    public function test_enterprise_user_can_switch_to_enterprise_role(): void
    {
        $user = User::create([
            'phone' => '13800138201', 'role' => 'enterprise',
            'active_role' => 'individual', 'status' => 'active', 'company_id' => 1,
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/users/role/switch', ['role' => 'enterprise']);
        $response->assertOk();
        $this->assertDatabaseHas('users', ['id' => $user->id, 'active_role' => 'enterprise']);
    }

    // TRADE-001-06 判定项 3：个人账号不可切到 enterprise
    public function test_individual_user_cannot_switch_to_enterprise(): void
    {
        $user = User::create([
            'phone' => '13800138202', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/users/role/switch', ['role' => 'enterprise']);
        $response->assertStatus(403);
        $response->assertJsonPath('code', 1110);
    }

    // TRADE-001-06 判定项 4：切回 individual 始终允许
    public function test_user_can_switch_to_individual(): void
    {
        $user = User::create([
            'phone' => '13800138203', 'role' => 'enterprise',
            'active_role' => 'enterprise', 'status' => 'active', 'company_id' => 1,
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/users/role/switch', ['role' => 'individual']);
        $response->assertOk();
        $this->assertDatabaseHas('users', ['id' => $user->id, 'active_role' => 'individual']);
    }
}
