<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 店铺管理（iter-35 BIZ-08-1）
 *
 *   CRUD + 入驻审批（approve/reject）+ 暂停/恢复 + 抽佣率调整
 *   仅 super_admin 可访问（controller route 限制）
 */
class StoreService
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_CLOSED = 'closed';
    public const PLATFORM_STORE_ID = 1;

    public function list(array $filters, int $page, int $size): array
    {
        $q = Db::name('stores')->whereNull('deleted_at')->order('id', 'desc');
        if (!empty($filters['status'])) $q->where('status', $filters['status']);
        if (!empty($filters['keyword'])) {
            $kw = $filters['keyword'];
            $q->where(function ($q) use ($kw) {
                $q->whereLike('name', "%{$kw}%")->whereOr('code', 'like', "%{$kw}%");
            });
        }
        $total = (clone $q)->count();
        $rows = $q->page($page, $size)->select()->toArray();
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    public function detail(int $id): array
    {
        $row = $this->mustGet($id);
        // 关联管理员
        $admins = Db::name('store_admins')
            ->alias('sa')
            ->leftJoin('admin_users au', 'au.id = sa.admin_user_id')
            ->where('sa.store_id', $id)
            ->field('sa.id, sa.role, sa.created_at, au.id as admin_user_id, au.username, au.name as admin_name')
            ->select()->toArray();
        return ['store' => $row, 'admins' => $admins];
    }

    public function create(array $data, string $operator): array
    {
        $code = trim((string)($data['code'] ?? ''));
        $name = trim((string)($data['name'] ?? ''));
        if (!$code || !$name) throw new \RuntimeException('code / name 必填');
        if (Db::name('stores')->where('code', $code)->whereNull('deleted_at')->find()) {
            throw new \RuntimeException("code 已存在: {$code}");
        }
        $commission = isset($data['commission_rate']) ? (float)$data['commission_rate'] : 0.05;
        if ($commission < 0 || $commission > 0.5) {
            throw new \RuntimeException('commission_rate 必须 0-0.5（0-50%）');
        }
        $id = Db::name('stores')->insertGetId([
            'code' => $code,
            'name' => $name,
            'description' => $data['description'] ?? null,
            'logo_url' => $data['logo_url'] ?? null,
            'contact_name' => $data['contact_name'] ?? null,
            'contact_phone' => $data['contact_phone'] ?? null,
            'business_license' => $data['business_license'] ?? null,
            'commission_rate' => $commission,
            'status' => self::STATUS_PENDING,
        ]);
        AuditService::log('store.create', 'store', (string)$id, null,
            ['code' => $code, 'name' => $name, 'commission_rate' => $commission], null, $operator);
        return $this->detail($id);
    }

    public function approve(int $id, string $operator, ?array $opts = null): array
    {
        $row = $this->mustGet($id);
        if ($row['status'] === self::STATUS_APPROVED) {
            throw new \RuntimeException('店铺已通过');
        }
        Db::name('stores')->where('id', $id)->update([
            'status' => self::STATUS_APPROVED,
            'approved_at' => date('Y-m-d H:i:s'),
            'approved_by' => $operator,
        ]);

        // iter-39 BIZ-08-5: 自动建 store_owner 账号 + 绑定（若该店尚无任何 admin）
        $autoAccount = null;
        $hasAdmin = (int)Db::name('store_admins')->where('store_id', $id)->count();
        if (!$hasAdmin && $id !== self::PLATFORM_STORE_ID) {
            $username = 'shop-' . $row['code'];
            $existing = Db::name('admin_users')->where('username', $username)->find();
            $pwd = $opts['default_password'] ?? ('shop' . random_int(1000, 9999));
            if ($existing) {
                $newAid = (int)$existing['id'];
            } else {
                $newAid = (int)Db::name('admin_users')->insertGetId([
                    'username' => $username,
                    'password_hash' => password_hash($pwd, PASSWORD_BCRYPT),
                    'name' => $row['name'] . ' 店主',
                    'role' => 'store_owner',
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }
            Db::name('store_admins')->insert([
                'store_id' => $id,
                'admin_user_id' => $newAid,
                'role' => 'store_owner',
                'created_by' => $operator,
            ]);
            StoreContextService::flushAdminCache($newAid);
            $autoAccount = ['username' => $username, 'password' => $existing ? null : $pwd];
            AuditService::log('store.auto_create_owner', 'store', (string)$id, null,
                ['admin_user_id' => $newAid, 'username' => $username], null, $operator);
        }

        AuditService::log('store.approve', 'store', (string)$id,
            ['status' => $row['status']], ['status' => self::STATUS_APPROVED], null, $operator);

        $result = $this->detail($id);
        if ($autoAccount) $result['auto_account'] = $autoAccount;
        return $result;
    }

    public function suspend(int $id, string $reason, string $operator): array
    {
        if (!trim($reason)) throw new \RuntimeException('suspended_reason 必填');
        $row = $this->mustGet($id);
        if ($id === self::PLATFORM_STORE_ID) throw new \RuntimeException('平台店不可暂停');
        Db::name('stores')->where('id', $id)->update([
            'status' => self::STATUS_SUSPENDED,
            'suspended_at' => date('Y-m-d H:i:s'),
            'suspended_reason' => $reason,
        ]);
        AuditService::log('store.suspend', 'store', (string)$id,
            ['status' => $row['status']], ['status' => self::STATUS_SUSPENDED, 'reason' => $reason], $reason, $operator);
        return $this->detail($id);
    }

    public function resume(int $id, string $operator): array
    {
        $row = $this->mustGet($id);
        if ($row['status'] !== self::STATUS_SUSPENDED) {
            throw new \RuntimeException('仅 suspended 状态可恢复');
        }
        Db::name('stores')->where('id', $id)->update([
            'status' => self::STATUS_APPROVED,
            'suspended_at' => null,
            'suspended_reason' => null,
        ]);
        AuditService::log('store.resume', 'store', (string)$id,
            ['status' => self::STATUS_SUSPENDED], ['status' => self::STATUS_APPROVED], null, $operator);
        return $this->detail($id);
    }

    /**
     * iter-39 BIZ-08-5: 店主自管 — 仅可改 name/description/logo
     *   不可改：code/status/commission_rate（平台权限）
     */
    public function selfUpdate(int $storeId, array $data, string $operator): array
    {
        $row = $this->mustGet($storeId);
        $update = [];
        foreach (['name', 'description', 'logo_url', 'contact_name', 'contact_phone'] as $f) {
            if (array_key_exists($f, $data)) {
                $v = $data[$f];
                $update[$f] = is_string($v) ? trim($v) : $v;
                if ($update[$f] === '') $update[$f] = null;
            }
        }
        if (!$update) throw new \RuntimeException('无可更新字段');
        Db::name('stores')->where('id', $storeId)->update($update);
        AuditService::log('store.self_update', 'store', (string)$storeId,
            array_intersect_key($row, $update), $update, null, $operator);
        return $this->detail($storeId);
    }

    public function updateCommission(int $id, float $rate, string $operator): array
    {
        if ($rate < 0 || $rate > 0.5) throw new \RuntimeException('commission_rate 必须 0-0.5');
        $row = $this->mustGet($id);
        Db::name('stores')->where('id', $id)->update(['commission_rate' => $rate]);
        AuditService::log('store.commission_update', 'store', (string)$id,
            ['commission_rate' => $row['commission_rate']], ['commission_rate' => $rate], null, $operator);
        return $this->detail($id);
    }

    /**
     * 给店铺添加 admin（v1：直接绑现有 admin_user 或创建新的）
     */
    public function addAdmin(int $storeId, int $adminUserId, string $role, string $operator): array
    {
        $this->mustGet($storeId);
        if (!in_array($role, ['store_owner', 'store_staff'], true)) {
            throw new \RuntimeException('role 只能 store_owner / store_staff');
        }
        $admin = Db::name('admin_users')->where('id', $adminUserId)->find();
        if (!$admin) throw new \RuntimeException('admin_user 不存在');
        // 顺手更新 admin role（如果当前是 super/sales/warehouse 不动）
        if (!in_array($admin['role'], ['super_admin', 'sales_ops', 'warehouse'], true)) {
            Db::name('admin_users')->where('id', $adminUserId)->update(['role' => $role]);
        }
        try {
            Db::name('store_admins')->insert([
                'store_id' => $storeId,
                'admin_user_id' => $adminUserId,
                'role' => $role,
                'created_by' => $operator,
            ]);
        } catch (\Throwable $e) {
            throw new \RuntimeException('已经关联过此店铺');
        }
        AuditService::log('store.admin_add', 'store', (string)$storeId, null,
            ['admin_user_id' => $adminUserId, 'role' => $role], null, $operator);
        StoreContextService::flushAdminCache($adminUserId);
        return $this->detail($storeId);
    }

    public function removeAdmin(int $storeId, int $adminUserId, string $operator): array
    {
        Db::name('store_admins')->where(['store_id' => $storeId, 'admin_user_id' => $adminUserId])->delete();
        AuditService::log('store.admin_remove', 'store', (string)$storeId, null,
            ['admin_user_id' => $adminUserId], null, $operator);
        StoreContextService::flushAdminCache($adminUserId);
        return $this->detail($storeId);
    }

    private function mustGet(int $id): array
    {
        $row = Db::name('stores')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) throw new \RuntimeException('店铺不存在');
        return $row;
    }
}
