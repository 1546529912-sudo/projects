<?php

namespace App\Contracts;

/**
 * 库存预扣抽象（防超卖）
 *
 * 生产实现走 Redis Lua 原子 decr；测试实现走进程内数组（与 Redis 行为等价）。
 * 调用方语义：tryReserve 通过即视为占用成功，可继续走 DB 落库；
 * 失败/异常时由调用方决定是否回滚（通常 release 回去）。
 */
interface StockManager
{
    /**
     * 原子预扣，成功返回 true。库存不足或 SKU 不存在返回 false。
     * key 未初始化时自动从 DB 回填后重试一次。
     */
    public function tryReserve(int $skuId, int $qty): bool;

    /** 回滚预扣（取消、超时取消、下单流程失败时调用）。 */
    public function release(int $skuId, int $qty): void;

    /** 用 DB 当前 stock 覆盖刷新缓存（warmup / 修复）。 */
    public function sync(int $skuId, int $stock): void;

    /** 读当前缓存值；未初始化返回 null。 */
    public function get(int $skuId): ?int;
}
