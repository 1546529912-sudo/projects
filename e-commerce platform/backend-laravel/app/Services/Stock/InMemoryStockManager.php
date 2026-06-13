<?php

namespace App\Services\Stock;

/**
 * 测试用实现：进程内数组。PHP 单线程足以模拟 Lua 原子语义。
 */
class InMemoryStockManager extends BaseStockManager
{
    /** @var array<int,int> */
    private array $store = [];

    protected function doReserve(int $skuId, int $qty): int
    {
        if (! array_key_exists($skuId, $this->store)) {
            return self::RESULT_NOT_INITIALIZED;
        }
        if ($this->store[$skuId] < $qty) {
            return self::RESULT_INSUFFICIENT;
        }
        $this->store[$skuId] -= $qty;
        return $this->store[$skuId];
    }

    public function release(int $skuId, int $qty): void
    {
        if ($qty <= 0) return;
        if (! array_key_exists($skuId, $this->store)) return;
        $this->store[$skuId] += $qty;
    }

    public function sync(int $skuId, int $stock): void
    {
        $this->store[$skuId] = max(0, $stock);
    }

    public function get(int $skuId): ?int
    {
        return $this->store[$skuId] ?? null;
    }
}
