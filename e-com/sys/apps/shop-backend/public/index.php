<?php
// [ 应用入口文件 ]
namespace think;

require __DIR__ . '/../vendor/autoload.php';

// 执行 HTTP 应用
$http = (new App())->http;

$response = $http->run();

$response->send();

$http->end($response);
