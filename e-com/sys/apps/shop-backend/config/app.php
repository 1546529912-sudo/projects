<?php
// shop-backend · 应用配置
return [
    'app_name'         => 'shop-backend',
    'app_host'         => env('APP_HOST', ''),
    'app_namespace'    => '',
    'app_express'      => false,
    'with_route'       => true,
    'default_app'      => 'api',
    'default_timezone' => 'Asia/Shanghai',
    'app_map'          => [],
    'domain_bind'      => [],
    'deny_app_list'    => [],
    'error_message'    => '系统繁忙，请稍后再试',
    'show_error_msg'   => env('APP_DEBUG', false),
];
