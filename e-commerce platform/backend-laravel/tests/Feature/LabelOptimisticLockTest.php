<?php

namespace Tests\Feature;

use App\Models\AiConversation;
use App\Models\AiFeedback;
use App\Models\AiMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * iter-26 · label 乐观锁（updated_at if_match 防多 admin 静默覆盖）
 */
class LabelOptimisticLockTest extends TestCase
{
    use RefreshDatabase;

    private function makeContext(): array
    {
        $admin = User::create([
            'phone' => '13800160001', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $user = User::create([
            'phone' => '13800160002', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $conv = AiConversation::create([
            'user_id' => $user->id, 'session_id' => bin2hex(random_bytes(8)),
            'source' => 'floating',
        ]);
        $ai = AiMessage::create([
            'conversation_id' => $conv->id, 'sender_type' => 'ai',
            'content' => 'AI reply',
        ]);
        $fb = AiFeedback::create([
            'message_id' => $ai->id, 'conversation_id' => $conv->id, 'user_id' => $user->id,
            'rating' => 'bad', 'source' => 'manual',
        ]);
        return compact('admin', 'user', 'fb');
    }

    public function test_label_with_matching_if_match_succeeds(): void
    {
        $ctx = $this->makeContext();
        Sanctum::actingAs($ctx['admin']);

        $fresh = $ctx['fb']->fresh();
        $ifMatch = $fresh->updated_at->format('Y-m-d\TH:i:s.uP');

        $r = $this->postJson("/api/v1/admin/ai/feedbacks/{$ctx['fb']->id}/label", [
            'tags' => ['知识缺失'],
            'if_match' => $ifMatch,
        ]);
        $r->assertOk();
        $this->assertTrue((bool) $ctx['fb']->fresh()->labeled);
    }

    public function test_label_with_stale_if_match_returns_409_with_current_state(): void
    {
        $ctx = $this->makeContext();

        // 模拟另一个 admin 先一步改了
        $ctx['fb']->update([
            'tags' => ['他人已标'],
            'labeled' => true,
            'labeled_at' => now(),
            'labeled_by' => $ctx['admin']->id,
        ]);
        $serverUpdatedAt = $ctx['fb']->fresh()->updated_at->format('Y-m-d\TH:i:s.uP');

        // 我们带一个"旧的" if_match
        $staleIfMatch = now()->subMinutes(5)->toIso8601String();
        $this->assertNotSame($serverUpdatedAt, $staleIfMatch);

        Sanctum::actingAs($ctx['admin']);
        $r = $this->postJson("/api/v1/admin/ai/feedbacks/{$ctx['fb']->id}/label", [
            'tags' => ['我也要标'],
            'if_match' => $staleIfMatch,
        ]);
        $r->assertStatus(409);
        $this->assertSame(1090, $r->json('code'));
        $this->assertStringContainsString('他人', $r->json('message'));
        // 当前服务端状态在 data.current 里
        $this->assertSame(['他人已标'], $r->json('data.current.tags'));
        // 我们的更新没被应用
        $this->assertSame(['他人已标'], $ctx['fb']->fresh()->tags);
    }

    public function test_label_without_if_match_bypasses_check(): void
    {
        $ctx = $this->makeContext();
        // 先有人改过
        $ctx['fb']->update(['tags' => ['他人已标'], 'labeled' => true, 'labeled_at' => now()]);

        Sanctum::actingAs($ctx['admin']);
        $r = $this->postJson("/api/v1/admin/ai/feedbacks/{$ctx['fb']->id}/label", [
            'tags' => ['强制覆盖'],
            // 不带 if_match
        ]);
        $r->assertOk();
        $this->assertSame(['强制覆盖'], $ctx['fb']->fresh()->tags);
    }

    public function test_two_admins_race_second_one_blocked(): void
    {
        $ctx = $this->makeContext();
        $admin2 = User::create([
            'phone' => '13800160003', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);

        // 两个 admin 都"加载"了同一个版本
        $loadedAt = $ctx['fb']->fresh()->updated_at->format('Y-m-d\TH:i:s.uP');

        // admin1 先提交成功
        Sanctum::actingAs($ctx['admin']);
        $this->postJson("/api/v1/admin/ai/feedbacks/{$ctx['fb']->id}/label", [
            'tags' => ['admin1 的标签'],
            'if_match' => $loadedAt,
        ])->assertOk();

        // admin2 用同一个 loadedAt → 已经过期
        Sanctum::actingAs($admin2);
        $r = $this->postJson("/api/v1/admin/ai/feedbacks/{$ctx['fb']->id}/label", [
            'tags' => ['admin2 的标签'],
            'if_match' => $loadedAt,
        ]);
        $r->assertStatus(409);
        // admin1 的版本被保留
        $this->assertSame(['admin1 的标签'], $ctx['fb']->fresh()->tags);
    }

    public function test_list_response_includes_updated_at_for_clients_to_track(): void
    {
        $ctx = $this->makeContext();
        Sanctum::actingAs($ctx['admin']);

        $r = $this->getJson('/api/v1/admin/ai/feedbacks?rating=bad&labeled=0');
        $r->assertOk();
        $this->assertNotNull($r->json('data.items.0.updated_at'));
    }
}
