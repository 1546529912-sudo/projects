<?php

namespace Tests\Feature;

use App\Models\Address;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AddressControllerTest extends TestCase
{
    use RefreshDatabase;

    private function setup1(): User
    {
        $u = User::create([
            'phone' => '13800138501', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        Sanctum::actingAs($u);
        return $u;
    }

    // TRADE-004-01 判定项 1：CRUD - 新增
    public function test_create_address(): void
    {
        $this->setup1();
        $r = $this->postJson('/api/v1/addresses', [
            'receiver_name' => '张三', 'receiver_phone' => '13800138501',
            'province' => '北京', 'city' => '北京', 'district' => '海淀',
            'detail' => '中关村',
        ]);
        $r->assertOk();
        $this->assertDatabaseHas('addresses', ['detail' => '中关村']);
    }

    // 第一条地址自动设为默认
    public function test_first_address_auto_default(): void
    {
        $this->setup1();
        $this->postJson('/api/v1/addresses', [
            'receiver_name' => '李四', 'receiver_phone' => '13800138501',
            'province' => '上海', 'city' => '上海', 'district' => '浦东',
            'detail' => '陆家嘴',
        ])->assertJsonPath('data.address.is_default', true);
    }

    // TRADE-004-01 判定项 4：设默认其他自动取消
    public function test_set_default_unsets_others(): void
    {
        $u = $this->setup1();
        $a1 = Address::create(['user_id' => $u->id, 'receiver_name' => 'A', 'receiver_phone' => '13800138501',
            'province' => 'P', 'city' => 'C', 'district' => 'D', 'detail' => 'd', 'is_default' => 1]);
        $a2 = Address::create(['user_id' => $u->id, 'receiver_name' => 'B', 'receiver_phone' => '13800138501',
            'province' => 'P', 'city' => 'C', 'district' => 'D', 'detail' => 'd2', 'is_default' => 0]);

        $this->putJson("/api/v1/addresses/{$a2->id}", ['is_default' => true])->assertOk();
        $this->assertEquals(0, $a1->fresh()->is_default);
        $this->assertEquals(1, $a2->fresh()->is_default);
    }

    // TRADE-004-01 判定项 5：手机号格式校验
    public function test_phone_format_required(): void
    {
        $this->setup1();
        $r = $this->postJson('/api/v1/addresses', [
            'receiver_name' => '张三', 'receiver_phone' => '1234',
            'province' => '北京', 'city' => '北京', 'district' => '海淀', 'detail' => 'd',
        ]);
        $r->assertStatus(422);
    }

    // 删除
    public function test_delete_address(): void
    {
        $u = $this->setup1();
        $a = Address::create(['user_id' => $u->id, 'receiver_name' => 'A', 'receiver_phone' => '13800138501',
            'province' => 'P', 'city' => 'C', 'district' => 'D', 'detail' => 'd']);

        $this->deleteJson("/api/v1/addresses/{$a->id}")->assertOk();
        $this->assertSoftDeleted('addresses', ['id' => $a->id]);
    }
}
