<?php

namespace App\Services\Stock;

use App\Contracts\StockManager;
use App\Models\Sku;

/**
 * tryReserve 的 key-miss 自动 warmup 共享逻辑放这里。
 * 子类只实现 doReserve / release / sync / get 四个原语。
 */
abstract class BaseStockManager implements StockManager
{
    public const RESULT_NOT_INITIALIZED = -1;
    public const RESULT_INSUFFICIENT = -2;

    public function tryReserve(int $skuId, int $qty): bool
    {
        if ($qty <= 0) return false;

        $result = $this->doReserve($skuId, $qty);

        if ($result === self::RESULT_NOT_INITIALIZED) {
            $sku = Sku::find($skuId);
            if (! $sku) return false;
            $this->sync($skuId, (int) $sku->stock);
            $result = $this->doReserve($skuId, $qty);
        }

        return $result >= 0;
    }

    /**
     * 原子检查 + 扣减。返回值约定：
     *   >=0 成功，剩余库存
     *   -1  key 未初始化（BaseStockManager 会自动 warmup 后重试）
     *   -2  库存不足
     */
    abstract protected function doReserve(int $skuId, int $qty): int;
}
