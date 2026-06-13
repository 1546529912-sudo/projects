<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * 上架推荐（iter-22；iter-32 C 权重改可配，从 wms_configs 读，缺省 fallback 默认值）
 *   返回 Top3 库位 + 评分 + 推荐理由
 *
 * 默认权重（可经 WmsConfigService 覆盖）：
 *   - 已有该 SKU 的库位（聚集效应）：+40
 *   - 黄金库位（is_golden=1）：+30
 *   - 同分区已有该 SKU 的库位附近：+20
 *   - 剩余容量充足（当前总 quantity < capacityThreshold）：+10
 */
class LocationRecommendService
{
    public function recommend(string $skuCode, int $qty, string $warehouseCode, int $topN = 3): array
    {
        $weights = (new WmsConfigService())->getLocationWeights();
        // 取该仓库所有 available 库位
        $locations = Db::name('locations')
            ->where('warehouse_code', $warehouseCode)
            ->where('status', 'available')
            ->select()->toArray();
        if (!$locations) return [];

        // 取 SKU 已有库位（不限本仓库 —— 优先看本仓有没有，没有再看跨仓的）
        $existing = Db::name('inventory')
            ->where('sku_code', $skuCode)
            ->where('status', 'normal')
            ->field('location_code, SUM(quantity) AS total_qty')
            ->group('location_code')
            ->select()->toArray();
        $existingMap = array_column($existing, 'total_qty', 'location_code');

        // 已有 SKU 的库位中、本仓的 zone 集合
        $existingZones = [];
        foreach ($locations as $loc) {
            if (isset($existingMap[$loc['location_code']])) $existingZones[$loc['zone']] = true;
        }

        // 取每个库位当前占用（所有 SKU 总 quantity）
        $locCodes = array_column($locations, 'location_code');
        $usage = $locCodes ? Db::name('inventory')
            ->whereIn('location_code', $locCodes)
            ->field('location_code, SUM(quantity) AS used_qty')
            ->group('location_code')
            ->select()->toArray() : [];
        $usageMap = array_column($usage, 'used_qty', 'location_code');

        // 算分
        $scored = [];
        foreach ($locations as $loc) {
            $score = 0;
            $reasons = [];

            if (isset($existingMap[$loc['location_code']])) {
                $score += (int)$weights['existing'];
                $reasons[] = '已有 ' . (int)$existingMap[$loc['location_code']] . ' 件该 SKU（聚集 +' . (int)$weights['existing'] . '）';
            }
            if (!empty($loc['is_golden'])) {
                $score += (int)$weights['golden'];
                $reasons[] = '黄金库位 +' . (int)$weights['golden'];
            }
            if (!isset($existingMap[$loc['location_code']]) && isset($existingZones[$loc['zone']])) {
                $score += (int)$weights['sameZone'];
                $reasons[] = '同分区有该 SKU +' . (int)$weights['sameZone'];
            }
            $used = (int)($usageMap[$loc['location_code']] ?? 0);
            $threshold = (int)$weights['capacityThreshold'];
            if ($used < $threshold) {
                $score += (int)$weights['capacity'];
                $reasons[] = "剩余容量充足（当前 {$used} 件 < {$threshold} +" . (int)$weights['capacity'] . ')';
            }
            // iter-69 Q25-02 max_quantity 精确容量校验：超过最大容量则剔除
            $maxQ = (int)($loc['max_quantity'] ?? 0);
            if ($maxQ > 0 && ($used + $qty) > $maxQ) {
                continue; // 装不下，剔除该库位
            }
            if (!$reasons) $reasons[] = '常规可用库位';

            $scored[] = [
                'location_code' => $loc['location_code'],
                'warehouse_code' => $loc['warehouse_code'],
                'zone' => $loc['zone'],
                'is_golden' => (bool)$loc['is_golden'],
                'current_qty' => $used,
                'score' => $score,
                'reasons' => $reasons,
            ];
        }
        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
        return array_slice($scored, 0, $topN);
    }
}
