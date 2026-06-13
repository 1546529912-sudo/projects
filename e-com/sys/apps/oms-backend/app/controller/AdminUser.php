<?php
declare(strict_types=1);

namespace app\controller;

use app\service\AdminAuthService;
use app\service\AuditService;
use think\Request;
use think\Response;

/**
 * admin 用户管理（iter-17）
 *
 * 仅 super_admin 可调用，路由层 middleware 强制
 */
class AdminUser
{
    private AdminAuthService $svc;
    public function __construct() { $this->svc = new AdminAuthService(); }

    public function list(Request $request): Response
    {
        $page = max(1, (int)$request->param('page', 1));
        $size = max(1, min(50, (int)$request->param('size', 20)));
        return $this->ok($this->svc->listUsers($page, $size));
    }

    public function create(Request $request): Response
    {
        $username = trim((string)$request->param('username'));
        $password = (string)$request->param('password');
        $name = trim((string)$request->param('name'));
        $role = (string)$request->param('role');
        if (!$username) return $this->err(400, 'username 必传');
        try {
            $u = $this->svc->createUser($username, $password, $name, $role);
            $this->audit($request, 'admin_user.create', (string)($u['id'] ?? ''), null, ['username' => $username, 'role' => $role]);
            return $this->ok($u);
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
    }

    public function update(Request $request, int $id): Response
    {
        $data = [];
        if ($request->has('name')) $data['name'] = (string)$request->param('name');
        if ($request->has('role')) $data['role'] = (string)$request->param('role');
        if ($request->has('status')) $data['status'] = (string)$request->param('status');
        try {
            $before = $this->svc->me($id);
            $after = $this->svc->updateUser($id, $data);
            $this->audit($request, 'admin_user.update', (string)$id, $before, $after);
            return $this->ok($after);
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
    }

    public function changePassword(Request $request, int $id): Response
    {
        $newPassword = (string)$request->param('new_password');
        if (!$newPassword) return $this->err(400, 'new_password 必传');
        try {
            $this->svc->changePassword($id, $newPassword);
            $this->audit($request, 'admin_user.change_password', (string)$id, null, null);
            // iter-58 M3-21 改密后旧 token 自动加黑（按 admin_user_id 范围广撒网）
            try {
                \think\facade\Db::name('token_blacklist')->insert([
                    'jti' => "$id:*",
                    'admin_user_id' => $id,
                    'reason' => 'password_changed',
                    'blacklisted_until' => date('Y-m-d H:i:s', time() + 86400 * 7),
                ]);
            } catch (\Throwable $e) {}
            return $this->ok(['id' => $id]);
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
    }

    public function delete(Request $request, int $id): Response
    {
        $currentId = (int)($request->admin['sub'] ?? 0);
        try {
            $before = $this->svc->me($id);
            $this->svc->deleteUser($id, $currentId);
            $this->audit($request, 'admin_user.delete', (string)$id, $before, null);
            return $this->ok(['id' => $id]);
        } catch (\Throwable $e) {
            return $this->err(409, $e->getMessage());
        }
    }

    private function audit(Request $request, string $action, string $targetId, ?array $before, ?array $after): void
    {
        $op = $request->admin['username'] ?? 'admin';
        AuditService::log($action, 'admin_user', $targetId, $before, $after, null, $op);
    }

    private function ok(mixed $data): Response { return json(['code' => 0, 'msg' => 'ok', 'data' => $data]); }
    private function err(int $code, string $msg): Response { return json(['code' => $code, 'msg' => $msg, 'data' => null]); }
}
