<?php

namespace App\Services\Stock;

use Illuminate\Support\Facades\Redis;

/**
 * 生产实现：Redis EVAL 原子预扣。
 * 每个 SKU 一个 string key：sku:stock:{id}（值为可售数量）。
 */
class RedisStockManager extends BaseStockManager
{
    private const KEY_PREFIX = 'sku:stock:';

    /**
     * KEYS[1] = sku:stock:{id}
     * ARGV[1] = qty
     * 返回：剩余库存 / -1 未初始化 / -2 不足
     */
    private const LUA_RESERVE = <<<'LUA'
local current = redis.call('GET', KEYS[1])
if not current then
  return -1
end
current = tonumber(current)
local qty = tonumber(ARGV[1])
if current < qty then
  return -2
end
return redis.call('DECRBY', KEYS[1], qty)
LUA;

    protected function doReserve(int $skuId, int $qty): int
    {
        $result = Redis::eval(self::LUA_RESERVE, 1, $this->key($skuId), $qty);
        return (int) $result;
    }

    public function release(int $skuId, int $qty): void
    {
        if ($qty <= 0) return;
        $key = $this->key($skuId);
        if (! Redis::exists($key)) return; // 未 warmup 时跳过，避免出现幽灵库存
        Redis::incrby($key, $qty);
    }

    public function sync(int $skuId, int $stock): void
    {
        Redis::set($this->key($skuId), max(0, $stock));
    }

    public function get(int $skuId): ?int
    {
        $value = Redis::get($this->key($skuId));
        return $value === null ? null : (int) $value;
    }

    private function key(int $skuId): string
    {
        return self::KEY_PREFIX.$skuId;
    }
}
