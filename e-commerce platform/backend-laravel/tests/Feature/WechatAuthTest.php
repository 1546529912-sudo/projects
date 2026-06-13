<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WechatAuthTest extends TestCase
{
    use RefreshDatabase;

    // TRADE-001-02 判定项 2：首次微信登录创建账号
    public function test_first_wechat_login_creates_user(): void
    {
        $response = $this->postJson('/api/v1/auth/wechat/callback', [
            'code' => 'mock-code-1',
            'mock_openid' => 'wx_test_001',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.user.role', 'individual');
        $this->assertDatabaseHas('users', ['wechat_openid' => 'wx_test_001']);
    }

    // TRADE-001-02 判定项 4：已绑定微信再次登录不重复创建
    public function test_existing_wechat_user_logs_in_without_creating(): void
    {
        User::create([
            'wechat_openid' => 'wx_test_002',
            'role' => 'individual', 'active_role' => 'individual', 'status' => 'active',
        ]);

        $this->postJson('/api/v1/auth/wechat/callback', [
            'code' => 'mock-code-2',
            'mock_openid' => 'wx_test_002',
        ])->assertOk();

        $this->assertEquals(1, User::where('wechat_openid', 'wx_test_002')->count());
    }

    // TRADE-001-02 判定项 3：首次微信登录 need_bind_phone=true
    public function test_first_wechat_login_returns_need_bind_phone(): void
    {
        $response = $this->postJson('/api/v1/auth/wechat/callback', [
            'code' => 'mock-code-3',
            'mock_openid' => 'wx_test_003',
        ]);

        $response->assertJsonPath('data.need_bind_phone', true);
    }
}
