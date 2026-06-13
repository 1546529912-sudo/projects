<?php

namespace App\Services;

use App\Models\Demo;
use App\Support\HtmlExtractor;
use Illuminate\Support\Facades\DB;
use Throwable;

class DemoRegenerationService
{
    public function __construct(
        private DeepSeekClient $client,
    ) {}

    /**
     * Append a new version to an existing demo from a fresh prompt (full regenerate).
     */
    public function regenerate(
        Demo $demo,
        string $prompt,
        ?string $model = null,
        ?callable $progress = null
    ): Demo
    {
        $notice = null;
        $html = null;
        $demoLabel = 'demo_'.$demo->id;
        $selectedModel = $model ?: ($demo->model ?: (string) config('services.deepseek.model'));
        if ($progress) {
            $progress('info', '开始为 Demo #'.$demo->id.' 追加新版本。');
        }

        try {
            if (config('services.deepseek.key')) {
                if ($progress) {
                    $progress('info', '已检测到 DEEPSEEK_API_KEY，准备重新生成 HTML。');
                }
                $raw = $this->client->generateHtmlFromPrompt($prompt, $selectedModel, $progress);
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

        return DB::transaction(function () use ($demo, $html, $prompt, $notice, $progress, $selectedModel) {
            $nextNo = (int) $demo->versions()->max('version_no') + 1;

            $version = $demo->versions()->create([
                'version_no' => $nextNo,
                'html_code' => $html,
                'model' => $selectedModel,
                'source_type' => 'regenerate',
                'prompt' => $prompt,
            ]);

            $demo->update([
                'current_version_id' => $version->id,
                'prompt' => $prompt,
                'model' => $selectedModel,
            ]);
            if ($progress) {
                $progress('success', '已保存版本 v'.$nextNo.'，并更新当前预览。');
            }

            if ($notice) {
                session()->flash('generation_notice', $notice);
            }

            if ($progress) {
                $progress('success', 'Demo 重新生成完成。');
            }

            return $demo->fresh(['currentVersion']);
        });
    }
}
