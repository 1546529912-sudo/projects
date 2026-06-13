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
 * iter-14 · CSV + JSONL 导出
 */
class AiFeedbackExportTest extends TestCase
{
    use RefreshDatabase;

    private function seedOneBadCase(): array
    {
        $admin = User::create([
            'phone' => '13800101000', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $user = User::create([
            'phone' => '13800101001', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $conv = AiConversation::create([
            'user_id' => $user->id, 'session_id' => bin2hex(random_bytes(8)),
            'source' => 'floating',
        ]);
        $userMsg = AiMessage::create([
            'conversation_id' => $conv->id, 'sender_type' => 'user',
            'content' => '我要一吨碳纤维',
        ]);
        $aiMsg = AiMessage::create([
            'conversation_id' => $conv->id, 'sender_type' => 'ai',
            'content' => '我不知道',
        ]);
        $fb = AiFeedback::create([
            'message_id' => $aiMsg->id, 'conversation_id' => $conv->id, 'user_id' => $user->id,
            'rating' => 'bad', 'source' => 'manual',
            'reason' => '答非所问',
            'tags' => ['知识缺失', '答非所问'],
            'labeled' => true, 'labeled_at' => now(),
        ]);
        return compact('admin', 'user', 'conv', 'userMsg', 'aiMsg', 'fb');
    }

    public function test_csv_export_contains_header_and_row(): void
    {
        $ctx = $this->seedOneBadCase();
        Sanctum::actingAs($ctx['admin']);

        $r = $this->get('/api/v1/admin/ai/feedbacks/export.csv?rating=bad&labeled=1');
        $r->assertOk();
        $r->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $body = $r->streamedContent();
        // BOM 头
        $this->assertStringStartsWith("\xEF\xBB\xBF", $body);
        // 列头
        $this->assertStringContainsString('feedback_id,conversation_id,message_id', $body);
        // 行数据：user_question + ai_reply + tags 拼接
        $this->assertStringContainsString('我要一吨碳纤维', $body);
        $this->assertStringContainsString('我不知道', $body);
        $this->assertStringContainsString('知识缺失;答非所问', $body);
    }

    public function test_jsonl_export_valid_per_line(): void
    {
        $ctx = $this->seedOneBadCase();
        Sanctum::actingAs($ctx['admin']);

        $r = $this->get('/api/v1/admin/ai/feedbacks/export.jsonl?rating=bad&labeled=1');
        $r->assertOk();
        $r->assertHeader('content-type', 'application/x-ndjson; charset=UTF-8');

        $lines = array_filter(explode("\n", $r->streamedContent()));
        $this->assertCount(1, $lines);

        $row = json_decode($lines[0], true);
        $this->assertSame($ctx['fb']->id, $row['feedback_id']);
        $this->assertSame('bad', $row['rating']);
        $this->assertSame(['知识缺失', '答非所问'], $row['tags']);
        $this->assertSame('user', $row['messages'][0]['role']);
        $this->assertSame('我要一吨碳纤维', $row['messages'][0]['content']);
        $this->assertSame('assistant', $row['messages'][1]['role']);
        // iter-15：无 correct_answer 时 assistant 回的是 bad
        $this->assertSame('我不知道', $row['messages'][1]['content']);
        $this->assertSame('我不知道', $row['bad_reply']);
        $this->assertNull($row['correct_answer']);
        $this->assertFalse($row['is_training_ready']);
    }

    public function test_jsonl_uses_correct_answer_when_present(): void
    {
        $ctx = $this->seedOneBadCase();
        $ctx['fb']->update(['correct_answer' => '一吨碳纤维 T700 标准型 ¥1,180/kg，建议下单数量 ≥1000kg 享阶梯价']);

        Sanctum::actingAs($ctx['admin']);
        $r = $this->get('/api/v1/admin/ai/feedbacks/export.jsonl?rating=bad&labeled=1');
        $r->assertOk();

        $lines = array_filter(explode("\n", $r->streamedContent()));
        $row = json_decode($lines[0], true);

        // assistant 内容 = correct_answer（直接训练样本）
        $this->assertSame('一吨碳纤维 T700 标准型 ¥1,180/kg，建议下单数量 ≥1000kg 享阶梯价', $row['messages'][1]['content']);
        // 原 bad reply 仍保留供审核 / diff
        $this->assertSame('我不知道', $row['bad_reply']);
        $this->assertNotNull($row['correct_answer']);
        $this->assertTrue($row['is_training_ready']);
    }

    public function test_csv_includes_correct_answer_column(): void
    {
        $ctx = $this->seedOneBadCase();
        $ctx['fb']->update(['correct_answer' => '正确答案示例']);

        Sanctum::actingAs($ctx['admin']);
        $r = $this->get('/api/v1/admin/ai/feedbacks/export.csv?rating=bad&labeled=1');
        $r->assertOk();
        $body = $r->streamedContent();

        $this->assertStringContainsString('correct_answer', $body);
        $this->assertStringContainsString('正确答案示例', $body);
    }

    public function test_non_admin_blocked_from_export(): void
    {
        $ctx = $this->seedOneBadCase();
        Sanctum::actingAs($ctx['user']);  // individual, not admin

        $this->get('/api/v1/admin/ai/feedbacks/export.csv')->assertStatus(403);
        $this->get('/api/v1/admin/ai/feedbacks/export.jsonl')->assertStatus(403);
    }

    public function test_filter_labeled_zero_excludes_labeled_rows(): void
    {
        $ctx = $this->seedOneBadCase();  // 这条已 labeled
        // 再加一条未标注的
        AiFeedback::create([
            'message_id' => $ctx['aiMsg']->id,
            'conversation_id' => $ctx['conv']->id,
            'user_id' => null,
            'rating' => 'bad', 'source' => 'auto_transfer',
            'reason' => '转人工自动',
        ]);

        Sanctum::actingAs($ctx['admin']);
        $r = $this->get('/api/v1/admin/ai/feedbacks/export.jsonl?rating=bad&labeled=0');
        $r->assertOk();
        $lines = array_filter(explode("\n", $r->streamedContent()));
        $this->assertCount(1, $lines);
        $row = json_decode($lines[0], true);
        $this->assertSame('auto_transfer', $row['source']);
    }
}
