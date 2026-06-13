<?php
declare(strict_types=1);

namespace app\middleware;

use app\service\AdminTokenService;
use app\service\StoreContextService;
use Closure;
use think\Request;
use think\Response;

/**
 * PIM 后台 admin 认证中间件（iter-17）
 *
 * 用法：->middleware(\app\middleware\AdminAuth::class, ['super_admin', 'sales_ops'])
 *   - 解 Bearer JWT，注入 request->admin
 *   - 校验 role 在允许列表内（不传则任意 admin）
 *   - 失败返回 401 / 403
 */
class AdminAuth
{
    public function handle(Request $request, Closure $next, ...$allowedRoles): Response
    {
        $auth = (string)$request->header('Authorization', '');
        if (!str_starts_with($auth, 'Bearer ')) {
            return $this->err(401, '缺少 Bearer token');
        }
        $token = trim(substr($auth, 7));
        try {
            $payload = (new AdminTokenService())->verify($token);
        } catch (\Throwable $e) {
            return $this->err(401, $e->getMessage());
        }

        $role = (string)($payload['role'] ?? '');
        if ($allowedRoles && !in_array($role, $allowedRoles, true)) {
            return $this->err(403, "权限不足，需要角色: " . implode('/', $allowedRoles));
        }

        $request->admin = $payload;
        // iter-36 BIZ-08-2: 注入店铺上下文
        $request->store_ids = (new StoreContextService())->getStoreIds(
            (int)($payload['sub'] ?? 0),
            $role
        );
        return $next($request);
    }

    private function err(int $code, string $msg): Response
    {
        return json(['code' => $code, 'msg' => $msg, 'data' => null], $code);
    }
}
