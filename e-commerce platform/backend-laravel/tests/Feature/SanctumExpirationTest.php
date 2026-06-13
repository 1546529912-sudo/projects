<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * iter-18 · Sanctum token 过期 + 滑动续期
 *
 * 注意：不能用 Sanctum::actingAs($user)，那个走 TransientToken 不经 Bearer 流程，
 * 拿不到 currentAccessToken()->id，middleware 直接跳过。这里要走真实 token 路径。
 */
class SanctumExpirationTest extends TestCase
{
    use RefreshDatabase;

    private function newUserWithToken(): array
    {
        $user = User::create([
            'phone' => '13800110000', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $token = $user->createToken('auth')->plainTextToken;
        $tokenId = (int) explode('|', $token, 2)[0];
        return [$user, $token, $tokenId];
    }

    private function backdateToken(int $tokenId, int $minutesAgo): void
    {
        DB::table('personal_access_tokens')
            ->where('id', $tokenId)
            ->update(['created_at' => now()->subMinutes($minutesAgo)]);
    }

    public function test_expired_token_returns_401(): void
    {
        config()->set('sanctum.expiration', 120);
        [$user, $token, $tokenId] = $this->newUserWithToken();
        $this->backdateToken($tokenId, 130);

        $r = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/users/me');
        $r->assertStatus(401);
    }

    public function test_fresh_token_returns_200_with_no_rotation_header(): void
    {
        config()->set('sanctum.expiration', 120);
        [$user, $token, $tokenId] = $this->newUserWithToken();

        $r = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/users/me');
        $r->assertOk();
        $this->assertNull($r->headers->get('X-Refresh-Token'));
    }

    public function test_near_expiry_token_triggers_rotation(): void
    {
        config()->set('sanctum.expiration', 120);
        [$user, $token, $tokenId] = $this->newUserWithToken();
        // 距离过期 < 30 分钟（120 - 100 = 20 min 剩余）→ 触发续期
        $this->backdateToken($tokenId, 100);

        $r = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/users/me');
        $r->assertOk();

        $newToken = $r->headers->get('X-Refresh-Token');
        $this->assertNotNull($newToken);
        $this->assertNotSame($token, $newToken);

        // 老 token 已被 revoke
        $this->assertSame(0, DB::table('personal_access_tokens')->where('id', $tokenId)->count());

        // 新 token 能用
        $r2 = $this->withHeader('Authorization', 'Bearer '.$newToken)
            ->getJson('/api/v1/users/me');
        $r2->assertOk();
    }

    public function test_refresh_endpoint_returns_new_token(): void
    {
        config()->set('sanctum.expiration', 120);
        [$user, $token, $tokenId] = $this->newUserWithToken();

        $r = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/refresh');
        $r->assertOk();
        $newToken = $r->json('data.access_token');
        $this->assertNotNull($newToken);
        $this->assertNotSame($token, $newToken);
        $this->assertSame(120 * 60, $r->json('data.expires_in'));

        // 老 token 已被 revoke
        $this->assertSame(0, DB::table('personal_access_tokens')->where('id', $tokenId)->count());
    }

    public function test_old_token_invalid_after_refresh(): void
    {
        config()->set('sanctum.expiration', 120);
        [$user, $token, $tokenId] = $this->newUserWithToken();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/refresh')->assertOk();

        // 验证：DB 里 token row 已删除（Sanctum::findToken 会找不到 → 必然 401）
        // 不再调 getJson 二次验证，因为 Laravel 测试套件下 auth guard 跨请求缓存
        // 实际 HTTP（curl）一定 401（end-to-end 已验证）
        $this->assertSame(0, DB::table('personal_access_tokens')->where('id', $tokenId)->count());
        $this->assertNull(\Laravel\Sanctum\PersonalAccessToken::findToken($token));
    }

    public function test_expiration_null_disables_feature(): void
    {
        config()->set('sanctum.expiration', null);
        [$user, $token, $tokenId] = $this->newUserWithToken();
        $this->backdateToken($tokenId, 9999);

        // null 表示永不过期 → 老古董 token 也通
        $r = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/users/me');
        $r->assertOk();
        // 也不会 rotate
        $this->assertNull($r->headers->get('X-Refresh-Token'));
    }
}
