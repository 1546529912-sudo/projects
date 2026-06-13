<?php

namespace App\Services;

use App\Models\Demo;
use App\Support\HtmlExtractor;
use Illuminate\Support\Facades\DB;
use Throwable;

class DemoGenerationService
{
    public function __construct(
        private DeepSeekClient $client,
        private RequirementScopeService $scopeService,
    ) {}

    /**
     * Create a demo with version 1. Uses DeepSeek when key is set; otherwise sample HTML.
     * Sets session flash `generation_notice` on fallback or parse failure.
     */
    public function createInitialDemo(
        ?string $title,
        string $prompt,
        ?string $model = null,
        ?callable $progress = null
    ): Demo
    {
        $notice = null;
        $html = null;
        $selectedModel = $model ?: (string) config('services.deepseek.model');
        $scope = $this->scopeService->analyze($prompt, $selectedModel, $progress);
        if ($progress) {
            $progress('info', '开始创建 Demo 记录。');
        }

        $demo = Demo::create([
            'title' => $title,
            'prompt' => $prompt,
            'model' => $selectedModel,
            'requirement_scope_json' => $scope,
        ]);
        if ($progress) {
            $progress('info', '已创建 Demo #'.$demo->id.'。');
        }

        $demoLabel = 'demo_'.$demo->id;

        try {
            if (config('services.deepseek.key')) {
                if ($progress) {
                    $progress('info', '已检测到 DEEPSEEK_API_KEY，准备生成 HTML。');
                }
                $raw = $this->client->generateHtmlFromPrompt(
                    $prompt."\n\n".$this->scopeService->buildGenerationContract($scope),
                    $selectedModel,
                    $progress
                );
                if ($progress) {
                    $progress('info', '开始解析模型返回内容。');
                }
                $html = HtmlExtractor::fromModelResponse($raw) ?: (trim($raw) !== '' ? trim($raw) : null);
                if ($html === null) {
                    $notice = '模型返回无法解析为 HTML，已改用离线示例。';
                    if ($progress) {
                        $progress('warning', $notice);
                    }
                } else {
                    if ($progress) {
                        $progress('success', '模型输出已解析为完整 HTML。');
                    }
                }
            } else {
                $notice = '未配置 DEEPSEEK_API_KEY，已使用离线示例 HTML。';
                if ($progress) {
                    $progress('warning', $notice);
                }
            }
        } catch (Throwable $e) {
            report($e);
            $notice = '模型调用失败：'.$e->getMessage().'（已改用离线示例）';
            if ($progress) {
                $progress('error', $notice);
            }
        }

        if ($html === null) {
            if ($progress) {
                $progress('info', '正在写入离线示例 HTML。');
            }
            $html = SampleDemoHtml::make($demoLabel);
        }

        return DB::transaction(function () use ($demo, $html, $notice, $progress, $selectedModel) {
            $version = $demo->versions()->create([
                'version_no' => 1,
                'html_code' => $html,
                'model' => $selectedModel,
                'source_type' => 'initial_generate',
                'prompt' => $demo->prompt,
            ]);

            $demo->update(['current_version_id' => $version->id]);
            if ($progress) {
                $progress('success', '已保存版本 v1，并更新当前预览。');
            }

            if ($notice) {
                session()->flash('generation_notice', $notice);
            }

            if ($progress) {
                $progress('success', 'Demo 生成完成。');
            }

            return $demo->fresh(['currentVersion']);
        });
    }

