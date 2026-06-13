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
 * iter-13 · 用户反馈 + 后台 Bad Case 列表/标注/聚类
 */
class AiFeedbackTest extends TestCase
{
    use RefreshDatabase;

    private function makeUserConvAiMsg(): array
    {
        $u = User::create([
            'phone' => '13800139500', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $c = AiConversation::create([
            'user_id' => $u->id, 'session_id' => bin2hex(random_bytes(8)),
            'source' => 'floating',
        ]);
        $ai = AiMessage::create([
            'conversation_id' => $c->id, 'sender_type' => 'ai',
            'content' => 'AI 给出的回复',
        ]);
        return [$u, $c, $ai];
    }

    public function test_user_can_submit_bad_feedback(): void
    {
        [$u, $c, $ai] = $this->makeUserConvAiMsg();
        Sanctum::actingAs($u);

        $r = $this->postJson('/api/v1/ai/feedbacks', [
            'message_id' => $ai->id, 'rating' => 'bad', 'reason' => '答非所问',
        ]);
        $r->assertOk();

        $this->assertDatabaseHas('ai_feedbacks', [
            'message_id' => $ai->id, 'user_id' => $u->id,
            'rating' => 'bad', 'source' => 'manual', 'reason' => '答非所问',
        ]);
    }

    public function test_feedback_overrides_when_resubmitted(): void
    {
        [$u, $c, $ai] = $this->makeUserConvAiMsg();
        Sanctum::actingAs($u);

        $this->postJson('/api/v1/ai/feedbacks', ['message_id' => $ai->id, 'rating' => 'good']);
        $this->postJson('/api/v1/ai/feedbacks', ['message_id' => $ai->id, 'rating' => 'bad', 'reason' => '改主意了']);

        // 同 (message_id, user_id, source=manual) 只一条
        $this->assertSame(1, AiFeedback::where('message_id', $ai->id)->where('source', 'manual')->count());
        $fb = AiFeedback::where('message_id', $ai->id)->first();
        $this->assertSame('bad', $fb->rating);
        $this->assertSame('改主意了', $fb->reason);
    }

    public function test_cannot_feedback_other_users_message(): void
    {
        [$owner, $c, $ai] = $this->makeUserConvAiMsg();
        $other = User::create([
            'phone' => '13800139501', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        Sanctum::actingAs($other);

        $r = $this->postJson('/api/v1/ai/feedbacks', ['message_id' => $ai->id, 'rating' => 'bad']);
        $r->assertStatus(403);
        $this->assertSame(0, AiFeedback::count());
    }

    public function test_cannot_feedback_non_ai_message(): void
    {
        [$u, $c, $ai] = $this->makeUserConvAiMsg();
        $userMsg = AiMessage::create([
            'conversation_id' => $c->id, 'sender_type' => 'user',
            'content' => '我的输入',
        ]);
        Sanctum::actingAs($u);

        $r = $this->postJson('/api/v1/ai/feedbacks', ['message_id' => $userMsg->id, 'rating' => 'bad']);
        $r->assertStatus(422);
    }

    public function test_admin_lists_bad_cases_with_unlabeled_count(): void
    {
        $admin = User::create([
            'phone' => '13800100900', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        [$u, $c, $ai] = $this->makeUserConvAiMsg();

        AiFeedback::create([
            'message_id' => $ai->id, 'conversation_id' => $c->id, 'user_id' => $u->id,
            'rating' => 'bad', 'source' => 'manual', 'reason' => 'r1',
        ]);
        AiFeedback::create([
            'message_id' => $ai->id, 'conversation_id' => $c->id, 'user_id' => null,
            'rating' => 'bad', 'source' => 'auto_transfer', 'reason' => 'r2',
        ]);
        AiFeedback::create([
            'message_id' => $ai->id, 'conversation_id' => $c->id, 'user_id' => $u->id,
            'rating' => 'good', 'source' => 'manual',
        ]);

        Sanctum::actingAs($admin);
        $r = $this->getJson('/api/v1/admin/ai/feedbacks?rating=bad&labeled=0');
        $r->assertOk();
        $this->assertCount(2, $r->json('data.items'));
        $this->assertSame(2, $r->json('data.unlabeled_bad_count'));
    }

    public function test_admin_label_marks_labeled_and_writes_tags(): void
    {
        $admin = User::create([
            'phone' => '13800100901', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        [$u, $c, $ai] = $this->makeUserConvAiMsg();
        $fb = AiFeedback::create([
            'message_id' => $ai->id, 'conversation_id' => $c->id, 'user_id' => $u->id,
            'rating' => 'bad', 'source' => 'manual',
        ]);

        Sanctum::actingAs($admin);
        $r = $this->postJson("/api/v1/admin/ai/feedbacks/{$fb->id}/label", [
            'tags' => ['知识缺失', '答非所问'],
        ]);
        $r->assertOk();

        $fresh = $fb->fresh();
        $this->assertTrue((bool) $fresh->labeled);
        $this->assertSame(['知识缺失', '答非所问'], $fresh->tags);
        $this->assertSame($admin->id, $fresh->labeled_by);
        $this->assertNotNull($fresh->labeled_at);
        $this->assertNull($fresh->correct_answer); // iter-15：未传则保持 null
    }

    public function test_admin_label_persists_correct_answer(): void
    {
        $admin = User::create([
            'phone' => '13800100903', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        [$u, $c, $ai] = $this->makeUserConvAiMsg();
        $fb = AiFeedback::create([
            'message_id' => $ai->id, 'conversation_id' => $c->id, 'user_id' => $u->id,
            'rating' => 'bad', 'source' => 'manual',
        ]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/v1/admin/ai/feedbacks/{$fb->id}/label", [
            'tags' => ['知识缺失'],
            'correct_answer' => '一吨碳纤维板 T700 标准型 ¥1,180/kg，需阶梯价请告诉我数量',
        ])->assertOk();

        $fresh = $fb->fresh();
        $this->assertSame('一吨碳纤维板 T700 标准型 ¥1,180/kg，需阶梯价请告诉我数量', $fresh->correct_answer);
    }

    public function test_admin_stats_aggregates_by_source_and_tag(): void
    {
        $admin = User::create([
            'phone' => '13800100902', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        [$u, $c, $ai] = $this->makeUserConvAiMsg();

        AiFeedback::create([
            'message_id' => $ai->id, 'conversation_id' => $c->id, 'user_id' => $u->id,
            'rating' => 'bad', 'source' => 'manual',
            'labeled' => 1, 'labeled_at' => now(),
            'tags' => ['知识缺失', '答非所问'],
        ]);
        AiFeedback::create([
            'message_id' => $ai->id, 'conversation_id' => $c->id, 'user_id' => null,
            'rating' => 'bad', 'source' => 'auto_transfer',
            'labeled' => 1, 'labeled_at' => now(),
            'tags' => ['知识缺失'],
        ]);

        Sanctum::actingAs($admin);
        $r = $this->getJson('/api/v1/admin/ai/feedbacks/stats');
        $r->assertOk();
        $this->assertSame(1, $r->json('data.by_source.manual'));
        $this->assertSame(1, $r->json('data.by_source.auto_transfer'));
        $this->assertSame(2, $r->json('data.by_tag.知识缺失'));
        $this->assertSame(1, $r->json('data.by_tag.答非所问'));
        $this->assertSame(2, $r->json('data.total_bad'));
        // iter-15：没人写 correct_answer
        $this->assertSame(0, $r->json('data.training_ready'));
    }

    public function test_stats_counts_training_ready_when_correct_answer_set(): void
    {
        $admin = User::create([
            'phone' => '13800100904', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        [$u, $c, $ai] = $this->makeUserConvAiMsg();

        // 一条有 correct_answer，一条没有
        AiFeedback::create([
            'message_id' => $ai->id, 'conversation_id' => $c->id, 'user_id' => $u->id,
            'rating' => 'bad', 'source' => 'manual',
            'correct_answer' => '正确的答案',
        ]);
        AiFeedback::create([
            'message_id' => $ai->id, 'conversation_id' => $c->id, 'user_id' => null,
            'rating' => 'bad', 'source' => 'auto_transfer',
        ]);

        Sanctum::actingAs($admin);
        $r = $this->getJson('/api/v1/admin/ai/feedbacks/stats');
        $r->assertOk();
        $this->assertSame(2, $r->json('data.total_bad'));
        $this->assertSame(1, $r->json('data.training_ready'));
    }
}
