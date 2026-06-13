<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 后端管理员保护 · iter-12
 *
 * 在 auth:sanctum 之后执行：用户已登录但 role != admin → 403。
 * 之前 admin 接口仅靠前端 router meta 拦，任何登录用户都能 curl 调到，本中间件兜底。
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || $user->role !== 'admin') {
            return response()->json([
                'code' => 403,
                'message' => '需要管理员权限',
                'data' => null,
            ], 403);
        }
        return $next($request);
    }
}
