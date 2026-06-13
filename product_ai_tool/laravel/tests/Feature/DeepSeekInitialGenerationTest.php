<?php

namespace Tests\Feature;

use App\Services\DemoGenerationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DeepSeekInitialGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_initial_demo_calls_deepseek_when_api_key_configured(): void
    {
        config(['services.deepseek.key' => 'sk-test']);
        config(['services.deepseek.base' => 'https://api.deepseek.com/v1']);
        config(['services.deepseek.model' => 'deepseek-v4-flash']);

        Http::fake([
            'https://api.deepseek.com/v1/chat/completions' => Http::sequence()
                ->push([
                    'choices' => [
                        ['message' => [
                            'content' => json_encode([
                                'product_type' => 'general_demo',
                                'pages' => ['单页'],
                                'explicit_modules' => ['按钮'],
                                'explicit_interactions' => ['点击'],
                                'minimal_inferred_modules' => [],
                                'style_keywords' => [],
                                'content_constraints' => ['不要扩展未被明确要求的模块'],
                                'disallowed_expansions' => ['任何未被明确要求的额外内容'],
                                'generation_mode' => 'strict',
                            ], JSON_UNESCAPED_UNICODE),
                        ]],
                    ],
                ], 200)
                ->push([
                    'choices' => [
                        ['message' => [
                            'content' => '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>from-model</body></html>',
                        ]],
                    ],
                ], 200),
        ]);

        $demo = app(DemoGenerationService::class)->createInitialDemo('标题', '生成一个按钮', 'deepseek-v4-flash');

        Http::assertSentCount(2);
        $this->assertStringContainsString('from-model', $demo->currentVersion->html_code);
        $this->assertSame('deepseek-v4-flash', $demo->model);
        $this->assertIsArray($demo->requirement_scope_json);
        $this->assertSame(['按钮'], $demo->requirement_scope_json['explicit_modules']);
    }

    public function test_create_initial_demo_reports_progress_messages(): void
    {
        config(['services.deepseek.key' => 'sk-test']);
        config(['services.deepseek.base' => 'https://api.deepseek.com/v1']);
        config(['services.deepseek.model' => 'deepseek-v4-flash']);

        Http::fake([
            'https://api.deepseek.com/v1/chat/completions' => Http::sequence()
                ->push([
                    'choices' => [
                        ['message' => [
                            'content' => json_encode([
                                'product_type' => 'general_demo',
                                'pages' => ['单页'],
                                'explicit_modules' => ['按钮'],
                                'explicit_interactions' => ['点击'],
                                'minimal_inferred_modules' => [],
                                'style_keywords' => [],
                                'content_constraints' => ['不要扩展未被明确要求的模块'],
                                'disallowed_expansions' => ['任何未被明确要求的额外内容'],
                                'generation_mode' => 'strict',
                            ], JSON_UNESCAPED_UNICODE),
                        ]],
                    ],
                ], 200)
                ->push([
                    'choices' => [
                        ['message' => [
                            'content' => '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>from-model</body></html>',
                        ]],
                    ],
                ], 200),
        ]);

        $logs = [];

        $demo = app(DemoGenerationService::class)->createInitialDemo(
            '标题',
            '生成一个按钮',
            'deepseek-v4-pro',
            function (string $level, string $message) use (&$logs): void {
                $logs[] = [$level, $message];
            }
        );

        $messages = array_map(fn (array $row) => $row[1], $logs);

        $this->assertNotEmpty($logs);
        $this->assertSame('deepseek-v4-pro', $demo->model);
        $this->assertSame('deepseek-v4-pro', $demo->currentVersion->model);
        $this->assertContains('开始解析需求边界，限制模型额外扩展。', $messages);
        $this->assertContains('已识别明确模块：按钮', $messages);
        $this->assertContains('开始创建 Demo 记录。', $messages);
        $this->assertContains('正在调用 DeepSeek 接口…', $messages);
        $this->assertContains('Demo 生成完成。', $messages);
    }
}
