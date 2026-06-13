<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * iter-18 · 滑动续期
 *
 * 任何已认证请求，当 token 距离过期 < 30 分钟时：
 *   - 立刻签发一个新 token（旧的 revoke）
 *   - 通过 X-Refresh-Token / X-Refresh-Expires-In 响应头送给前端
 * 前端 axios 响应拦截器读到就 swap localStorage，下次请求换新 token。
 *
 * 好处：用户活跃时永远不会被强制踢登录；不活跃时按设计过期。
 */
class RotateTokenIfNearExpiry
{
    private const ROTATE_WHEN_REMAINING_MINUTES = 30;

    public function handle(Request $request, Closure $next): Response
    {
        /** @var \Symfony\Component\HttpFoundation\Response $response */
        $response = $next($request);

        $user = $request->user();
        $token = $user?->currentAccessToken();
        if (! $token || ! $token->id) return $response; // 没 token / 未登录 → 跳过

        $expiration = config('sanctum.expiration');
        if (! $expiration) return $response; // null 表示永不过期 → 不需要 rotate

        $expiresAt = $token->created_at->addMinutes((int) $expiration);
        $remainingMinutes = now()->diffInMinutes($expiresAt, false);
        if ($remainingMinutes <= 0 || $remainingMinutes > self::ROTATE_WHEN_REMAINING_MINUTES) {
            return $response;
        }

        // 临期 → 续一个新 token
        $token->delete();
        $newPlain = $user->createToken('auth')->plainTextToken;

        $response->headers->set('X-Refresh-Token', $newPlain);
        $response->headers->set('X-Refresh-Expires-In', (string) ($expiration * 60));
        return $response;
    }
}
