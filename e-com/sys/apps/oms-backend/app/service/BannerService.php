<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * Banner / 推荐位 服务（iter-40 BIZ-09-1）
 *   两个 entity 模式高度相似，合并一个 service
 */
class BannerService
{
    public const BANNER_POSITIONS = ['home', 'category', 'detail'];
    public const FEATURED_POSITIONS = ['home_hot', 'home_new', 'category_top', 'detail_related'];
    public const LINK_TYPES = ['spu', 'category', 'url', 'none', 'topic']; // iter-60 Q41-03 加 topic

    /* ============= Banner CRUD ============= */

    public function listBanners(array $filters, int $page, int $size): array
    {
        $q = Db::name('banners')->whereNull('deleted_at')->order('sort', 'asc')->order('id', 'desc');
        if (!empty($filters['position'])) $q->where('position', $filters['position']);
        if (!empty($filters['status'])) $q->where('status', $filters['status']);
        if (isset($filters['store_id'])) {
            if ($filters['store_id'] === 'platform') $q->whereNull('store_id');
            else $q->where('store_id', (int)$filters['store_id']);
        }
        $total = (clone $q)->count();
        $rows = $q->page($page, $size)->select()->toArray();
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    public function detailBanner(int $id): array
    {
        $row = Db::name('banners')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) throw new \RuntimeException('Banner 不存在');
        return $row;
    }

    public function createBanner(array $data, string $operator): array
    {
        $this->validateBanner($data, false);
        if (Db::name('banners')->where('code', $data['code'])->whereNull('deleted_at')->find()) {
            throw new \RuntimeException('code 已存在: ' . $data['code']);
        }
        $id = Db::name('banners')->insertGetId([
            'code' => $data['code'],
            'name' => $data['name'],
            'position' => $data['position'],
            'image_url' => $data['image_url'],
            'link_type' => $data['link_type'] ?? 'none',
            'link_value' => $data['link_value'] ?? null,
            'sort' => (int)($data['sort'] ?? 0),
            'status' => $data['status'] ?? 'enabled',
            'valid_from' => $data['valid_from'] ?? null,
            'valid_to' => $data['valid_to'] ?? null,
            'store_id' => isset($data['store_id']) && $data['store_id'] !== '' ? (int)$data['store_id'] : null,
            'created_by' => $operator,
        ]);
        AuditService::log('banner.create', 'banner', (string)$id, null, $data, null, $operator);
        return $this->detailBanner($id);
    }

    public function updateBanner(int $id, array $data, string $operator): array
    {
        $row = $this->detailBanner($id);
        $update = [];
        foreach (['name', 'image_url', 'link_type', 'link_value', 'sort', 'status', 'valid_from', 'valid_to', 'position'] as $f) {
            if (array_key_exists($f, $data)) $update[$f] = $data[$f];
        }
        if (!$update) throw new \RuntimeException('无可更新字段');
        Db::name('banners')->where('id', $id)->update($update);
        AuditService::log('banner.update', 'banner', (string)$id,
            array_intersect_key($row, $update), $update, null, $operator);
        return $this->detailBanner($id);
    }

    public function deleteBanner(int $id, string $operator): void
    {
        $row = $this->detailBanner($id);
        Db::name('banners')->where('id', $id)->update(['deleted_at' => date('Y-m-d H:i:s')]);
        AuditService::log('banner.delete', 'banner', (string)$id, $row, null, null, $operator);
    }

