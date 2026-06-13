<?php
return [
    'app_name'         => 'pim-backend',
    'app_host'         => env('APP_HOST', ''),
    'app_namespace'    => '',
    'app_express'      => false,
    'with_route'       => true,
    'default_app'      => 'api',
    'default_timezone' => 'Asia/Shanghai',
    'error_message'    => '系统繁忙，请稍后再试',
    'show_error_msg'   => env('APP_DEBUG', false),
];
