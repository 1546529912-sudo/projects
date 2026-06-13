<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * iter-72 Q35-01 / Q39-02：店铺装修
 *   layout_json schema 例：
 *   {
 *     blocks: [
 *       { type: "banner", image: "...", link_type: "spu|category|topic|url", link_value: "..." },
 *       { type: "spu_list", title: "热销", spu_ids: [1,2,3] },
 *       { type: "text", html: "..." },
 *       { type: "grid", items: [...] }
 *     ]
 *   }
 */
class StorePageService
{
    public const ALLOWED_BLOCK_TYPES = ['banner', 'spu_list', 'text', 'grid'];

    public function get(int $storeId, string $pageType = 'home'): ?array
    {
        $row = Db::name('store_pages')->where('store_id', $storeId)->where('page_type', $pageType)->find();
        if (!$row) return null;
        $row['layout'] = $row['layout_json'] ? json_decode($row['layout_json'], true) : [];
        unset($row['layout_json']);
        return $row;
    }

    public function save(int $storeId, string $pageType, array $layout, string $operator): array
    {
        $this->validateLayout($layout);
        $row = Db::name('store_pages')->where('store_id', $storeId)->where('page_type', $pageType)->find();
        $data = [
            'store_id' => $storeId,
            'page_type' => $pageType,
            'layout_json' => json_encode($layout, JSON_UNESCAPED_UNICODE),
            'updated_by' => $operator,
        ];
        if ($row) {
            Db::name('store_pages')->where('id', $row['id'])->update($data + ['version' => Db::raw('version + 1')]);
        } else {
            Db::name('store_pages')->insert($data);
        }
        return $this->get($storeId, $pageType) ?: [];
    }

    public function publish(int $storeId, string $pageType, string $operator): array
    {
        $row = Db::name('store_pages')->where('store_id', $storeId)->where('page_type', $pageType)->find();
        if (!$row) throw new \RuntimeException('页面不存在');
        Db::name('store_pages')->where('id', $row['id'])->update([
            'status' => 'published',
            'updated_by' => $operator,
        ]);
        return $this->get($storeId, $pageType) ?: [];
    }

    /**
     * 公开读：仅 published；layout 内 spu_ids 跨库回填 spu 基础信息
     */
    public function publicRead(int $storeId, string $pageType = 'home'): ?array
    {
        $row = Db::name('store_pages')->where('store_id', $storeId)->where('page_type', $pageType)
            ->where('status', 'published')->find();
        if (!$row) return null;
        $layout = $row['layout_json'] ? json_decode($row['layout_json'], true) : [];
        $allSpuIds = [];
        foreach (($layout['blocks'] ?? []) as $b) {
            if (($b['type'] ?? '') === 'spu_list' && is_array($b['spu_ids'] ?? null)) {
                foreach ($b['spu_ids'] as $sid) $allSpuIds[] = (int)$sid;
            }
        }
        $spuMap = [];
        if ($allSpuIds) {
            try {
                $spus = Db::connect('pim')->name('spus')->whereIn('id', array_unique($allSpuIds))
                    ->whereNull('deleted_at')->where('status', 'published')
                    ->field('id, code, name, main_images, base_price')->select()->toArray();
                foreach ($spus as $s) {
                    $imgs = is_string($s['main_images']) ? (json_decode($s['main_images'], true) ?: []) : ($s['main_images'] ?: []);
                    $spuMap[(int)$s['id']] = [
                        'id' => (int)$s['id'], 'code' => $s['code'], 'name' => $s['name'],
                        'main_image' => $imgs[0] ?? '', 'price_yuan' => round($s['base_price'] / 100, 2),
                    ];
                }
            } catch (\Throwable $e) {}
        }
        foreach (($layout['blocks'] ?? []) as &$b) {
            if (($b['type'] ?? '') === 'spu_list' && is_array($b['spu_ids'] ?? null)) {
                $b['spus'] = array_values(array_filter(array_map(fn($id) => $spuMap[(int)$id] ?? null, $b['spu_ids'])));
            }
        }
        unset($b);
        return [
            'store_id' => $storeId, 'page_type' => $pageType,
            'version' => (int)$row['version'], 'layout' => $layout,
        ];
    }

    private function validateLayout(array $layout): void
    {
        if (!isset($layout['blocks']) || !is_array($layout['blocks'])) {
            throw new \RuntimeException('layout.blocks 必须数组');
        }
        if (count($layout['blocks']) > 50) throw new \RuntimeException('最多 50 个 block');
        foreach ($layout['blocks'] as $i => $b) {
            $t = $b['type'] ?? '';
            if (!in_array($t, self::ALLOWED_BLOCK_TYPES, true)) {
                throw new \RuntimeException("block#{$i} type 非法: {$t}");
            }
        }
    }
}
