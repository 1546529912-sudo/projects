<?php
return [
    'default' => 'mysql',
    'connections' => [
        'mysql' => [
            'type'        => 'mysql',
            'hostname'    => env('MYSQL_HOST', '127.0.0.1'),
            'database'    => env('DB_DATABASE', env('WMS_DB', 'wms_db')),
            'username'    => env('MYSQL_USERNAME', 'root'),
            'password'    => env('MYSQL_PASSWORD', 'root'),
            'hostport'    => env('MYSQL_PORT', '3306'),
            'charset'     => 'utf8mb4',
            'prefix'      => '',
            'deploy'      => 0,
            'rw_separate' => false,
            'master_num'  => 1,
            'slave_no'    => '',
            'fields_strict' => true,
            'trigger_sql' => env('APP_DEBUG', false),
            'schema_cache_path' => app()->getRuntimePath() . 'schema' . DIRECTORY_SEPARATOR,
        ],
        // iter-24 P1-2: oms_db 副连接（库存对账只读）
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
    ],
];
