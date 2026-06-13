<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 地址簿（iter-20）
 *   - 多地址 + is_default 单一标记（set_default tx 内先全 0 再单条置 1）
 */
class AddressService
{
    public function list(int $userId): array
    {
        return Db::name('addresses')
            ->where('user_id', $userId)
            ->order('is_default', 'desc')
            ->order('id', 'desc')
            ->select()
            ->toArray();
    }

    public function create(int $userId, array $data): array
    {
        $this->validate($data);
        $now = date('Y-m-d H:i:s');
        $hasOther = Db::name('addresses')->where('user_id', $userId)->count();
        $isDefault = $hasOther > 0 ? 0 : 1;  // 首条自动默认

        $id = Db::name('addresses')->insertGetId([
            'user_id' => $userId,
            'name' => $data['name'],
            'phone' => $data['phone'],
            'province' => $data['province'],
            'city' => $data['city'],
            'district' => $data['district'],
            'detail' => $data['detail'],
            // iter-67 Q20-04 LBS（可选）
            'lat' => isset($data['lat']) && $data['lat'] !== '' ? (float)$data['lat'] : null,
            'lng' => isset($data['lng']) && $data['lng'] !== '' ? (float)$data['lng'] : null,
            'is_default' => $isDefault,
            'created_at' => $now,
        ]);
        return Db::name('addresses')->where('id', $id)->find();
    }

    public function update(int $userId, int $id, array $data): array
    {
        $row = Db::name('addresses')->where('id', $id)->where('user_id', $userId)->find();
        if (!$row) throw new \RuntimeException('地址不存在');
        $this->validate($data);
        Db::name('addresses')->where('id', $id)->update([
            'name' => $data['name'],
            'phone' => $data['phone'],
            'province' => $data['province'],
            'city' => $data['city'],
            'district' => $data['district'],
            'detail' => $data['detail'],
            'lat' => isset($data['lat']) && $data['lat'] !== '' ? (float)$data['lat'] : null,
            'lng' => isset($data['lng']) && $data['lng'] !== '' ? (float)$data['lng'] : null,
        ]);
        return Db::name('addresses')->where('id', $id)->find();
    }

    public function delete(int $userId, int $id): void
    {
        $row = Db::name('addresses')->where('id', $id)->where('user_id', $userId)->find();
        if (!$row) throw new \RuntimeException('地址不存在');
        $wasDefault = (int)$row['is_default'] === 1;
        Db::name('addresses')->where('id', $id)->delete();
        // 删的是默认地址 → 任意挑一条置默认
        if ($wasDefault) {
            $next = Db::name('addresses')->where('user_id', $userId)->order('id', 'desc')->find();
            if ($next) {
                Db::name('addresses')->where('id', $next['id'])->update(['is_default' => 1]);
            }
        }
    }

    public function setDefault(int $userId, int $id): array
    {
        return Db::transaction(function () use ($userId, $id) {
            $row = Db::name('addresses')->where('id', $id)->where('user_id', $userId)->lock(true)->find();
            if (!$row) throw new \RuntimeException('地址不存在');
            Db::name('addresses')->where('user_id', $userId)->update(['is_default' => 0]);
            Db::name('addresses')->where('id', $id)->update(['is_default' => 1]);
            return Db::name('addresses')->where('id', $id)->find();
        });
    }

    public function getDefault(int $userId): ?array
    {
        $r = Db::name('addresses')->where('user_id', $userId)->where('is_default', 1)->find();
        return $r ?: null;
    }

    private function validate(array $data): void
    {
        foreach (['name', 'phone', 'province', 'city', 'district', 'detail'] as $k) {
            if (!isset($data[$k]) || trim((string)$data[$k]) === '') {
                throw new \RuntimeException("{$k} 必传");
            }
        }
        if (!preg_match('/^1\d{10}$/', $data['phone'])) {
            throw new \RuntimeException('手机号格式不对');
        }
    }
}
