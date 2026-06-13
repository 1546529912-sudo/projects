<?php
return [
    'default' => 'mysql',
    'connections' => [
        'mysql' => [
            'type'        => 'mysql',
            'hostname'    => env('MYSQL_HOST', '127.0.0.1'),
            'database'    => env('DB_DATABASE', env('OMS_DB', 'oms_db')),
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
        // iter-20: shop_db 副连接（后台审核评价用，只读）
        'shop' => [
            'type'        => 'mysql',
            'hostname'    => env('MYSQL_HOST', '127.0.0.1'),
            'database'    => env('SHOP_DB', 'shop_db'),
            'username'    => env('MYSQL_USERNAME', 'root'),
            'password'    => env('MYSQL_PASSWORD', 'root'),
            'hostport'    => env('MYSQL_PORT', '3306'),
            'charset'     => 'utf8mb4',
            'prefix'      => '',
            'fields_strict' => true,
        ],
        // iter-26: wms_db 副连接（OMS 视角库存对账只读）
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
        // iter-34: pim_db 副连接（换货时拉新 SKU 快照只读）
        'pim' => [
            'type'        => 'mysql',
            'hostname'    => env('MYSQL_HOST', '127.0.0.1'),
            'database'    => env('PIM_DB', 'pim_db'),
            'username'    => env('MYSQL_USERNAME', 'root'),
            'password'    => env('MYSQL_PASSWORD', 'root'),
            'hostport'    => env('MYSQL_PORT', '3306'),
            'charset'     => 'utf8mb4',
            'prefix'      => '',
            'fields_strict' => true,
        ],
    ],
];