    /**
     * 公开读：按 position + 时间段 + status 过滤
     */
    public function publicListBanners(string $position, ?int $storeId = null): array
    {
        $now = date('Y-m-d H:i:s');
        $q = Db::name('banners')->whereNull('deleted_at')
            ->where('position', $position)
            ->where('status', 'enabled')
            ->where(function ($q) use ($now) {
                $q->whereNull('valid_from')->whereOr('valid_from', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('valid_to')->whereOr('valid_to', '>=', $now);
            })
            ->order('sort', 'asc')->order('id', 'desc');
        if ($storeId !== null) {
            $q->where(function ($q) use ($storeId) {
                $q->whereNull('store_id')->whereOr('store_id', $storeId);
            });
        } else {
            $q->whereNull('store_id'); // 公开读默认仅平台 banner
        }
        $rows = $q->field('id, code, name, image_url, link_type, link_value, sort')
            ->select()->toArray();
        // iter-51 Q40-01 — 对 link_type=spu 的项跨库回填 link_sku（默认首个 SKU）让小程序可跳详情
        $spuIds = [];
        foreach ($rows as $r) {
            if ($r['link_type'] === 'spu' && !empty($r['link_value']) && ctype_digit((string)$r['link_value'])) {
                $spuIds[] = (int)$r['link_value'];
            }
        }
        if ($spuIds) {
            $skuMap = $this->fetchFirstSkuCodes(array_unique($spuIds));
            foreach ($rows as &$r) {
                if ($r['link_type'] === 'spu' && ctype_digit((string)$r['link_value'])) {
                    $r['link_sku'] = $skuMap[(int)$r['link_value']] ?? '';
                }
            }
            unset($r);
        }
        // iter-60 Q41-03 — link_type=topic 时回填 link_topic_code
        $topicIds = [];
        foreach ($rows as $r) {
            if ($r['link_type'] === 'topic' && !empty($r['link_value']) && ctype_digit((string)$r['link_value'])) {
                $topicIds[] = (int)$r['link_value'];
            }
        }
        if ($topicIds) {
            $topicMap = $this->fetchTopicCodes(array_unique($topicIds));
            foreach ($rows as &$r) {
                if ($r['link_type'] === 'topic' && ctype_digit((string)$r['link_value'])) {
                    $r['link_topic_code'] = $topicMap[(int)$r['link_value']] ?? '';
                }
            }
            unset($r);
        }
        return $rows;
    }

    /**
     * iter-60 Q41-03：按 topic_id 拿 topic.code（同库）
     * @param int[] $ids
     * @return array<int,string>
     */
    private function fetchTopicCodes(array $ids): array
    {
        if (!$ids) return [];
        try {
            $rows = Db::name('marketing_topics')->whereIn('id', $ids)
                ->whereNull('deleted_at')
                ->field('id, code')->select()->toArray();
            $map = [];
            foreach ($rows as $r) $map[(int)$r['id']] = $r['code'];
            return $map;
        } catch (\Throwable $e) { return []; }
    }

    /**
     * iter-51 Q40-01：跨库 PIM 拿 SPU 默认首个 SKU code（按 sort/id asc）
     * @param int[] $spuIds
     * @return array<int,string> spu_id => sku_code
     */
    private function fetchFirstSkuCodes(array $spuIds): array
    {
        if (!$spuIds) return [];
        try {
            $rows = Db::connect('pim')->name('skus')
                ->whereIn('spu_id', $spuIds)
                ->whereNull('deleted_at')
                ->field('spu_id, sku_code, id')
                ->order('id', 'asc')
                ->select()->toArray();
            $map = [];
            foreach ($rows as $r) {
                $sid = (int)$r['spu_id'];
                if (!isset($map[$sid])) $map[$sid] = $r['sku_code'];
            }
            return $map;
        } catch (\Throwable $e) { return []; }
    }

    private function validateBanner(array $d, bool $isUpdate): void
    {
        if (!$isUpdate) {
            foreach (['code', 'name', 'position', 'image_url'] as $f) {
                if (empty($d[$f])) throw new \RuntimeException("{$f} 必填");
            }
        }
        if (!empty($d['position']) && !in_array($d['position'], self::BANNER_POSITIONS, true)) {
            throw new \RuntimeException('position 仅支持: ' . implode(',', self::BANNER_POSITIONS));
        }
        if (!empty($d['link_type']) && !in_array($d['link_type'], self::LINK_TYPES, true)) {
            throw new \RuntimeException('link_type 仅支持: ' . implode(',', self::LINK_TYPES));
        }
    }

    /* ============= Featured Items CRUD ============= */

    public function listFeatured(array $filters, int $page, int $size): array
    {
        $q = Db::name('featured_items')->whereNull('deleted_at')->order('sort', 'asc')->order('id', 'desc');
        if (!empty($filters['position'])) $q->where('position', $filters['position']);
        if (!empty($filters['status'])) $q->where('status', $filters['status']);
        if (!empty($filters['spu_id'])) $q->where('spu_id', (int)$filters['spu_id']);
        $total = (clone $q)->count();
        $rows = $q->page($page, $size)->select()->toArray();

        // 跨库读 PIM 拉 SPU 名简化
        $spuIds = array_unique(array_column($rows, 'spu_id'));
        $spuMap = [];
        if ($spuIds) {
            try {
                $spus = Db::connect('pim')->name('spus')->whereIn('id', $spuIds)
                    ->whereNull('deleted_at')
                    ->field('id, name, main_images')->select()->toArray();
                foreach ($spus as $s) {
                    $imgs = is_string($s['main_images']) ? (json_decode($s['main_images'], true) ?: []) : ($s['main_images'] ?: []);
                    $spuMap[$s['id']] = ['name' => $s['name'], 'main_image' => $imgs[0] ?? ''];
                }
            } catch (\Throwable $e) { /* fallback empty */ }
        }
        foreach ($rows as &$r) {
            $r['spu_name'] = $spuMap[$r['spu_id']]['name'] ?? '';
            $r['spu_main_image'] = $spuMap[$r['spu_id']]['main_image'] ?? '';
        }
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    public function createFeatured(array $data, string $operator): array
    {
        if (empty($data['position'])) throw new \RuntimeException('position 必填');
        if (empty($data['spu_id'])) throw new \RuntimeException('spu_id 必填');
        if (!in_array($data['position'], self::FEATURED_POSITIONS, true)) {
            throw new \RuntimeException('position 仅支持: ' . implode(',', self::FEATURED_POSITIONS));
        }
        $id = Db::name('featured_items')->insertGetId([
            'position' => $data['position'],
            'spu_id' => (int)$data['spu_id'],
            'sort' => (int)($data['sort'] ?? 0),
            'status' => $data['status'] ?? 'enabled',
            'valid_from' => $data['valid_from'] ?? null,
            'valid_to' => $data['valid_to'] ?? null,
            'store_id' => isset($data['store_id']) && $data['store_id'] !== '' ? (int)$data['store_id'] : null,
            'created_by' => $operator,
        ]);
        AuditService::log('featured.create', 'featured', (string)$id, null, $data, null, $operator);
        return Db::name('featured_items')->where('id', $id)->find();
    }

    public function updateFeatured(int $id, array $data, string $operator): array
    {
        $row = Db::name('featured_items')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) throw new \RuntimeException('推荐位不存在');
        $update = [];
        foreach (['position', 'sort', 'status', 'valid_from', 'valid_to'] as $f) {
            if (array_key_exists($f, $data)) $update[$f] = $data[$f];
        }
        if (!$update) throw new \RuntimeException('无可更新字段');
        Db::name('featured_items')->where('id', $id)->update($update);
        AuditService::log('featured.update', 'featured', (string)$id,
            array_intersect_key($row, $update), $update, null, $operator);
        return Db::name('featured_items')->where('id', $id)->find();
    }

    public function deleteFeatured(int $id, string $operator): void
    {
        $row = Db::name('featured_items')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) throw new \RuntimeException('推荐位不存在');
        Db::name('featured_items')->where('id', $id)->update(['deleted_at' => date('Y-m-d H:i:s')]);
        AuditService::log('featured.delete', 'featured', (string)$id, $row, null, null, $operator);
    }

