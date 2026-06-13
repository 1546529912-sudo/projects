<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // 每个用例清掉 SMS 相关 redis key，避免冷却/锁定/验证码污染
        try {
            Redis::connection()->flushdb();
        } catch (\Throwable) {
            // redis 不可用时跳过
        }
    }

    // TRADE-001-01 判定项 1
    public function test_send_sms_code_returns_ok_for_valid_phone(): void
    {
        $response = $this->postJson('/api/v1/auth/sms/send', [
            'phone' => '13800138001',
        ]);
        $response->assertOk();
        $response->assertJsonPath('code', 0);
    }

    // TRADE-001-01 判定项 1（手机号格式）
    public function test_send_sms_code_rejects_invalid_phone(): void
    {
        $response = $this->postJson('/api/v1/auth/sms/send', [
            'phone' => '1234',
        ]);
        $response->assertStatus(422);
    }

    // TRADE-001-01 判定项 3
    public function test_register_creates_user_when_code_valid(): void
    {
        $phone = '13800138002';
        Redis::set("sms:code:{$phone}", '123456');

        $response = $this->postJson('/api/v1/auth/register', [
            'phone' => $phone,
            'code' => '123456',
        ]);
        $response->assertOk();
        $this->assertDatabaseHas('users', ['phone' => $phone, 'status' => 'active']);
    }

    // TRADE-001-01 判定项 4
    public function test_register_rejects_duplicate_phone(): void
    {
        $phone = '13800138003';
        User::create(['phone' => $phone, 'status' => 'active', 'role' => 'individual', 'active_role' => 'individual']);
        Redis::set("sms:code:{$phone}", '123456');

        $response = $this->postJson('/api/v1/auth/register', [
            'phone' => $phone,
            'code' => '123456',
        ]);
        $response->assertStatus(422);
        $response->assertJsonPath('code', 1003);
    }

    // TRADE-001-01 判定项 6（验证码错误/过期）
    public function test_register_rejects_wrong_code(): void
    {
        $phone = '13800138004';
        Redis::set("sms:code:{$phone}", '123456');

        $response = $this->postJson('/api/v1/auth/register', [
            'phone' => $phone,
            'code' => '654321',
        ]);
        $response->assertStatus(422);
        $response->assertJsonPath('code', 1002);
    }
}
