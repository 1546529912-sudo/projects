<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ASRService
{
    private string $provider;

    public function __construct()
    {
        $this->provider = config('ai.asr_provider', 'mock');
    }

    public function transcribe(string $audioPath): string
    {
        if ($this->provider === 'mock') {
            return $this->mockTranscribe();
        }

        return match ($this->provider) {
            'tencent' => $this->tencentASR($audioPath),
            default => throw new \InvalidArgumentException('不支持的 ASR 服务：' . $this->provider),
        };
    }

    private function tencentASR(string $audioPath): string
    {
        // TODO: 接入腾讯云语音识别 SDK
        // 文档：https://cloud.tencent.com/document/product/1093
        // 当前为 stub，Phase 3 实现
        throw new \RuntimeException('腾讯云 ASR 暂未实现，请使用 mock 模式');
    }

    private function mockTranscribe(): string
    {
        return '今天完成了项目初始化工作，搭建了后端 Laravel 框架和微信小程序骨架，配置了数据库连接，实现了健康检查接口。明天计划接入 AI 服务。（Mock 转写结果）';
    }
}
