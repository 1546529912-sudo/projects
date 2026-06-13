<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 营销专题 + 营销日历（iter-41 BIZ-09-2）
 */
class MarketingTopicService
{
    /* ============= Topic CRUD ============= */

    public function list(array $filters, int $page, int $size): array
    {
        $q = Db::name('marketing_topics')->whereNull('deleted_at')->order('sort', 'asc')->order('id', 'desc');
        if (!empty($filters['status'])) $q->where('status', $filters['status']);
        if (!empty($filters['keyword'])) {
            $kw = $filters['keyword'];
            $q->where(function ($q) use ($kw) {
                $q->whereLike('name', "%{$kw}%")->whereOr('code', 'like', "%{$kw}%");
            });
        }
        $total = (clone $q)->count();
        $rows = $q->page($page, $size)->select()->toArray();
        // 顺手回填关联 SPU 计数
        $ids = array_column($rows, 'id');
        if ($ids) {
            $cnts = Db::name('marketing_topic_items')->whereIn('topic_id', $ids)
                ->field('topic_id, COUNT(*) AS cnt')->group('topic_id')
                ->select()->toArray();
            $cntMap = array_column($cnts, 'cnt', 'topic_id');
            foreach ($rows as &$r) $r['item_count'] = (int)($cntMap[$r['id']] ?? 0);
        }
        return ['total' => $total, 'page' => $page, 'size' => $size, 'list' => $rows];
    }

