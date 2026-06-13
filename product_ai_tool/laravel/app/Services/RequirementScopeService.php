<?php

namespace App\Services;

use App\Support\JsonExtractor;
use Throwable;

class RequirementScopeService
{
    private const SYSTEM = <<<'PROMPT'
You are a product scope guard for an HTML demo generator.

Your job is to preserve the user's explicit requirements while preventing extra expansion.

Rules:
- Keep as many explicit user requirements as possible.
- Do not remove explicit requirements.
- Do not add extra features, modules, sections, or flows that the user did not ask for.
- Only include minimal inferred modules if they are strictly necessary for the explicit requirements to make sense.
- If uncertain whether something is necessary, leave it out.

Return valid JSON only in this shape:
{
  "product_type": "string",
  "pages": ["string"],
  "explicit_modules": ["string"],
  "explicit_interactions": ["string"],
  "minimal_inferred_modules": ["string"],
  "style_keywords": ["string"],
  "content_constraints": ["string"],
  "disallowed_expansions": ["string"],
  "generation_mode": "strict"
}

Constraints:
- generation_mode must always be "strict"
- minimal_inferred_modules should usually be 0-4 items
- disallowed_expansions must be dynamic based on what the user did not ask for
PROMPT;

    public function __construct(
        private DeepSeekClient $client,
    ) {}

    public function analyze(string $prompt, ?string $model = null, ?callable $progress = null): array
    {
        if ($progress) {
            $progress('info', '开始解析需求边界，限制模型额外扩展。');
        }

        try {
            $raw = $this->client->complete(
                self::SYSTEM,
                "User requirement:\n{$prompt}\n\nExtract the strict generation scope now.",
                0.1,
                $model
            );

            $parsed = JsonExtractor::fromModelResponse($raw);
            if (is_array($parsed)) {
                $scope = $this->normalizeScope($parsed);
                if ($progress) {
                    $this->reportScope($scope, $progress);
                }
                return $scope;
            }
        } catch (Throwable $e) {
            report($e);
            if ($progress) {
                $progress('warning', '需求边界解析失败，已回退到保守模式。');
            }
        }

        $scope = $this->fallbackScope($prompt);
        if ($progress) {
            $this->reportScope($scope, $progress);
        }

        return $scope;
    }

    public function buildGenerationContract(array $scope): string
    {
        $json = json_encode($scope, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

        return <<<TXT
Strict scope contract:
{$json}

Mandatory execution rules:
- Preserve all explicit requirements from the user.
- Only implement modules from "explicit_modules" plus "minimal_inferred_modules".
- Only implement interactions from "explicit_interactions".
- Do not add any modules, sections, tabs, views, or business flows outside the scope contract.
- Treat "disallowed_expansions" as forbidden.
- If uncertain, choose the smaller implementation.
TXT;
    }

    private function normalizeScope(array $scope): array
    {
        $normalized = [
            'product_type' => $this->stringValue($scope['product_type'] ?? '') ?: 'general_demo',
            'pages' => $this->stringList($scope['pages'] ?? []),
            'explicit_modules' => $this->stringList($scope['explicit_modules'] ?? []),
            'explicit_interactions' => $this->stringList($scope['explicit_interactions'] ?? []),
            'minimal_inferred_modules' => array_slice($this->stringList($scope['minimal_inferred_modules'] ?? []), 0, 4),
            'style_keywords' => $this->stringList($scope['style_keywords'] ?? []),
            'content_constraints' => $this->stringList($scope['content_constraints'] ?? []),
            'disallowed_expansions' => $this->stringList($scope['disallowed_expansions'] ?? []),
            'generation_mode' => 'strict',
        ];

        if ($normalized['pages'] === []) {
            $normalized['pages'] = ['单页'];
        }
        if ($normalized['explicit_modules'] === []) {
            $normalized['explicit_modules'] = ['按用户原始需求实现核心内容'];
        }
        if ($normalized['content_constraints'] === []) {
            $normalized['content_constraints'] = [
                '严格按用户原始需求实现',
                '不要扩展未被明确要求的模块',
            ];
        }
        if ($normalized['disallowed_expansions'] === []) {
            $normalized['disallowed_expansions'] = [
                '任何未被明确要求的额外内容',
            ];
        }

        return $normalized;
    }

    private function fallbackScope(string $prompt): array
    {
        return [
            'product_type' => 'general_demo',
            'pages' => ['单页'],
            'explicit_modules' => ['按用户原始需求实现核心内容'],
            'explicit_interactions' => [],
            'minimal_inferred_modules' => [],
            'style_keywords' => [],
            'content_constraints' => [
                '严格按用户原始需求实现',
                '不要扩展未被明确要求的模块',
                '如果不确定是否需要某模块，则不要添加',
            ],
            'disallowed_expansions' => [
                '任何未被明确要求的额外内容',
            ],
            'generation_mode' => 'strict',
            'raw_prompt' => $prompt,
        ];
    }

    private function reportScope(array $scope, callable $progress): void
    {
        $pages = implode(' / ', array_slice($scope['pages'], 0, 5));
        $modules = implode(' / ', array_slice($scope['explicit_modules'], 0, 6));
        $interactions = implode(' / ', array_slice($scope['explicit_interactions'], 0, 6));

        $progress('info', '已识别页面：'.($pages !== '' ? $pages : '单页'));
        $progress('info', '已识别明确模块：'.($modules !== '' ? $modules : '按核心需求实现'));
        if ($interactions !== '') {
            $progress('info', '已识别明确交互：'.$interactions);
        }
    }

    private function stringList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $items = [];
        foreach ($value as $item) {
            $string = $this->stringValue($item);
            if ($string !== '') {
                $items[] = $string;
            }
        }

        return array_values(array_unique($items));
    }

    private function stringValue(mixed $value): string
    {
        return is_string($value) ? trim($value) : '';
    }
}
