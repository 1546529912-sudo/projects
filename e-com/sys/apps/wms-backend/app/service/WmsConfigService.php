<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * WMS KV 配置（iter-32 C）
 *   - get(key, default): 取配置，未配置返回 default
 *   - set(key, value, description, operator): 写入（upsert）
 */
class WmsConfigService
{
    public const KEY_LOCATION_RECOMMEND_WEIGHTS = 'location_recommend_weights';

    public const DEFAULT_LOCATION_WEIGHTS = [
        'existing' => 40,           // 已有该 SKU 的库位（聚集）
        'golden' => 30,             // 黄金库位
        'sameZone' => 20,           // 同分区有该 SKU
        'capacity' => 10,           // 剩余容量充足
        'capacityThreshold' => 100, // 容量阈值（当前 < 此值视为充足）
    ];

    public function get(string $key, $default = null)
    {
        $row = Db::name('wms_configs')->where('config_key', $key)->find();
        if (!$row) return $default;
        $val = is_string($row['config_value']) ? json_decode($row['config_value'], true) : $row['config_value'];
        return $val !== null ? $val : $default;
    }

    public function set(string $key, $value, ?string $description = null, ?string $operator = null): array
    {
        $now = date('Y-m-d H:i:s');
        $existing = Db::name('wms_configs')->where('config_key', $key)->find();
        if ($existing) {
            $upd = [
                'config_value' => json_encode($value, JSON_UNESCAPED_UNICODE),
                'updated_by' => $operator,
            ];
            if ($description !== null) $upd['description'] = $description;
            Db::name('wms_configs')->where('id', $existing['id'])->update($upd);
            return Db::name('wms_configs')->where('id', $existing['id'])->find();
        }
        $id = Db::name('wms_configs')->insertGetId([
            'config_key' => $key,
            'config_value' => json_encode($value, JSON_UNESCAPED_UNICODE),
            'description' => $description,
            'updated_by' => $operator,
            'created_at' => $now,
        ]);
        return Db::name('wms_configs')->where('id', $id)->find();
    }

    public function getLocationWeights(): array
    {
        $cfg = $this->get(self::KEY_LOCATION_RECOMMEND_WEIGHTS, self::DEFAULT_LOCATION_WEIGHTS);
        if (!is_array($cfg)) return self::DEFAULT_LOCATION_WEIGHTS;
        return array_merge(self::DEFAULT_LOCATION_WEIGHTS, $cfg);
    }
}