    public function detail(int $id): array
    {
        $row = Db::name('marketing_topics')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) throw new \RuntimeException('专题不存在');
        $items = Db::name('marketing_topic_items')->where('topic_id', $id)
            ->order('sort', 'asc')->select()->toArray();
        // 跨库 PIM 回填 SPU 名+主图+价
        $spuIds = array_unique(array_column($items, 'spu_id'));
        $spuMap = [];
        if ($spuIds) {
            try {
                $spus = Db::connect('pim')->name('spus')->whereIn('id', $spuIds)
                    ->whereNull('deleted_at')
                    ->field('id, name, main_images, base_price, status')->select()->toArray();
                foreach ($spus as $s) {
                    $imgs = is_string($s['main_images']) ? (json_decode($s['main_images'], true) ?: []) : ($s['main_images'] ?: []);
                    $spuMap[$s['id']] = [
                        'name' => $s['name'],
                        'main_image' => $imgs[0] ?? '',
                        'price_yuan' => number_format(((int)$s['base_price']) / 100, 2, '.', ''),
                        'status' => $s['status'],
                    ];
                }
            } catch (\Throwable $e) { /* fallback */ }
        }
        foreach ($items as &$it) {
            $it['spu_name'] = $spuMap[$it['spu_id']]['name'] ?? '';
            $it['spu_main_image'] = $spuMap[$it['spu_id']]['main_image'] ?? '';
            $it['spu_price_yuan'] = $spuMap[$it['spu_id']]['price_yuan'] ?? '';
            $it['spu_status'] = $spuMap[$it['spu_id']]['status'] ?? '';
        }
        return ['topic' => $row, 'items' => $items];
    }

    public function create(array $data, string $operator): array
    {
        foreach (['code', 'name'] as $f) {
            if (empty($data[$f])) throw new \RuntimeException("{$f} 必填");
        }
        if (Db::name('marketing_topics')->where('code', $data['code'])->whereNull('deleted_at')->find()) {
            throw new \RuntimeException('code 已存在: ' . $data['code']);
        }
        $id = Db::name('marketing_topics')->insertGetId([
            'code' => $data['code'],
            'name' => $data['name'],
            'banner_image_url' => $data['banner_image_url'] ?? null,
            'description' => $data['description'] ?? null,
            'start_at' => $data['start_at'] ?? null,
            'end_at' => $data['end_at'] ?? null,
            'sort' => (int)($data['sort'] ?? 0),
            'status' => $data['status'] ?? 'enabled',
            'store_id' => isset($data['store_id']) && $data['store_id'] !== '' ? (int)$data['store_id'] : null,
            'created_by' => $operator,
        ]);
        AuditService::log('topic.create', 'topic', (string)$id, null, $data, null, $operator);
        return $this->detail($id);
    }

    public function update(int $id, array $data, string $operator): array
    {
        $row = Db::name('marketing_topics')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) throw new \RuntimeException('专题不存在');
        $update = [];
        foreach (['name', 'banner_image_url', 'description', 'start_at', 'end_at', 'sort', 'status'] as $f) {
            if (array_key_exists($f, $data)) $update[$f] = $data[$f];
        }
        if (!$update) throw new \RuntimeException('无可更新字段');
        Db::name('marketing_topics')->where('id', $id)->update($update);
        AuditService::log('topic.update', 'topic', (string)$id,
            array_intersect_key($row, $update), $update, null, $operator);
        return $this->detail($id);
    }

    public function delete(int $id, string $operator): void
    {
        $row = Db::name('marketing_topics')->where('id', $id)->whereNull('deleted_at')->find();
        if (!$row) throw new \RuntimeException('专题不存在');
        Db::name('marketing_topics')->where('id', $id)->update(['deleted_at' => date('Y-m-d H:i:s')]);
        AuditService::log('topic.delete', 'topic', (string)$id, $row, null, null, $operator);
    }

    /* ============= 关联 SPU ============= */

    public function addItems(int $topicId, array $spuIds, string $operator): array
    {
        $row = Db::name('marketing_topics')->where('id', $topicId)->whereNull('deleted_at')->find();
        if (!$row) throw new \RuntimeException('专题不存在');
        $added = 0; $skipped = 0;
        foreach ($spuIds as $sid) {
            $sid = (int)$sid;
            if (!$sid) continue;
            try {
                Db::name('marketing_topic_items')->insert([
                    'topic_id' => $topicId,
                    'spu_id' => $sid,
                    'sort' => 0,
                ]);
                $added++;
            } catch (\Throwable $e) { $skipped++; /* 唯一键约束 */ }
        }
        AuditService::log('topic.items_add', 'topic', (string)$topicId, null,
            ['spu_ids' => $spuIds, 'added' => $added, 'skipped' => $skipped], null, $operator);
        return $this->detail($topicId);
    }

    public function removeItem(int $topicId, int $spuId, string $operator): array
    {
        Db::name('marketing_topic_items')->where(['topic_id' => $topicId, 'spu_id' => $spuId])->delete();
        AuditService::log('topic.items_remove', 'topic', (string)$topicId, null,
            ['spu_id' => $spuId], null, $operator);
        return $this->detail($topicId);
    }

    /* ============= 公开读 ============= */

    public function publicList(int $limit = 10): array
    {
        $now = date('Y-m-d H:i:s');
        return Db::name('marketing_topics')->whereNull('deleted_at')
            ->where('status', 'enabled')
            ->where(function ($q) use ($now) {
                $q->whereNull('start_at')->whereOr('start_at', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('end_at')->whereOr('end_at', '>=', $now);
            })
            ->order('sort', 'asc')->order('id', 'desc')->limit($limit)
            ->field('id, code, name, banner_image_url, description, start_at, end_at')
            ->select()->toArray();
    }

    public function publicDetail(string $codeOrId): array
    {
        $now = date('Y-m-d H:i:s');
        $q = Db::name('marketing_topics')->whereNull('deleted_at')->where('status', 'enabled');
        if (ctype_digit($codeOrId)) $q->where('id', (int)$codeOrId);
        else $q->where('code', $codeOrId);
        $topic = $q->field('id, code, name, banner_image_url, description, start_at, end_at')->find();
        if (!$topic) throw new \RuntimeException('专题不存在或已结束');

        // 拉关联 SPU + 跨库 PIM 填充
        $items = Db::name('marketing_topic_items')->where('topic_id', $topic['id'])
            ->order('sort', 'asc')->field('spu_id, sort')->select()->toArray();
        $spuIds = array_column($items, 'spu_id');
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
                // iter-51 Q41-01 — 跨库填默认 sku_code 让小程序可跳详情
                $skuMap = $this->fetchFirstSkuCodes(array_keys($spus));
                foreach ($spus as $sid => &$info) $info['sku_code'] = $skuMap[$sid] ?? '';
            } catch (\Throwable $e) { /* fallback */ }
        }
        $out = [];
        foreach ($items as $it) {
            if (isset($spus[$it['spu_id']])) $out[] = $spus[$it['spu_id']];
        }
        return ['topic' => $topic, 'items' => $out];
    }

    /**
     * iter-51 Q41-01：跨库 PIM 拿 SPU 默认首个 SKU code（按 id asc）
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

    /* ============= 营销日历聚合（iter-41 核心新增）============= */

    /**
     * 拉指定时间窗内所有营销活动（banner/featured/topic/coupon）
     *   返回统一 schema：[{type, id, name, start, end, status, link}]
     */
    public function calendar(string $rangeStart, string $rangeEnd): array
    {
        $events = [];

        // 1. banners
        $banners = Db::name('banners')->whereNull('deleted_at')
            ->where(function ($q) use ($rangeEnd) {
                $q->whereNull('valid_from')->whereOr('valid_from', '<=', $rangeEnd);
            })
            ->where(function ($q) use ($rangeStart) {
                $q->whereNull('valid_to')->whereOr('valid_to', '>=', $rangeStart);
            })
            ->field('id, name, code, position, status, valid_from, valid_to')
            ->select()->toArray();
        foreach ($banners as $b) {
            $events[] = [
                'type' => 'banner',
                'id' => (int)$b['id'],
                'name' => $b['name'] . ' (' . $b['position'] . ')',
                'start' => $b['valid_from'],
                'end' => $b['valid_to'],
                'status' => $b['status'],
            ];
        }

        // 2. featured
        $featureds = Db::name('featured_items')->whereNull('deleted_at')
            ->where(function ($q) use ($rangeEnd) {
                $q->whereNull('valid_from')->whereOr('valid_from', '<=', $rangeEnd);
            })
            ->where(function ($q) use ($rangeStart) {
                $q->whereNull('valid_to')->whereOr('valid_to', '>=', $rangeStart);
            })
            ->field('id, position, spu_id, status, valid_from, valid_to')
            ->select()->toArray();
        foreach ($featureds as $f) {
            $events[] = [
                'type' => 'featured',
                'id' => (int)$f['id'],
                'name' => '推荐位 ' . $f['position'] . ' SPU#' . $f['spu_id'],
                'start' => $f['valid_from'],
                'end' => $f['valid_to'],
                'status' => $f['status'],
            ];
        }

        // 3. topics
        $topics = Db::name('marketing_topics')->whereNull('deleted_at')
            ->where(function ($q) use ($rangeEnd) {
                $q->whereNull('start_at')->whereOr('start_at', '<=', $rangeEnd);
            })
            ->where(function ($q) use ($rangeStart) {
                $q->whereNull('end_at')->whereOr('end_at', '>=', $rangeStart);
            })
            ->field('id, code, name, status, start_at, end_at')
            ->select()->toArray();
        foreach ($topics as $t) {
            $events[] = [
                'type' => 'topic',
                'id' => (int)$t['id'],
                'name' => '专题 ' . $t['name'],
                'start' => $t['start_at'],
                'end' => $t['end_at'],
                'status' => $t['status'],
            ];
        }

        // 4. coupons (iter-19+27)
        try {
            $coupons = Db::name('coupons')
                ->where(function ($q) use ($rangeEnd) {
                    $q->whereNull('valid_from')->whereOr('valid_from', '<=', $rangeEnd);
                })
                ->where(function ($q) use ($rangeStart) {
                    $q->whereNull('valid_to')->whereOr('valid_to', '>=', $rangeStart);
                })
                ->field('id, name, type, valid_from, valid_to, total_count, claimed_count')
                ->select()->toArray();
            foreach ($coupons as $c) {
                $events[] = [
                    'type' => 'coupon',
                    'id' => (int)$c['id'],
                    'name' => '券 ' . $c['name'] . " ({$c['claimed_count']}/{$c['total_count']})",
                    'start' => $c['valid_from'],
                    'end' => $c['valid_to'],
                    'status' => 'enabled',
                ];
            }
        } catch (\Throwable $e) { /* fallback skip */ }

        // iter-60 Q41-04 — banner 同 position + 时间重叠预警
        $conflicts = $this->detectBannerConflicts($events);
        foreach ($events as &$e) {
            $e['conflict'] = in_array($e['id'] . ':' . $e['type'], $conflicts['ids'], true);
        }
        unset($e);

        // 按 start 升序
        usort($events, function ($a, $b) {
            return strcmp((string)($a['start'] ?? ''), (string)($b['start'] ?? ''));
        });

        return [
            'range_start' => $rangeStart,
            'range_end' => $rangeEnd,
            'total' => count($events),
            'events' => $events,
            'conflicts' => $conflicts['pairs'], // iter-60 Q41-04
        ];
    }

    /**
     * iter-60 Q41-04：检测 banner 同 position + 时间段重叠
     * @return array{ids: string[], pairs: array<int,array{a:int,b:int,position:string}>}
     */
    private function detectBannerConflicts(array $events): array
    {
        $banners = [];
        foreach ($events as $e) {
            if ($e['type'] === 'banner' && $e['status'] === 'enabled') $banners[] = $e;
        }
        $ids = [];
        $pairs = [];
        $n = count($banners);
        for ($i = 0; $i < $n; $i++) {
            for ($j = $i + 1; $j < $n; $j++) {
                $a = $banners[$i]; $b = $banners[$j];
                // 同 position
                $posA = $this->extractPosition($a['name']);
                $posB = $this->extractPosition($b['name']);
                if ($posA !== $posB || $posA === '') continue;
                // 时间重叠：a.end >= b.start && b.end >= a.start（null 视为无限）
                $aStart = $a['start'] ?? '0000-00-00';
                $aEnd = $a['end'] ?? '9999-12-31';
                $bStart = $b['start'] ?? '0000-00-00';
                $bEnd = $b['end'] ?? '9999-12-31';
                if ($aEnd >= $bStart && $bEnd >= $aStart) {
                    $ids[] = $a['id'] . ':banner';
                    $ids[] = $b['id'] . ':banner';
                    $pairs[] = ['a' => $a['id'], 'b' => $b['id'], 'position' => $posA];
                }
            }
        }
        return ['ids' => array_values(array_unique($ids)), 'pairs' => $pairs];
    }

    private function extractPosition(string $name): string
    {
        if (preg_match('/\(([\w_]+)\)$/', $name, $m)) return $m[1];
        return '';
    }
}
