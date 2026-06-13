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
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'deepseek' => [
        'key' => env('DEEPSEEK_API_KEY'),
        'base' => env('DEEPSEEK_API_BASE', 'https://api.deepseek.com/v1'),
        'model' => env('DEEPSEEK_MODEL', 'deepseek-v4-flash'),
        'models' => [
            'deepseek-v4-flash',
            'deepseek-v4-pro',
        ],
        /** Cap output length to speed up API (smaller HTML); omit or leave empty for provider default. */
        'max_tokens' => env('DEEPSEEK_MAX_TOKENS'),
        'timeout' => (int) env('DEEPSEEK_HTTP_TIMEOUT', 300),
    ],

];
