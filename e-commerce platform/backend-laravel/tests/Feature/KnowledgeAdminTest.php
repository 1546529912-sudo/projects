<?php

namespace Tests\Feature;

use App\Models\KnowledgeBase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class KnowledgeAdminTest extends TestCase
{
    use RefreshDatabase;

    private function loginAdmin(): User
    {
        $u = User::create([
            'phone' => '13800138900', 'role' => 'admin',
            'active_role' => 'individual', 'status' => 'active',
        ]);
        Sanctum::actingAs($u);
        return $u;
    }

    public function test_create_knowledge(): void
    {
        $this->loginAdmin();
        $r = $this->postJson('/api/v1/admin/knowledge', [
            'title' => 'T700 板密度',
            'content' => '1.78 g/cm³',
            'category' => '产品参数',
            'keywords' => 'T700,密度',
            'source' => '规格书 v2',
        ]);
        $r->assertOk();
        $this->assertDatabaseHas('knowledge_base', ['title' => 'T700 板密度', 'status' => 'active']);
    }

    public function test_create_rejects_missing_required(): void
    {
        $this->loginAdmin();
        $r = $this->postJson('/api/v1/admin/knowledge', ['title' => '缺内容']);
        $r->assertStatus(422);
    }

    public function test_list_knowledge(): void
    {
        $this->loginAdmin();
        KnowledgeBase::create(['title' => 'A', 'content' => 'aa', 'category' => '产品参数', 'status' => 'active']);
        KnowledgeBase::create(['title' => 'B', 'content' => 'bb', 'category' => '物流', 'status' => 'active']);
        $r = $this->getJson('/api/v1/admin/knowledge');
        $r->assertOk();
        $this->assertEquals(2, $r->json('data.total'));
    }

    public function test_update_knowledge(): void
    {
        $this->loginAdmin();
        $kb = KnowledgeBase::create(['title' => 'A', 'content' => 'aa', 'category' => '产品参数', 'status' => 'active']);
        $r = $this->putJson("/api/v1/admin/knowledge/{$kb->id}", ['content' => 'updated']);
        $r->assertOk();
        $this->assertDatabaseHas('knowledge_base', ['id' => $kb->id, 'content' => 'updated']);
    }

    public function test_toggle_status(): void
    {
        $this->loginAdmin();
        $kb = KnowledgeBase::create(['title' => 'A', 'content' => 'aa', 'category' => '产品参数', 'status' => 'active']);
        $r = $this->postJson("/api/v1/admin/knowledge/{$kb->id}/toggle");
        $r->assertOk();
        $this->assertDatabaseHas('knowledge_base', ['id' => $kb->id, 'status' => 'disabled']);
    }

    public function test_delete_knowledge(): void
    {
        $this->loginAdmin();
        $kb = KnowledgeBase::create(['title' => 'A', 'content' => 'aa', 'category' => '产品参数', 'status' => 'active']);
        $this->deleteJson("/api/v1/admin/knowledge/{$kb->id}")->assertOk();
        $this->assertDatabaseMissing('knowledge_base', ['id' => $kb->id]);
    }
}
