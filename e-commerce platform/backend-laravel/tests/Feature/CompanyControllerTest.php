<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompanyControllerTest extends TestCase
{
    use RefreshDatabase;

    // TRADE-001-04 判定项 1：提交认证后 status=pending
    public function test_submit_creates_pending_company(): void
    {
        $user = User::create(['phone' => '13800138101', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/companies', [
            'name' => '中研复材测试有限公司',
            'credit_code' => '91110000600001234X',
            'license_url' => 'http://localhost/storage/licenses/test.pdf',
            'contact_name' => '张三',
            'contact_phone' => '13800138101',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('companies', ['credit_code' => '91110000600001234X', 'status' => 'pending']);
    }

    // TRADE-001-04 判定项 2：18 位代码格式校验
    public function test_submit_rejects_invalid_credit_code(): void
    {
        $user = User::create(['phone' => '13800138102', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/companies', [
            'name' => 'X',
            'credit_code' => 'INVALID',
            'license_url' => 'http://x/a.pdf',
            'contact_name' => 'X',
            'contact_phone' => '13800138102',
        ]);

        $response->assertStatus(422);
    }

    // TRADE-001-04 判定项 4：重复信用代码阻断
    public function test_submit_rejects_duplicate_credit_code(): void
    {
        $u1 = User::create(['phone' => '13800138103', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        Company::create([
            'user_id' => $u1->id,
            'name' => 'X', 'credit_code' => '91110000600001234X',
            'license_url' => 'http://x', 'contact_name' => 'X', 'contact_phone' => '13800138103',
            'status' => 'pending',
        ]);

        $u2 = User::create(['phone' => '13800138104', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        Sanctum::actingAs($u2);

        $response = $this->postJson('/api/v1/companies', [
            'name' => 'Y',
            'credit_code' => '91110000600001234X',
            'license_url' => 'http://y',
            'contact_name' => 'Y',
            'contact_phone' => '13800138104',
        ]);
        $response->assertStatus(422);
        $response->assertJsonPath('code', 1101);
    }

    // TRADE-001-05 判定项 3：审核通过升级用户角色为 enterprise
    public function test_admin_approve_upgrades_user_role(): void
    {
        $user = User::create(['phone' => '13800138105', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        $company = Company::create([
            'user_id' => $user->id,
            'name' => 'X', 'credit_code' => '91110000600009876Y',
            'license_url' => 'http://x', 'contact_name' => 'X', 'contact_phone' => '13800138105',
            'status' => 'pending',
        ]);

        $admin = User::create(['phone' => '13800138199', 'role' => 'admin', 'active_role' => 'individual', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/companies/{$company->id}/review", ['action' => 'approve'])->assertOk();

        $this->assertDatabaseHas('companies', ['id' => $company->id, 'status' => 'approved']);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'role' => 'enterprise', 'company_id' => $company->id]);
    }

    // TRADE-001-05 判定项 4：驳回必须填原因
    public function test_admin_reject_requires_reason(): void
    {
        $user = User::create(['phone' => '13800138106', 'role' => 'individual', 'active_role' => 'individual', 'status' => 'active']);
        $company = Company::create([
            'user_id' => $user->id,
            'name' => 'X', 'credit_code' => '91110000600005555Z',
            'license_url' => 'http://x', 'contact_name' => 'X', 'contact_phone' => '13800138106',
            'status' => 'pending',
        ]);

        $admin = User::create(['phone' => '13800138198', 'role' => 'admin', 'active_role' => 'individual', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/companies/{$company->id}/review", ['action' => 'reject'])
            ->assertStatus(422);
    }
}