    /**
     * iter-60 Q40-03：按用户 RFM 个性化重排（VIP 优先看 sort/精品；流失用户优先新货）
     */
    public function publicListFeatured(string $position, int $limit = 20, ?int $userId = null): array
    {
        $now = date('Y-m-d H:i:s');
        $rows = Db::name('featured_items')->whereNull('deleted_at')
            ->where('position', $position)
            ->where('status', 'enabled')
            ->where(function ($q) use ($now) {
                $q->whereNull('valid_from')->whereOr('valid_from', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('valid_to')->whereOr('valid_to', '>=', $now);
            })
            ->order('sort', 'asc')->limit($limit)
            ->field('id, spu_id, sort')->select()->toArray();

        $spuIds = array_unique(array_column($rows, 'spu_id'));
        $spus = [];
        if ($spuIds) {
            try {
                $list = Db::connect('pim')->name('spus')->whereIn('id', $spuIds)
                    ->whereNull('deleted_at')->where('status', 'published')
                    ->field('id, name, main_images, base_price')->select()->toArray();
                foreach ($list as $s) {
                    $imgs = is_string($s['main_images']) ? (json_decode($s['main_images'], true) ?: []) : ($s['main_images'] ?: []);
                    $spus[$s['id']] = [
                        'spu_id' => (int)$s['id'],
                        'name' => $s['name'],
                        'main_image' => $imgs[0] ?? '',
                        'price_yuan' => number_format(((int)$s['base_price']) / 100, 2, '.', ''),
                    ];
                }
                // iter-51 Q40-01 — featured 也填默认 sku_code
                $skuMap = $this->fetchFirstSkuCodes(array_keys($spus));
                foreach ($spus as $sid => &$info) $info['sku_code'] = $skuMap[$sid] ?? '';
            } catch (\Throwable $e) { /* fallback */ }
        }
        $out = [];
        foreach ($rows as $r) {
            if (isset($spus[$r['spu_id']])) $out[] = $spus[$r['spu_id']];
        }
        // iter-60 Q40-03 个性化：高 RFM 段（>=4 月内订单≥3）保持 sort；其他重排（按 SPU id desc，新货优先）
        if ($userId !== null && $out) {
            try {
                $f = (int)Db::name('orders')->where('user_id', $userId)
                    ->where('status', 'completed')
                    ->where('created_at', '>=', date('Y-m-d', strtotime('-90 days')))
                    ->count();
                $isVip = $f >= 3;
                if (!$isVip) {
                    usort($out, fn($a, $b) => ($b['spu_id'] ?? 0) <=> ($a['spu_id'] ?? 0));
                }
            } catch (\Throwable $e) { /* 兜底跳过 */ }
        }
        return $out;
    }
}
