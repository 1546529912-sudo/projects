<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AdminAuthService;
use think\Request;
use think\Response;

/**
 * 后台管理员登录 / 获取当前用户（iter-16）
 */
class AdminAuth
{
    private AdminAuthService $svc;
    public function __construct() { $this->svc = new AdminAuthService(); }

    /**
     * POST /api/v1/admin/login
     * body: { username, password }
     */
    public function login(Request $request): Response
    {
        $username = trim((string)$request->param('username'));
        $password = (string)$request->param('password');
        if (!$username || !$password) return $this->err(400, 'username/password 必传');
        try {
            return $this->ok($this->svc->login($username, $password));
        } catch (\Throwable $e) {
            return $this->err(401, $e->getMessage());
        }
    }

    /**
     * GET /api/v1/admin/me
     * 验证当前 token + 返回用户信息（AdminAuth middleware 会注入 request->admin）
     */
    public function me(Request $request): Response
    {
        $admin = $request->admin ?? null;
        if (!$admin) return $this->err(401, '未登录');
        $info = $this->svc->me((int)$admin['sub']);
        if (!$info) return $this->err(401, '用户不存在');
        return $this->ok($info);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