    public function createInitialDraftDemo(
        ?string $title,
        string $prompt,
        ?string $model = null,
        ?callable $progress = null
    ): Demo {
        $selectedModel = $model ?: (string) config('services.deepseek.model');
        $scope = $this->scopeService->analyze($prompt, $selectedModel, $progress);
        $notice = null;
        $demo = Demo::create([
            'title' => $title,
            'prompt' => $prompt,
            'model' => $selectedModel,
            'requirement_scope_json' => $scope,
        ]);

        if ($progress) {
            $progress('info', '开始创建 Demo 记录。');
            $progress('info', '已创建 Demo #'.$demo->id.'。');
        }

        $draftHtml = null;
        try {
            if (config('services.deepseek.key')) {
                if ($progress) {
                    $progress('info', '进入第一阶段：快速生成可预览草稿。');
                }
                $raw = $this->client->generateDraftHtmlFromPrompt(
                    $prompt."\n\n".$this->scopeService->buildGenerationContract($scope),
                    $selectedModel,
                    $progress
                );
                if ($progress) {
                    $progress('info', '开始解析首阶段草稿内容。');
                }
                $draftHtml = HtmlExtractor::fromModelResponse($raw) ?: (trim($raw) !== '' ? trim($raw) : null);
                if ($draftHtml === null) {
                    $notice = '草稿无法解析为 HTML，已改用离线示例。';
                    if ($progress) {
                        $progress('warning', $notice);
                    }
                } elseif ($progress) {
                    $progress('success', '草稿 HTML 已生成，可先进入预览。');
                }
            } else {
                $notice = '未配置 DEEPSEEK_API_KEY，已使用离线示例 HTML。';
                if ($progress) {
                    $progress('warning', $notice);
                }
            }
        } catch (Throwable $e) {
            report($e);
            $notice = '草稿生成失败：'.$e->getMessage().'（已改用离线示例）';
            if ($progress) {
                $progress('error', $notice);
            }
        }

        if ($draftHtml === null) {
            if ($progress) {
                $progress('info', '正在写入离线示例 HTML。');
            }
            $draftHtml = SampleDemoHtml::make('demo_'.$demo->id);
        }

        return DB::transaction(function () use ($demo, $draftHtml, $notice, $progress, $selectedModel) {
            $version = $demo->versions()->create([
                'version_no' => 1,
                'html_code' => $draftHtml,
                'model' => $selectedModel,
                'source_type' => 'initial_generate',
                'prompt' => $demo->prompt,
            ]);

            $demo->update(['current_version_id' => $version->id]);
            if ($notice) {
                session()->flash('generation_notice', $notice);
            }
            if ($progress) {
                $progress('success', '已保存草稿版本 v1，并更新当前预览。');
            }

            return $demo->fresh(['currentVersion']);
        });
    }

    public function refineInitialDraftDemo(Demo $demo, ?callable $progress = null): Demo
    {
        $demo->loadMissing('currentVersion');
        $selectedModel = $demo->model ?: (string) config('services.deepseek.model');
        $scope = is_array($demo->requirement_scope_json) && $demo->requirement_scope_json !== []
            ? $demo->requirement_scope_json
            : $this->scopeService->analyze($demo->prompt, $selectedModel, $progress);
        $currentHtml = $demo->currentVersion?->html_code;
        if (! $currentHtml) {
            throw new \RuntimeException('当前草稿 HTML 不存在。');
        }

        if (! $demo->requirement_scope_json) {
            $demo->update(['requirement_scope_json' => $scope]);
        }

        if ($progress) {
            $progress('info', '进入第二阶段：细化草稿并补全更多内容。');
        }

        $raw = $this->client->refineHtmlFromDraft(
            $demo->prompt."\n\n".$this->scopeService->buildGenerationContract($scope),
            $currentHtml,
            $selectedModel,
            $progress
        );

        if ($progress) {
            $progress('info', '开始解析第二阶段输出。');
        }

        $refinedHtml = HtmlExtractor::fromModelResponse($raw) ?: (trim($raw) !== '' ? trim($raw) : null);
        if ($refinedHtml === null) {
            throw new \RuntimeException('细化阶段未返回可用 HTML。');
        }

        return DB::transaction(function () use ($demo, $refinedHtml, $selectedModel, $progress) {
            $version = $demo->currentVersion;
            $version->update([
                'html_code' => $refinedHtml,
                'model' => $selectedModel,
                'source_type' => 'initial_generate',
                'prompt' => $demo->prompt,
            ]);

            if ($progress) {
                $progress('success', '已用细化结果更新当前版本，预览将自动刷新。');
            }

            return $demo->fresh(['currentVersion']);
        });
    }
}
