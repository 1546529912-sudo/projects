<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 验证码服务
 *   - dev 模式：固定返回 123456
 *   - 写 sms_log；verifyCode 查最新一条未使用记录
 */
class SmsService
{
    public const DEV_CODE = '123456';
    private const TTL_SECONDS = 300; // 5 分钟有效

    public function sendCode(string $phone, string $purpose = 'login', ?string $ip = null): string
    {
        if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
            throw new \InvalidArgumentException('手机号格式非法');
        }
        $code = self::DEV_CODE;
        Db::name('sms_log')->insert([
            'phone' => $phone,
            'code' => $code,
            'purpose' => $purpose,
            'success' => 0,
            'ip' => $ip,
        ]);
        return $code;
    }

    public function verifyCode(string $phone, string $code, string $purpose = 'login'): bool
    {
        // 用 DB NOW() 计算窗口，避免 PHP 时区（Asia/Shanghai）与 MySQL 容器时区（UTC）不一致
        $ttl = (int) self::TTL_SECONDS;
        $row = Db::name('sms_log')
            ->where('phone', $phone)
            ->where('purpose', $purpose)
            ->where('success', 0)
            ->whereRaw("created_at >= NOW() - INTERVAL {$ttl} SECOND")
            ->order('id', 'desc')
            ->find();
        if (!$row) return false;
        if (!hash_equals((string)$row['code'], $code)) return false;
        Db::name('sms_log')->where('id', $row['id'])->update(['success' => 1]);
        return true;
    }
}
