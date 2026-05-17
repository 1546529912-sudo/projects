<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\AILog;

class AIExtractService
{
    private string $provider;
    private string $model;
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->provider = config('ai.provider', 'mock');
        $this->model = config('ai.model', 'deepseek-chat');
        $this->apiKey = config('ai.api_key', '');
        $this->baseUrl = config('ai.base_url', '');
    }

    public function extract(string $text): array
    {
        if ($this->provider === 'mock') {
            return $this->mockExtract($text);
        }

        $prompt = $this->buildExtractPrompt($text);

        $startTime = microtime(true);
        $response = $this->callAI($prompt);
        $duration = (int)((microtime(true) - $startTime) * 1000);

        $result = $this->parseAndValidate($response['content']);

        $this->logAICall('extract', $prompt, $text, $response['content'], $duration, $response['tokens']);

        return $result;
    }

    public function splitProjects(string $text): array
    {
        if ($this->provider === 'mock') {
            return $this->mockSplit($text);
        }

        $prompt = $this->buildSplitPrompt($text);
        $response = $this->callAI($prompt);

        return $this->parseAndValidate($response['content']);
    }

    private function buildExtractPrompt(string $text): string
    {
        return <<<PROMPT
你是一个工作记录提取助手。请从以下工作描述中提取结构化信息。

工作描述：
{$text}

请以 JSON 格式返回，结构如下：
{
  "projects": [
    {
      "project_name": "项目名称",
      "actions": ["做了什么1", "做了什么2"],
      "outputs": ["产出了什么"],
      "problems": ["遇到什么问题"],
      "next_steps": ["下一步计划"]
    }
  ],
  "summary": "今日工作简要摘要",
  "tomorrow_focus": ["明日重点"]
}

要求：
1. project_name 和 actions 为必填
2. 如果文字中没有明确的项目，归入"日常工作"
3. 只返回 JSON，不要其他文字
PROMPT;
    }

    private function buildSplitPrompt(string $text): string
    {
        return <<<PROMPT
从以下文字中识别涉及的不同项目，每个项目单独列出。
文字：{$text}
以 JSON 数组格式返回项目名称列表：["项目A", "项目B"]
只返回 JSON 数组。
PROMPT;
    }

    private function callAI(string $prompt): array
    {
        $maxRetries = 3;
        $attempt = 0;

        while ($attempt < $maxRetries) {
            try {
                $response = Http::timeout(30)
                    ->withHeaders([
                        'Authorization' => 'Bearer ' . $this->apiKey,
                        'Content-Type' => 'application/json',
                    ])
                    ->post($this->baseUrl . '/chat/completions', [
                        'model' => $this->model,
                        'messages' => [
                            ['role' => 'user', 'content' => $prompt],
                        ],
                        'temperature' => 0.1,
                        'response_format' => ['type' => 'json_object'],
                    ]);

                if ($response->successful()) {
                    $body = $response->json();
                    return [
                        'content' => $body['choices'][0]['message']['content'],
                        'tokens' => $body['usage']['total_tokens'] ?? 0,
                    ];
                }

                $attempt++;
                if ($attempt < $maxRetries) {
                    sleep(pow(2, $attempt)); // 指数退避
                }
            } catch (\Exception $e) {
                $attempt++;
                if ($attempt >= $maxRetries) {
                    throw new \RuntimeException('AI 服务调用失败：' . $e->getMessage());
                }
                sleep(pow(2, $attempt));
            }
        }

        throw new \RuntimeException('AI 服务重试 ' . $maxRetries . ' 次后仍然失败');
    }

    private function parseAndValidate(string $content): array
    {
        $data = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException('AI 输出 JSON 解析失败：' . json_last_error_msg());
        }

        // Schema 校验：projects 必须存在
        if (!isset($data['projects']) || !is_array($data['projects'])) {
            throw new \RuntimeException('AI 输出 Schema 校验失败：缺少 projects 字段');
        }

        foreach ($data['projects'] as $project) {
            if (empty($project['project_name']) || empty($project['actions'])) {
                throw new \RuntimeException('AI 输出 Schema 校验失败：project 缺少必填字段');
            }
        }

        return $data;
    }

    private function logAICall(string $taskType, string $prompt, string $input, string $output, int $duration, int $tokens): void
    {
        try {
            AILog::create([
                'task_type' => $taskType,
                'model_name' => $this->model,
                'prompt_content' => $prompt,
                'input_content' => $input,
                'output_content' => $output,
                'is_success' => true,
                'duration_ms' => $duration,
                'token_usage' => $tokens,
            ]);
        } catch (\Exception $e) {
            Log::error('AI 日志写入失败', ['error' => $e->getMessage()]);
        }
    }

    // Mock 实现（AI 服务未接入时使用）
    private function mockExtract(string $text): array
    {
        return [
            'projects' => [
                [
                    'project_name' => '示例项目（Mock）',
                    'actions' => ['完成了工作记录功能开发', '调试了 AI 接口'],
                    'outputs' => ['可运行的代码骨架'],
                    'problems' => [],
                    'next_steps' => ['接入真实 AI 服务'],
                ],
            ],
            'summary' => '今日主要进行了项目初始化工作（Mock 数据）',
            'tomorrow_focus' => ['继续开发核心功能'],
        ];
    }

    private function mockSplit(string $text): array
    {
        return ['示例项目A（Mock）', '示例项目B（Mock）'];
    }
}
