<?php
declare(strict_types=1);

namespace app\service\handler;

use think\facade\Db;

/**
 * 处理 pim.sku.changed 事件：
 *   - action=upsert: UPDATE 或 INSERT wms_products
 *   - action=delete: DELETE wms_products WHERE sku_code=?
 *
 * 幂等：upsert 重复处理结果一致；delete 不存在的 SKU 直接 NOOP。
 */
class PimSkuChangedHandler
{
    public function __invoke(array $payload, string $eventId = '', string $traceId = ''): void
    {
        $action = (string)($payload['action'] ?? '');
        $sku = (string)($payload['sku_code'] ?? '');
        if (!$sku) {
            throw new \RuntimeException('payload 缺字段: sku_code');
        }

        if ($action === 'delete') {
            $deleted = Db::name('wms_products')->where('sku_code', $sku)->delete();
            fwrite(STDOUT, "[handler] pim.sku.delete sku={$sku} affected={$deleted}\n");
            return;
        }

        if ($action !== 'upsert') {
            throw new \RuntimeException("未知 action: {$action}");
        }

        $data = [
            'sku_code' => $sku,
            'spu_code' => (string)($payload['spu_code'] ?? ''),
            'spu_name' => (string)($payload['spu_name'] ?? ''),
            'sku_name' => (string)($payload['sku_name'] ?? ''),
            'main_image' => (string)($payload['main_image'] ?? ''),
            'price' => (int)($payload['price'] ?? 0),
            'is_active' => !empty($payload['is_active']) ? 1 : 0,
        ];

        $exist = Db::name('wms_products')->where('sku_code', $sku)->find();
        if ($exist) {
            unset($data['sku_code']);
            Db::name('wms_products')->where('sku_code', $sku)->update($data);
            fwrite(STDOUT, "[handler] pim.sku.update sku={$sku} active={$payload['is_active']}\n");
        } else {
            Db::name('wms_products')->insert($data);
            fwrite(STDOUT, "[handler] pim.sku.insert sku={$sku} active={$payload['is_active']}\n");
        }
    }
}
