<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 系统配置 KV — PIM 侧只读访问（跨库读 OMS）
 *   写操作集中在 OMS，PIM 只用 getX
 */
class SystemConfigService
{
    private static array $cache = [];
    private static bool $loaded = false;

    private static function reload(): void
    {
        try {
            $rows = Db::connect('oms')->name('system_configs')->field('config_key, config_value')->select()->toArray();
            self::$cache = [];
            foreach ($rows as $r) self::$cache[$r['config_key']] = $r['config_value'];
        } catch (\Throwable $e) {
            error_log('[PIM SystemConfig] OMS 跨库失败: ' . $e->getMessage());
            self::$cache = [];
        }
        self::$loaded = true;
    }

    public static function getFloat(string $key, float $default = 0.0): float
    {
        if (!self::$loaded) self::reload();
        return isset(self::$cache[$key]) ? (float)self::$cache[$key] : $default;
    }

    public static function getInt(string $key, int $default = 0): int
    {
        if (!self::$loaded) self::reload();
        return isset(self::$cache[$key]) ? (int)self::$cache[$key] : $default;
    }
}
