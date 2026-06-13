<?php
declare(strict_types=1);

namespace app\middleware;

use app\service\JwtService;
use Closure;
use think\Request;
use think\Response;

/**
 * 从 Authorization: Bearer <jwt> 取 user_id 注入 request->user_id
 */
class Auth
{
    public function handle(Request $request, Closure $next): Response
    {
        // TP8 中间件阶段 $request->header() 读不到 nginx fastcgi_param 传入的 HTTP_AUTHORIZATION，
        // 直接 fallback 到 $_SERVER。
        $auth = $request->header('Authorization')
            ?: ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
        if (!str_starts_with($auth, 'Bearer ')) {
            return json(['code' => 401, 'msg' => '未登录', 'data' => null], 401);
        }
        $token = substr($auth, 7);
        $jwt = new JwtService();
        $payload = $jwt->verify($token);
        if (!$payload || empty($payload['sub'])) {
            return json(['code' => 401, 'msg' => 'token 无效或过期', 'data' => null], 401);
        }
        $request->user_id = (int)$payload['sub'];
        return $next($request);
    }
}
