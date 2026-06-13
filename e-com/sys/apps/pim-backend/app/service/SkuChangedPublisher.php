<?php
declare(strict_types=1);

namespace app\service;

use think\facade\Db;

/**
 * pim.sku.changed 事件发布器
 *
 * payload: {
 *   action: "upsert" | "delete",
 *   sku_code, spu_code, spu_name, sku_name, main_image, price, is_active
 * }
 *
 * 调用方式：
 *   - publishOne($skuCode)           — SKU 维度变更（create/update/softDelete）
 *   - publishBySpu($spuId)           — SPU 维度变更（update/publish/offline）：推所有 child SKU
 *   - publishDeleteBySpu($spuId, $skuCodes) — SPU softDelete：推每个 child SKU 的 delete
 *
 * 失败不阻塞主流程：try/catch 包，仅 error_log。
 */
class SkuChangedPublisher
{
    public function __construct(private EventBus $bus = new EventBus()) {}

    public function publishOne(string $skuCode): void
    {
        $row = $this->buildPayload($skuCode);
        if ($row === null) return;
        $this->safePublish($row);
    }

    public function publishBySpu(int $spuId): void
    {
        $skuCodes = Db::name('skus')->where('spu_id', $spuId)->column('sku_code');
        foreach ($skuCodes as $code) {
            $row = $this->buildPayload($code);
            if ($row) $this->safePublish($row);
        }
    }

    /**
     * SPU softDelete 时推 delete（SKU 也已被 softDelete）
     * @param array<int, string> $skuCodes
     */
    public function publishDelete(array $skuCodes): void
    {
        foreach ($skuCodes as $code) {
            $this->safePublish([
                'action' => 'delete',
                'sku_code' => $code,
            ]);
        }
    }

    private function buildPayload(string $skuCode): ?array
    {
        $sku = Db::name('skus')->where('sku_code', $skuCode)->find();
        if (!$sku) return null;

        $spu = Db::name('spus')->where('id', $sku['spu_id'])->find();
        if (!$spu) return null;

        // 软删 → delete；否则 upsert
        if (!empty($sku['deleted_at']) || !empty($spu['deleted_at'])) {
            return ['action' => 'delete', 'sku_code' => $skuCode];
        }

        $isActive = ($spu['status'] === 'published') && ($sku['status'] === 'enabled');

        $mainImage = '';
        if (!empty($spu['main_images'])) {
            $imgs = json_decode($spu['main_images'], true);
            if (is_array($imgs) && $imgs) $mainImage = (string)$imgs[0];
        }

        $salesAttrs = json_decode($sku['sales_attrs'] ?? '[]', true) ?: [];
        $skuName = $this->buildSkuName($salesAttrs);

        return [
            'action' => 'upsert',
            'sku_code' => $skuCode,
            'spu_code' => (string)$spu['code'],
            'spu_name' => (string)$spu['name'],
            'sku_name' => $skuName,
            'main_image' => $mainImage,
            'price' => (int)$sku['price'],
            'is_active' => $isActive,
        ];
    }

    /**
     * sales_attrs: [{"name":"颜色","value":"红"},{"name":"尺码","value":"L"}] → "红 / L"
     * 或 {"颜色":"红","尺码":"L"} → "红 / L"
     */
    private function buildSkuName(array $salesAttrs): string
    {
        $parts = [];
        foreach ($salesAttrs as $k => $v) {
            if (is_array($v) && isset($v['value'])) {
                $parts[] = (string)$v['value'];
            } else {
                $parts[] = (string)$v;
            }
        }
        return implode(' / ', array_filter($parts, fn($s) => $s !== ''));
    }

    private function safePublish(array $payload): void
    {
        try {
            $this->bus->publish('pim.sku.changed', $payload);
        } catch (\Throwable $e) {
            error_log("[SkuChangedPublisher] publish 失败 sku={$payload['sku_code']} err=" . $e->getMessage());
        }
    }
}
