<?php
declare(strict_types=1);

namespace app\service;

/**
 * 后台 JWT 校验（iter-17）
 *   - 仅 verify，不签发（签发在 oms-backend AdminAuthService）
 *   - 同 secret 同算法（HS256），靠 env('ADMIN_JWT_SECRET') 跨服务对齐
 */
class AdminTokenService
{
    public function verify(string $token): array
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
        if (!isset($payload['exp']) || $payload['exp'] < time()) {
            throw new \RuntimeException('token 已过期');
        }
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
