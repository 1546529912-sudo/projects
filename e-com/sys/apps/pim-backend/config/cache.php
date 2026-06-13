<?php
return [
    'default' => env('CACHE_DRIVER', 'redis'),
    'stores' => [
        'redis' => [
            'type'       => 'redis',
            'host'       => env('REDIS_HOST', '127.0.0.1'),
            'port'       => env('REDIS_PORT', 6379),
            'password'   => env('REDIS_PASSWORD', ''),
            'select'     => 1,
            'prefix'     => 'pim:',
        ],
    ],
];
