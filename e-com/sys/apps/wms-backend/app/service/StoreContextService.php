<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;
use think\facade\Cache;

/**
 * WMS 店铺上下文（iter-38 BIZ-08-4，同 PIM iter-36 模式）
 *
 *   跨库读 oms.store_admins（iter-24 已加 WMS→OMS 副连接）
 *   缓存 Redis 1 小时
 *
 *   返回：
 *     super_admin/sales_ops/warehouse → null（跨店：平台员工 + 仓管）
 *     store_owner/store_staff → int[]（关联 store_ids）
 *
 *   注意：WMS warehouse 角色保留跨店访问语义（平台仓管原本就能看所有仓库）
 */
class StoreContextService
{
    private const CACHE_PREFIX = 'wms_admin_store_ctx:';
    private const CACHE_TTL = 3600;

    public function getStoreIds(int $adminUserId, string $role): ?array
    {
        // iter-72 Q43-04：editor 显式空数组 — 路由若放过也彻底无可见数据
        if ($role === 'editor') return [];
        if (in_array($role, ['super_admin', 'sales_ops', 'warehouse'], true)) {
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
            error_log('[WMS StoreContext] 跨库读 store_admins 失败: ' . $e->getMessage());
            return [];
        }
    }

    public static function flushAdminCache(int $adminUserId): void
    {
        Cache::delete(self::CACHE_PREFIX . $adminUserId);
    }
}
