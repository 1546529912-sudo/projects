<?php
// shop-backend · 数据库配置
//   主连接 mysql → shop_db（用户/购物车/订单镜像）
//   副连接 oms   → oms_db（优惠券模板/已领券；iter-19 跨库读写）
return [
    'default' => env('DB_TYPE', 'mysql'),
    'connections' => [
        'mysql' => [
            'type'        => 'mysql',
            'hostname'    => env('MYSQL_HOST', '127.0.0.1'),
            'database'    => env('DB_DATABASE', env('SHOP_DB', 'shop_db')),
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
            'fields_cache'  => false,
            'schema_cache_path' => app()->getRuntimePath() . 'schema' . DIRECTORY_SEPARATOR,
        ],
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
            'fields_cache'  => false,
        ],
    ],
];
