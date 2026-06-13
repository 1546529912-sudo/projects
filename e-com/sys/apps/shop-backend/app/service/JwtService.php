<?php
declare(strict_types=1);

namespace app\service;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
    private const ALG = 'HS256';
    private const TTL = 86400 * 7; // 7 天

    public function sign(int $userId, array $extra = []): string
    {
        $now = time();
        $payload = array_merge($extra, [
            'iss' => 'shop-backend',
            'sub' => (string)$userId,
            'iat' => $now,
            'exp' => $now + self::TTL,
        ]);
        return JWT::encode($payload, $this->secret(), self::ALG);
    }

    public function verify(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret(), self::ALG));
            return (array)$decoded;
        } catch (\Throwable) {
            return null;
        }
    }

    private function secret(): string
    {
        return env('JWT_SECRET', 'dev-insecure-secret');
    }
}
