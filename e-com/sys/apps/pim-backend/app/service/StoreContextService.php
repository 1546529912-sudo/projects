<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;
use think\facade\Cache;

/**
 * PIM 店铺上下文（iter-36 BIZ-08-2）
 *
 *   跨库读 oms.store_admins（iter-29 已加 PIM→OMS 副连接）
 *   缓存 Redis 1 小时（同 OMS StoreContextService 设计）
 *
 *   返回值语义：
 *     super_admin / sales_ops / warehouse → null（跨店访问）
 *     store_owner / store_staff → int[]（关联 store_ids）
 */
class StoreContextService
{
    private const CACHE_PREFIX = 'pim_admin_store_ctx:';
    private const CACHE_TTL = 3600;

    public function getStoreIds(int $adminUserId, string $role): ?array
    {
        // iter-43 EFF-04: editor 平台级 PIM 编辑（跨店）
        if (in_array($role, ['super_admin', 'sales_ops', 'warehouse', 'editor'], true)) {
            return null;
        }
        $key = self::CACHE_PREFIX . $adminUserId;
        $cached = Cache::get($key);
        if (is_array($cached)) return $cached;

        try {
            $ids = Db::connect('oms')->name('store_admins')
                ->where('admin_user_id', $adminUserId)
                ->column('store_id');
            $ids = array_map('intval', $ids);
            Cache::set($key, $ids, self::CACHE_TTL);
            return $ids;
        } catch (\Throwable $e) {
            error_log('[PIM StoreContext] 跨库读 store_admins 失败: ' . $e->getMessage());
            return [];
        }
    }

    public static function flushAdminCache(int $adminUserId): void
    {
        Cache::delete(self::CACHE_PREFIX . $adminUserId);
    }
}
