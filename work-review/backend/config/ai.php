<?php

return [
    'provider' => env('AI_PROVIDER', 'mock'),
    'api_key' => env('DEEPSEEK_API_KEY', ''),
    'base_url' => env('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1'),
    'model' => env('DEEPSEEK_MODEL', 'deepseek-chat'),

    'openai_api_key' => env('OPENAI_API_KEY', ''),
    'openai_model' => env('OPENAI_MODEL', 'gpt-4o'),

    'asr_provider' => env('ASR_PROVIDER', 'mock'),
    'tencent_secret_id' => env('TENCENT_SECRET_ID', ''),
    'tencent_secret_key' => env('TENCENT_SECRET_KEY', ''),

    'max_audio_size_mb' => env('MAX_AUDIO_SIZE_MB', 10),
    'timeout_seconds' => 30,
    'max_retries' => 3,
];
