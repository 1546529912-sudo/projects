<?php
declare(strict_types=1);

namespace app\middleware;

use app\service\AdminAuthService;
use app\service\StoreContextService;
use Closure;
use think\Request;
use think\Response;

/**
 * 后台 admin 认证中间件（iter-16；iter-35 增强店铺上下文）
 *   - 从 Authorization: Bearer <jwt> 解出 admin 信息
 *   - 注入 $request->admin = ['sub' => userId, 'role' => ..., 'username' => ..., 'name' => ...]
 *   - **iter-35** 注入 $request->store_ids：
 *       super_admin/sales_ops/warehouse = null（=跨店访问无限制）
 *       store_owner/store_staff = [关联 store_ids]
 *   - 失败返回 401
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
            $payload = (new AdminAuthService())->verify($token);
        } catch (\Throwable $e) {
            return $this->err(401, $e->getMessage());
        }
        // iter-58 M3-21 Token blacklist 校验（用户级全黑或单 token 精确黑）
        $sub = (int)($payload['sub'] ?? 0);
        $iat = (int)($payload['iat'] ?? 0);
        try {
            $row = \think\facade\Db::name('token_blacklist')
                ->whereIn('jti', ["{$sub}:*", "{$sub}:{$iat}"])
                ->where('blacklisted_until', '>=', date('Y-m-d H:i:s'))
                ->find();
            $hit = false;
            if ($row) {
                if (str_ends_with($row['jti'], ':*')) {
                    // 用户全黑：仅黑 blacklist 创建前签发的 token
                    $hit = $iat < strtotime($row['created_at']);
                } else {
                    $hit = true; // 精确单 token 黑
                }
            }
            if ($hit) return $this->err(401, 'token 已失效（' . ($row['reason'] ?? 'blacklisted') . '）');
        } catch (\Throwable $e) { /* table missing → 向后兼容 */ }
        $role = (string)($payload['role'] ?? '');
        if ($allowedRoles && !in_array($role, $allowedRoles, true)) {
            return $this->err(403, "权限不足，需要角色: " . implode('/', $allowedRoles));
        }
        $request->admin = $payload;
        // iter-35: 注入店铺上下文
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
