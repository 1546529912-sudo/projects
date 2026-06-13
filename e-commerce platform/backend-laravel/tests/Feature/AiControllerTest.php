<?php

namespace Tests\Feature;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiQuotation;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sku;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AiControllerTest extends TestCase
{
    use RefreshDatabase;

    private function login(): User
    {
        $u = User::create([
            'phone' => '13800138811', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        Sanctum::actingAs($u);
        return $u;
    }

    private function fakeAiOkReply(): void
    {
        Http::fake([
            '*/chat/turn' => Http::response([
                'reply' => '已为您匹配 T700 板材，单价 ¥1280，100 件合计 ¥128000。',
                'intent' => 'quotation',
                'confidence' => 0.9,
                'context_patch' => ['material' => 'carbon_fiber', 'form' => 'plate', 'qty' => 100],
                'quotation' => [
                    'items' => [[
                        'sku_id' => 1, 'sku_code' => 'CF-T700-3MM',
                        'name' => 'T700 板', 'qty' => 100,
                        'unit_price' => '1280.00', 'total' => '128000.00',
                    ]],
                    'total_amount' => '128000.00',
                    'valid_until' => '2026-06-01T00:00:00Z',
                    'remark' => null,
                ],
                'transfer_to_human' => false,
            ], 200),
        ]);
    }

    private function fakeAiTransferReply(): void
    {
        Http::fake([
            '*/chat/turn' => Http::response([
                'reply' => '已为您转接人工客服。',
                'intent' => 'other',
                'confidence' => 0.95,
                'transfer_to_human' => true,
                'transfer_reason' => 'user_requested',
            ], 200),
        ]);
    }

    // AI-001-01: 创建对话 + source 标记
    public function test_create_conversation_persists_source(): void
    {
        $this->login();
        $r = $this->postJson('/api/v1/ai/conversations', ['source' => 'global_chat']);
        $r->assertOk();
        $r->assertJsonPath('data.conversation.source', 'global_chat');
        $this->assertDatabaseHas('ai_conversations', ['source' => 'global_chat']);
    }

    // AI-001-01 判定项 1: 详情页入口带商品 ID
    public function test_create_conversation_carries_product_context(): void
    {
        $this->login();
        $r = $this->postJson('/api/v1/ai/conversations', [
            'source' => 'detail_page', 'product_id' => 42, 'sku_id' => 7,
        ]);
        $r->assertOk();
        $ctx = $r->json('data.conversation.context_json');
        $this->assertEquals(42, $ctx['product_id']);
        $this->assertEquals(7, $ctx['sku_id']);
    }

    // AI-002-07: 上下文多轮 — 历史消息会传给 FastAPI
    public function test_send_message_persists_user_and_ai(): void
    {
        $this->fakeAiOkReply();
        $u = $this->login();
        $convRes = $this->postJson('/api/v1/ai/conversations', ['source' => 'floating']);
        $convId = $convRes->json('data.conversation.id');

        $r = $this->postJson("/api/v1/ai/conversations/{$convId}/messages", [
            'content' => '碳纤维板 100kg',
        ]);
        $r->assertOk();
        $this->assertDatabaseHas('ai_messages', ['conversation_id' => $convId, 'sender_type' => 'user']);
        $this->assertDatabaseHas('ai_messages', ['conversation_id' => $convId, 'sender_type' => 'ai']);
    }

    // AI-001-05: 报价单生成入 ai_quotations
    public function test_send_message_creates_quotation_when_provided(): void
    {
        $this->fakeAiOkReply();
        $u = $this->login();
        $convId = $this->postJson('/api/v1/ai/conversations', ['source' => 'floating'])->json('data.conversation.id');

        $r = $this->postJson("/api/v1/ai/conversations/{$convId}/messages", ['content' => 'XX']);
        $r->assertOk();

        $quotation = $r->json('data.quotation');
        $this->assertNotNull($quotation);
        $this->assertEquals('128000.00', $quotation['total_amount']);
        $this->assertDatabaseHas('ai_quotations', ['conversation_id' => $convId, 'status' => 'active']);
    }

    // AI-003-01: 转人工标记持久化
    public function test_send_message_marks_conversation_transferred_when_ai_says_so(): void
    {
        $this->fakeAiTransferReply();
        $u = $this->login();
        $convId = $this->postJson('/api/v1/ai/conversations', ['source' => 'floating'])->json('data.conversation.id');

        $this->postJson("/api/v1/ai/conversations/{$convId}/messages", ['content' => '转人工'])->assertOk();

        $this->assertDatabaseHas('ai_conversations', ['id' => $convId, 'transferred' => 1]);

        // 已转人工的对话不能再发消息
        $r2 = $this->postJson("/api/v1/ai/conversations/{$convId}/messages", ['content' => '继续']);
        $r2->assertStatus(422);
        $r2->assertJsonPath('code', 1701);
    }

    // AI-001-06: 报价单一键加入购物车
    public function test_add_quotation_to_cart_adds_items(): void
    {
        $u = $this->login();
        $cat = Category::create(['name' => 'C', 'slug' => 'qc', 'sort_order' => 0, 'status' => 'active']);
        $p = Product::create(['category_id' => $cat->id, 'name' => 'X', 'model' => 'Q-1', 'status' => 'active']);
        $sku = Sku::create(['product_id' => $p->id, 'sku_code' => 'Q-1', 'base_price' => 100, 'stock' => 50, 'status' => 'active']);

        $q = AiQuotation::create([
            'quotation_no' => 'QT001', 'user_id' => $u->id,
            'items' => [['sku_id' => $sku->id, 'qty' => 3, 'unit_price' => 100, 'sku_code' => 'Q-1', 'name' => 'X', 'total' => 300]],
            'total_amount' => 300,
            'valid_until' => now()->addDays(7),
            'status' => 'active',
        ]);

        $r = $this->postJson("/api/v1/ai/quotations/{$q->id}/add-to-cart");
        $r->assertOk();
        $r->assertJsonPath('data.added', 1);
        $this->assertDatabaseHas('cart_items', ['sku_id' => $sku->id, 'qty' => 3, 'selected' => 1]);
    }

    // 报价单过期阻断
    public function test_add_expired_quotation_rejected(): void
    {
        $u = $this->login();
        $q = AiQuotation::create([
            'quotation_no' => 'QT002', 'user_id' => $u->id,
            'items' => [], 'total_amount' => 0,
            'valid_until' => now()->subDay(),
            'status' => 'active',
        ]);
        $r = $this->postJson("/api/v1/ai/quotations/{$q->id}/add-to-cart");
        $r->assertStatus(422);
        $r->assertJsonPath('code', 1703);
        $this->assertDatabaseHas('ai_quotations', ['id' => $q->id, 'status' => 'expired']);
    }
}
