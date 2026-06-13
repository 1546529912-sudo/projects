<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;
use think\facade\Cache;

/**
 * 当前 admin 的店铺上下文（iter-35 BIZ-08-1）
 *
 *   取一个 admin_user 关联的 store_ids 列表，用于 service 层数据过滤。
 *
 *   缓存：Redis 1 小时（避免每请求查 store_admins）
 *   失效：store.admin_add/admin_remove/approve 时调 flushAdminCache()
 *
 *   语义：
 *     super_admin / sales_ops / warehouse → 返回 null（=跨店访问，无限制）
 *     store_owner / store_staff → 返回关联 store_ids 数组（可能为空数组表示无任何店）
 */
class StoreContextService
{
    private const CACHE_PREFIX = 'admin_store_ctx:';
    private const CACHE_TTL = 3600;

    /**
     * @param int $adminUserId
     * @param string $role  super_admin / sales_ops / warehouse / store_owner / store_staff
     * @return int[]|null   null 表示跨店访问；非 null 表示限制到这些 store_ids
     */
    public function getStoreIds(int $adminUserId, string $role): ?array
    {
        // iter-72 Q43-04：editor 显式空数组 — 哪怕路由放过也彻底无可见数据
        if ($role === 'editor') return [];
        if (in_array($role, ['super_admin', 'warehouse'], true)) {
            return null;
        }
        // iter-55 Q43-03：sales_ops 也支持按店细分（若 store_admins 有绑定则按店；否则保留跨店）
        if ($role === 'sales_ops') {
            $ids = Db::name('store_admins')->where('admin_user_id', $adminUserId)->column('store_id');
            $ids = array_map('intval', $ids);
            return $ids ?: null; // 无绑定 → 跨店（兼容旧 sales 账号）
        }
        $key = self::CACHE_PREFIX . $adminUserId;
        $cached = Cache::get($key);
        if (is_array($cached)) return $cached;
        $ids = Db::name('store_admins')->where('admin_user_id', $adminUserId)->column('store_id');
        $ids = array_map('intval', $ids);
        Cache::set($key, $ids, self::CACHE_TTL);
        return $ids;
    }

    public static function flushAdminCache(?int $adminUserId = null): void
    {
        if ($adminUserId !== null) {
            Cache::delete(self::CACHE_PREFIX . $adminUserId);
            return;
        }
        // 全清：用 SCAN 太重，简化处理：v1 不全清，调用方应传具体 admin_user_id
        // 例外：store.approve 时全清（影响所有人能看的店）— v2 优化
    }
}
