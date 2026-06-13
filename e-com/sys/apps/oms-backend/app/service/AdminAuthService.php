<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 后台管理员认证（iter-16）
 *   - login: 用户名 + 密码（bcrypt 验证）→ 签发 JWT
 *   - verify: 解 JWT 取 user_id / role
 *
 * JWT 用最小 HS256 实现，避开新增 composer 依赖（shop-backend 用 firebase/php-jwt，
 * 此处为零依赖路径）。
 */
class AdminAuthService
{
    private const TTL_SEC = 7 * 86400; // 7 天

    public function login(string $username, string $password): array
    {
        $user = Db::name('admin_users')->where('username', $username)->find();
        if (!$user || $user['status'] !== 'enabled') {
            throw new \RuntimeException('用户名或密码错误');
        }
        if (!password_verify($password, $user['password_hash'])) {
            throw new \RuntimeException('用户名或密码错误');
        }

        Db::name('admin_users')->where('id', $user['id'])->update(['last_login_at' => date('Y-m-d H:i:s')]);

        $token = $this->encode([
            'sub' => $user['id'],
            'username' => $user['username'],
            'name' => $user['name'],
            'role' => $user['role'],
            'iat' => time(),
            'exp' => time() + self::TTL_SEC,
        ]);
        return [
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'name' => $user['name'],
                'role' => $user['role'],
            ],
        ];
    }

    public function verify(string $token): array
    {
        $payload = $this->decode($token);
        if (!isset($payload['exp']) || $payload['exp'] < time()) {
            throw new \RuntimeException('token 已过期');
        }
        return $payload;
    }

    public function me(int $userId): ?array
    {
        $user = Db::name('admin_users')->where('id', $userId)->find();
        if (!$user) return null;
        return [
            'id' => $user['id'],
            'username' => $user['username'],
            'name' => $user['name'],
            'role' => $user['role'],
            'last_login_at' => $user['last_login_at'],
        ];
    }

    // --- 用户管理 CRUD（iter-17，仅 super_admin 可调用）---

    public function listUsers(int $page = 1, int $size = 20): array
    {
        $q = Db::name('admin_users');
        $total = (clone $q)->count();
        $rows = $q->order('id', 'asc')->page($page, $size)
            ->field('id, username, name, role, status, last_login_at, created_at')
            ->select()->toArray();
        return ['list' => $rows, 'total' => $total, 'page' => $page, 'size' => $size];
    }

    public function createUser(string $username, string $password, string $name, string $role): array
    {
        $this->validateRole($role);
        if (strlen($password) < 6) throw new \RuntimeException('密码至少 6 位');
        if (Db::name('admin_users')->where('username', $username)->find()) {
            throw new \RuntimeException('username 已存在: ' . $username);
        }
        $id = Db::name('admin_users')->insertGetId([
            'username' => $username,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'name' => $name ?: $username,
            'role' => $role,
            'status' => 'enabled',
        ]);
        return $this->me($id) ?? [];
    }

    public function updateUser(int $id, array $data): array
    {
        $user = Db::name('admin_users')->where('id', $id)->find();
        if (!$user) throw new \RuntimeException('用户不存在');

        $update = [];
        if (isset($data['name'])) $update['name'] = trim((string)$data['name']);
        if (isset($data['role'])) { $this->validateRole($data['role']); $update['role'] = $data['role']; }
        if (isset($data['status'])) {
            if (!in_array($data['status'], ['enabled', 'disabled'], true)) {
                throw new \RuntimeException('status 只能 enabled/disabled');
            }
            $update['status'] = $data['status'];
        }
        if (!$update) throw new \RuntimeException('无可更新字段');

        Db::name('admin_users')->where('id', $id)->update($update);
        return $this->me($id) ?? [];
    }

    public function changePassword(int $id, string $newPassword): void
    {
        if (strlen($newPassword) < 6) throw new \RuntimeException('密码至少 6 位');
        $user = Db::name('admin_users')->where('id', $id)->find();
        if (!$user) throw new \RuntimeException('用户不存在');
        Db::name('admin_users')->where('id', $id)->update([
            'password_hash' => password_hash($newPassword, PASSWORD_BCRYPT),
        ]);
    }

    public function deleteUser(int $id, int $currentUserId): void
    {
        if ($id === $currentUserId) throw new \RuntimeException('不能删除当前登录用户');
        $user = Db::name('admin_users')->where('id', $id)->find();
        if (!$user) throw new \RuntimeException('用户不存在');
        // 防止删完所有 super_admin
        if ($user['role'] === 'super_admin') {
            $count = Db::name('admin_users')->where('role', 'super_admin')->where('status', 'enabled')->count();
            if ($count <= 1) throw new \RuntimeException('至少保留 1 个 super_admin');
        }
        Db::name('admin_users')->where('id', $id)->delete();
    }

    private function validateRole(string $role): void
    {
        if (!in_array($role, ['super_admin', 'warehouse', 'sales_ops'], true)) {
            throw new \RuntimeException('role 非法：' . $role);
        }
    }

    // --- 最小 HS256 JWT 实现（避开新增 composer 依赖）---

    private function encode(array $payload): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $h = $this->b64UrlEncode(json_encode($header, JSON_UNESCAPED_UNICODE));
        $p = $this->b64UrlEncode(json_encode($payload, JSON_UNESCAPED_UNICODE));
        $sig = $this->b64UrlEncode(hash_hmac('sha256', "{$h}.{$p}", $this->secret(), true));
        return "{$h}.{$p}.{$sig}";
    }

    private function decode(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) throw new \RuntimeException('token 格式非法');
        [$h, $p, $sig] = $parts;
        $expected = $this->b64UrlEncode(hash_hmac('sha256', "{$h}.{$p}", $this->secret(), true));
        if (!hash_equals($expected, $sig)) {
            throw new \RuntimeException('token 签名无效');
        }
        $payload = json_decode($this->b64UrlDecode($p), true);
        if (!is_array($payload)) throw new \RuntimeException('token payload 损坏');
        return $payload;
    }

    private function secret(): string
    {
        return env('ADMIN_JWT_SECRET', env('JWT_SECRET', 'dev-insecure-secret'));
    }

    private function b64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function b64UrlDecode(string $data): string
    {
        $pad = strlen($data) % 4;
        if ($pad) $data .= str_repeat('=', 4 - $pad);
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
