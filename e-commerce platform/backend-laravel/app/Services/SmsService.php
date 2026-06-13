<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * 短信服务 Stub
 *
 * 第一期：本地/测试环境写日志，生产环境对接阿里云短信。
 */
class SmsService
{
    public function send(string $phone, string $code): bool
    {
        if (app()->environment(['local', 'testing'])) {
            Log::info('[SMS-DEV] send code', ['phone' => $phone, 'code' => $code]);
            return true;
        }

        // TODO: 接入阿里云短信 SDK
        return true;
    }
}
