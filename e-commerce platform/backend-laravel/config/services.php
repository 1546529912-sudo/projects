<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'ai' => [
        'url' => env('AI_SERVICE_URL', 'http://127.0.0.1:8001'),
        'timeout' => env('AI_SERVICE_TIMEOUT', 10),
        // iter-16：AI 自评 confidence < 此值时自动入 bad case（source=auto_lowconf）
        // null/0 表示禁用
        'lowconf_threshold' => env('AI_LOWCONF_THRESHOLD', 0.6),
    ],

    'webhook' => [
        'stock_alert_url' => env('STOCK_ALERT_WEBHOOK_URL'),
        // iter-24：新设备登录通知；未配置 → mock_only（日志），配置后真实推送
        'auth_new_device_url' => env('AUTH_NEW_DEVICE_WEBHOOK_URL'),
    ],

];
