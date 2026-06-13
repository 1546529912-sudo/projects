<?php

namespace Tests\Feature;

use App\Models\AiConversation;
use App\Models\AiFeedback;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * iter-16 · AI 自评 confidence 低 → 自动入 bad case（source=auto_lowconf）
 */
class AiAutoLowConfTest extends TestCase
{
    use RefreshDatabase;

    private function setupConv(): array
    {
        $u = User::create([
            'phone' => '13800138900', 'role' => 'individual',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        $conv = AiConversation::create([
            'user_id' => $u->id, 'session_id' => bin2hex(random_bytes(8)),
            'source' => 'floating',
        ]);
        Sanctum::actingAs($u);
        return [$u, $conv];
    }

    private function fakeAi(float $confidence, bool $transfer = false): void
    {
        Http::fake([
            '*/chat/turn' => Http::response([
                'reply' => 'demo reply',
                'intent' => 'presale',
                'confidence' => $confidence,
                'transfer_to_human' => $transfer,
            ], 200),
        ]);
    }

    public function test_low_confidence_triggers_auto_lowconf_feedback(): void
    {
        config()->set('services.ai.lowconf_threshold', 0.6);
        [$u, $conv] = $this->setupConv();
        $this->fakeAi(confidence: 0.3);

        $this->postJson("/api/v1/ai/conversations/{$conv->id}/messages", ['content' => '碳纤维板'])
            ->assertOk();

        $fb = AiFeedback::first();
        $this->assertNotNull($fb);
        $this->assertSame('bad', $fb->rating);
        $this->assertSame('auto_lowconf', $fb->source);
        $this->assertStringContainsString('0.30', $fb->reason);
        $this->assertStringContainsString('0.60', $fb->reason);
    }

    public function test_high_confidence_does_not_trigger(): void
    {
        config()->set('services.ai.lowconf_threshold', 0.6);
        [$u, $conv] = $this->setupConv();
        $this->fakeAi(confidence: 0.9);

        $this->postJson("/api/v1/ai/conversations/{$conv->id}/messages", ['content' => '碳纤维板'])
            ->assertOk();

        $this->assertSame(0, AiFeedback::count());
    }

    public function test_threshold_zero_disables_feature(): void
    {
        config()->set('services.ai.lowconf_threshold', 0);
        [$u, $conv] = $this->setupConv();
        $this->fakeAi(confidence: 0.05);

        $this->postJson("/api/v1/ai/conversations/{$conv->id}/messages", ['content' => 'X'])
            ->assertOk();

        $this->assertSame(0, AiFeedback::count());
    }

    public function test_transfer_takes_priority_no_double_feedback(): void
    {
        config()->set('services.ai.lowconf_threshold', 0.6);
        [$u, $conv] = $this->setupConv();
        // 既触发转人工 又 confidence 低
        $this->fakeAi(confidence: 0.3, transfer: true);

        $this->postJson("/api/v1/ai/conversations/{$conv->id}/messages", ['content' => 'X'])
            ->assertOk();

        // 只入一条，source=auto_transfer
        $this->assertSame(1, AiFeedback::count());
        $this->assertSame('auto_transfer', AiFeedback::first()->source);
    }
}
