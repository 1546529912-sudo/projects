<?php
return [
    'default' => env('DB_TYPE', 'mysql'),
    'connections' => [
        'mysql' => [
            'type'        => 'mysql',
            'hostname'    => env('MYSQL_HOST', '127.0.0.1'),
            'database'    => env('DB_DATABASE', env('PIM_DB', 'pim_db')),
            'username'    => env('MYSQL_USERNAME', 'root'),
            'password'    => env('MYSQL_PASSWORD', 'root'),
            'hostport'    => env('MYSQL_PORT', '3306'),
            'charset'     => 'utf8mb4',
            'prefix'      => '',
            'deploy'      => 0,
            'fields_strict' => true,
            'trigger_sql' => env('APP_DEBUG', false),
            'schema_cache_path' => app()->getRuntimePath() . 'schema' . DIRECTORY_SEPARATOR,
        ],
        // iter-29: oms_db 副连接（PIM Dashboard 销售热度只读）
        'oms' => [
            'type'        => 'mysql',
            'hostname'    => env('MYSQL_HOST', '127.0.0.1'),
            'database'    => env('OMS_DB', 'oms_db'),
            'username'    => env('MYSQL_USERNAME', 'root'),
            'password'    => env('MYSQL_PASSWORD', 'root'),
            'hostport'    => env('MYSQL_PORT', '3306'),
            'charset'     => 'utf8mb4',
            'prefix'      => '',
            'fields_strict' => true,
        ],
        // iter-29: wms_db 副连接（PIM Dashboard 库存覆盖只读）
        'wms' => [
            'type'        => 'mysql',
            'hostname'    => env('MYSQL_HOST', '127.0.0.1'),
            'database'    => env('WMS_DB', 'wms_db'),
            'username'    => env('MYSQL_USERNAME', 'root'),
            'password'    => env('MYSQL_PASSWORD', 'root'),
            'hostport'    => env('MYSQL_PORT', '3306'),
            'charset'     => 'utf8mb4',
            'prefix'      => '',
            'fields_strict' => true,
        ],
    ],
];
