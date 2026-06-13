<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 系统配置 KV（iter-52）
 *
 *   读取顺序：内存缓存 → DB → 默认值
 *   修改：admin set + 写 audit + 清缓存
 */
class SystemConfigService
{
    private static array $cache = [];
    private static bool $loaded = false;

    /**
     * 读 config（按 key），返回字符串
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        if (!self::$loaded) self::reload();
        return self::$cache[$key] ?? $default;
    }

    public static function getFloat(string $key, float $default = 0.0): float
    {
        $v = self::get($key);
        return $v === null ? $default : (float)$v;
    }

    public static function getInt(string $key, int $default = 0): int
    {
        $v = self::get($key);
        return $v === null ? $default : (int)$v;
    }

    public static function reload(): void
    {
        $rows = Db::name('system_configs')->field('config_key, config_value')->select()->toArray();
        self::$cache = [];
        foreach ($rows as $r) self::$cache[$r['config_key']] = $r['config_value'];
        self::$loaded = true;
    }

    public static function setBatch(array $kv, string $operator): array
    {
        $changed = [];
        foreach ($kv as $key => $value) {
            $value = (string)$value;
            $row = Db::name('system_configs')->where('config_key', $key)->find();
            if (!$row) continue;
            if ($row['config_value'] === $value) continue;
            Db::name('system_configs')->where('config_key', $key)
                ->update(['config_value' => $value, 'updated_by' => $operator]);
            \app\service\AuditService::log('config.update', 'system_config', $key,
                ['old' => $row['config_value']], ['new' => $value], null, $operator);
            $changed[] = $key;
        }
        self::reload();
        return ['changed_count' => count($changed), 'changed_keys' => $changed];
    }

    public static function listByCategory(?string $category = null): array
    {
        $q = Db::name('system_configs')->field('config_key, config_value, category, description, updated_by, updated_at');
        if ($category) $q->where('category', $category);
        return $q->order('category, config_key')->select()->toArray();
    }
}
