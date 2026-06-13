<?php
declare(strict_types=1);

namespace app\service;

use GuzzleHttp\Client;
use think\facade\Db;

/**
 * 收藏 SPU（iter-20）
 *   - UNIQUE(user_id, spu_id) 兜底；INSERT IGNORE 保证 add 幂等
 *   - list 时需要 PIM 名称/主图 → 调 PIM 批量查
 */
class FavoriteService
{
    public function add(int $userId, int $spuId, string $group = '默认'): void
    {
        try {
            Db::name('favorites')->insert([
                'user_id' => $userId,
                'spu_id' => $spuId,
                'group_name' => $group,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            // 重复键忽略
            if (!str_contains($e->getMessage(), 'Duplicate')) throw $e;
        }
    }

    // iter-67 Q20-05 修改分组 / 切降价通知
    public function updateGroup(int $userId, int $spuId, ?string $group, ?int $notify): array
    {
        $row = Db::name('favorites')->where('user_id', $userId)->where('spu_id', $spuId)->find();
        if (!$row) throw new \RuntimeException('未收藏');
        $upd = [];
        if ($group !== null) $upd['group_name'] = mb_substr($group, 0, 32);
        if ($notify !== null) $upd['notify_enabled'] = $notify ? 1 : 0;
        if ($upd) Db::name('favorites')->where('id', $row['id'])->update($upd);
        return Db::name('favorites')->where('id', $row['id'])->find();
    }

    public function remove(int $userId, int $spuId): void
    {
        Db::name('favorites')->where('user_id', $userId)->where('spu_id', $spuId)->delete();
    }

    public function isFav(int $userId, int $spuId): bool
    {
        return Db::name('favorites')->where('user_id', $userId)->where('spu_id', $spuId)->count() > 0;
    }

    public function list(int $userId): array
    {
        $rows = Db::name('favorites')
            ->where('user_id', $userId)
            ->order('id', 'desc')
            ->select()
            ->toArray();
        if (!$rows) return [];

        // 取 SPU 信息
        $spuIds = array_column($rows, 'spu_id');
        $spuMap = $this->fetchSpus($spuIds);
        foreach ($rows as &$r) {
            $r['spu'] = $spuMap[$r['spu_id']] ?? null;
        }
        return $rows;
    }

    private function fetchSpus(array $spuIds): array
    {
        $pimUrl = env('PIM_BACKEND_URL', 'http://pim-backend');
        $client = new Client(['timeout' => 3.0]);
        try {
            $resp = $client->post($pimUrl . '/api/v1/spu/batch', [
                'json' => ['ids' => $spuIds],
            ]);
            $body = json_decode((string)$resp->getBody(), true);
            $data = $body['data'] ?? [];
            $map = [];
            foreach ($data as $row) {
                $map[(int)$row['id']] = $row;
            }
            return $map;
        } catch (\Throwable $e) {
            return [];
        }
    }
}
