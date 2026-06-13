<?php
return [
    'default' => 'redis',
    'stores' => [
        'redis' => [
            'type'   => 'redis',
            'host'   => env('REDIS_HOST', '127.0.0.1'),
            'port'   => env('REDIS_PORT', 6379),
            'select' => 2,
            'prefix' => 'oms:',
        ],
    ],
];
