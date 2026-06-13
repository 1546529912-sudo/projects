<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * iter-23 · 设备管理（list / revoke / logout-others）
 *
 * 走真实 Bearer 流程（不用 Sanctum::actingAs，否则 currentAccessToken 是 TransientToken 拿不到 id）
 */
class DeviceManagementTest extends TestCase
{
    use RefreshDatabase;

    private function newUserWithToken(string $phone = '13800111000', string $deviceName = 'Chrome · macOS · 127.0.0.1'): array
    {
        $user = User::firstOrCreate(['phone' => $phone], [
            'role' => 'individual', 'active_role' => 'individual', 'status' => 'active',
        ]);
        $token = $user->createToken($deviceName)->plainTextToken;
        $tokenId = (int) explode('|', $token, 2)[0];
        return [$user, $token, $tokenId];
    }

    public function test_login_persists_device_label_from_ua(): void
    {
        config()->set('sanctum.expiration', null);
        $user = User::create([
            'phone' => '13800111100', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
            'password' => bcrypt('pass123'),
        ]);

        $r = $this->withHeaders([
            'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119',
        ])->postJson('/api/v1/auth/login', ['phone' => '13800111100', 'password' => 'pass123']);
        $r->assertOk();

        $name = DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->value('name');
        $this->assertStringContainsString('Chrome', $name);
        $this->assertStringContainsString('macOS', $name);
    }

    public function test_devices_list_marks_current(): void
    {
        [$user, $token, $tokenId] = $this->newUserWithToken();
        // 加一个其他设备的 token
        $user->createToken('Firefox · Windows · 8.8.8.8');

        $r = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/auth/devices');
        $r->assertOk();
        $this->assertSame(2, count($r->json('data.devices')));

        $current = collect($r->json('data.devices'))->firstWhere('is_current', true);
        $this->assertNotNull($current);
        $this->assertSame($tokenId, $current['id']);
        $this->assertStringContainsString('Chrome', $current['name']);
    }

    public function test_revoke_device_deletes_token(): void
    {
        [$user, $token, $tokenId] = $this->newUserWithToken();
        $other = $user->createToken('Firefox · Windows · 8.8.8.8');
        $otherId = $other->accessToken->id;

        $r = $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/v1/auth/devices/{$otherId}");
        $r->assertOk();
        $this->assertSame(0, DB::table('personal_access_tokens')->where('id', $otherId)->count());
        // 当前 token 仍在
        $this->assertSame(1, DB::table('personal_access_tokens')->where('id', $tokenId)->count());
    }

    public function test_revoke_cannot_touch_other_users_token(): void
    {
        [$alice, $aliceToken,] = $this->newUserWithToken('13800111001');
        [$bob, $bobToken, $bobTokenId] = $this->newUserWithToken('13800111002');

        $r = $this->withHeader('Authorization', 'Bearer '.$aliceToken)
            ->deleteJson("/api/v1/auth/devices/{$bobTokenId}");
        $r->assertStatus(404);
        $this->assertSame(1, DB::table('personal_access_tokens')->where('id', $bobTokenId)->count());
    }

    public function test_logout_others_revokes_all_but_current(): void
    {
        [$user, $token, $tokenId] = $this->newUserWithToken();
        $user->createToken('Firefox · Windows · 8.8.8.8');
        $user->createToken('Safari · iPhone · 9.9.9.9');
        $this->assertSame(3, DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->count());

        $r = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/logout-others');
        $r->assertOk();
        $this->assertSame(2, $r->json('data.revoked'));
        // 仅当前留
        $this->assertSame(1, DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->count());
        $this->assertSame(1, DB::table('personal_access_tokens')->where('id', $tokenId)->count());
    }

    public function test_devices_endpoint_requires_auth(): void
    {
        $this->getJson('/api/v1/auth/devices')->assertStatus(401);
    }

    public function test_refresh_preserves_device_name(): void
    {
        [$user, $token, $tokenId] = $this->newUserWithToken();
        $originalName = DB::table('personal_access_tokens')->where('id', $tokenId)->value('name');

        $r = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/refresh');
        $r->assertOk();
        $newToken = $r->json('data.access_token');
        $newId = (int) explode('|', $newToken, 2)[0];

        $newName = DB::table('personal_access_tokens')->where('id', $newId)->value('name');
        $this->assertSame($originalName, $newName);
    }
}
