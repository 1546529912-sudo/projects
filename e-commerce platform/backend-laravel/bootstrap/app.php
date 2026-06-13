<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        // 每分钟扫一次超时未支付订单
        $schedule->command('orders:cancel-stale --minutes=30')->everyMinute();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role.admin' => \App\Http\Middleware\EnsureAdmin::class,
            'rotate.token' => \App\Http\Middleware\RotateTokenIfNearExpiry::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API 路由（/api/*）统一返回 JSON 错误，未登录返回 401
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'code' => 401,
                    'message' => '请先登录',
                    'data' => null,
                ], 401);
            }
        });
    })->create();
