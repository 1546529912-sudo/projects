<?php
// shop-backend · 缓存配置
return [
    'default' => env('CACHE_DRIVER', 'redis'),
    'stores' => [
        'redis' => [
            'type'       => 'redis',
            'host'       => env('REDIS_HOST', '127.0.0.1'),
            'port'       => env('REDIS_PORT', 6379),
            'password'   => env('REDIS_PASSWORD', ''),
            'select'     => 0,
            'timeout'    => 0,
            'expire'     => 0,
            'persistent' => false,
            'prefix'     => 'shop:',
        ],
        'file' => [
            'type'   => 'file',
            'path'   => '',
            'prefix' => '',
            'expire' => 0,
        ],
    ],
];
