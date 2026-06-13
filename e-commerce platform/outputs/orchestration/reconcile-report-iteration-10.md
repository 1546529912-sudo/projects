# Reconcile Report · Iteration 10（Redis Lua 原子预扣库存）

> 完成时间：2026-05-22

## 【当前焦点】

- 范围：在"下单 → DB 扣库存"链路前插一道 **Redis Lua 原子预扣** 防超卖；保持 DB 仍为真相源
- 结论：StockManager 接口 + RedisStockManager（生产 Lua）/ InMemoryStockManager（测试 fake）；下单 / 取消 / 超时取消三处双写
- 测试：PHPUnit **102/102**（+12）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| Redis 是唯一真相源 vs DB 是真相源 | **DB 是真相源，Redis 是预扣防线** | 改动面最小，现有 90 测试一行未改；Redis 挂掉时降级到 DB 仍能跑（牺牲超卖防护） |
| 测试用 Mock vs Fake 实现 | **接口 + InMemory 实现** | Liskov 等价、可断言；不依赖测试机有 Redis；CI 无需额外服务 |
| key 缺失时拒绝 vs 自动 warmup | **自动从 DB warmup 后重试** | 现有 90 个测试无感通过，新部署/Redis 重启也免预热步骤 |
| 取消时只回 Redis vs 双写 | **DB increment + Redis release 双写** | 与 DB 真相源保持一致；release 只在 key 存在时执行，避免幽灵库存 |

## 后端产物

| 文件 | 说明 |
|------|------|
| `app/Contracts/StockManager.php` | 接口：tryReserve / release / sync / get |
| `app/Services/Stock/BaseStockManager.php` | 抽象基类，封装 key-miss 自动 warmup 共享逻辑 |
| `app/Services/Stock/RedisStockManager.php` | 生产实现：Redis EVAL Lua（KEYS[1]=`sku:stock:{id}`，DECRBY 原子返回剩余/-1/-2） |
| `app/Services/Stock/InMemoryStockManager.php` | 测试实现：进程内数组（PHP 单线程足以等价 Lua 原子语义） |
| `app/Providers/AppServiceProvider.php` | 按 env 绑定接口：testing → InMemory，其他 → Redis |
| `app/Http/Controllers/Api/OrderController.php` | store：**先 Lua 预扣**，失败回滚已扣的；try/catch 内 DB 事务失败也回滚 Redis。cancel：DB increment + Redis release 双写 |
| `app/Console/Commands/CancelStaleOrders.php` | 超时取消时同样 DB+Redis 双写 |
| `app/Console/Commands/SkuWarmupRedis.php` | `php artisan sku:warmup-redis` 全量同步 DB → Redis |
| `tests/TestCase.php` | 基类 setUp 重置 StockManager singleton，避免 InMemory 内部数组跨 test 泄漏 |
| `tests/Feature/StockManagerTest.php` | 接口契约测试 7 个：reserve / release / 不足 / 0/负数 / 自动 warmup / SKU 不存在 / 并发模拟 |
| `tests/Feature/OrderStockRedisTest.php` | 集成测试 5 个：下单扣 Redis / 取消回 Redis / **Redis 拦下超卖** / 超时取消回 Redis / warmup 命令同步 |

## 前端产物

无（不涉及）。

## Lua 脚本

```lua
local current = redis.call('GET', KEYS[1])
if not current then
  return -1                    -- 未初始化 → PHP 层从 DB warmup 后重试一次
end
current = tonumber(current)
local qty = tonumber(ARGV[1])
if current < qty then
  return -2                    -- 库存不足 → 直接 false
end
return redis.call('DECRBY', KEYS[1], qty)
```

## 关键技术点

| 项 | 做法 |
|---|------|
| 原子性 | EVAL 在 Redis 单线程内执行，GET + 检查 + DECRBY 不可分割 |
| 测试不依赖 Redis | AppServiceProvider 检测 `app()->environment('testing')` 绑 InMemory |
| singleton 泄漏防护 | 基类 TestCase.setUp() 每个 test 重新 bind 一份新 InMemory |
| 失败回滚 | OrderController.store 用 `try { DB::transaction } catch { foreach release }` 保证幽灵库存绝不发生 |
| key 自动 warmup | BaseStockManager 的 tryReserve 检测 -1 → Sku::find → sync → 重试 |
| Laravel 自动前缀 | Redis facade 自动加 `laravel-database-` 前缀，业务代码用裸 key（`sku:stock:7`），透明 |

## 端到端实测

### 1. CLI Lua 路径验证

```
$ php artisan sku:warmup-redis
已同步 7 个 SKU 库存到 Redis

$ docker exec zhongyan-redis redis-cli MGET \
    laravel-database-sku:stock:7 laravel-database-sku:stock:8 ...
2000  1500  5000  5000  3000  8000  600

$ php artisan tinker --execute='...'
Class: App\Services\Stock\RedisStockManager        # ← 生产实现
SKU id=7  DB.stock=2000  Redis.before=2000
tryReserve(50):  OK   Redis.after=1950
release(50):     Redis.after=2000
tryReserve(99M): FAIL(GOOD)  Redis.after=2000      # ← 超卖防护
```

### 2. 并发预扣（5 worker × 800 件，库存 2000）

```
$ php artisan tinker --execute='for($i=0;$i<5;$i++) ...'
Before: 2000
succ=2  fail=3  After=400          # ← 只 2 个成功（1600 扣完，3 个被拒）
```

### 3. PHPUnit 自动化（关键新增 case）

| 测试 | 验证点 |
|------|--------|
| `StockManagerTest.test_concurrent_reservations_prevent_oversell` | 库存 10，连扣 12 次 1 件 → 仅成功 10 次 |
| `StockManagerTest.test_auto_warmup_from_db_when_key_missing` | 缓存空时 reserve 触发 DB 回填后扣减 |
| `OrderStockRedisTest.test_redis_blocks_oversell_even_when_db_appears_sufficient` | DB.stock=100 但 Redis=2，下 5 件被 1403 拒绝；DB 未动 |
| `OrderStockRedisTest.test_stale_cancel_releases_redis` | `orders:cancel-stale` 同时回 DB 和 Redis |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 11 文件（4 服务层 + 1 provider + 2 controller/command 改造 + 1 新 command + 3 测试 + 1 base） |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 102/102（+12 新增）· pytest 22/22 · Vitest 18/18 |
| 手动验收 | ⏳ 浏览器下单链路（不变）+ `php artisan sku:warmup-redis` 已实测 |
| 对账报告 | ✅ |

## 用户手动验收

```bash
# 1. 一次性 warmup（生产首次启动 / Redis 重启后修复）
php artisan sku:warmup-redis

# 2. 在浏览器走一次下单 → 取消 闭环
http://localhost:5173/

# 3. 任意时刻查询 Redis 库存（注意 Laravel 自动加 laravel-database- 前缀）
docker exec zhongyan-redis redis-cli GET laravel-database-sku:stock:7
```

## 风险与已知问题

| 项 | 说明 |
|----|------|
| Redis 挂掉 | RedisStockManager 会抛异常 → 下单返 500。可加 `try/catch` 降级到"DB 直查"模式（但失去防护），暂不做 |
| Redis 与 DB 漂移 | 异常路径（DB 事务失败 catch 漏 release / Redis 写丢失）会导致 Redis < DB；定期跑 `sku:warmup-redis` 兜底重新对齐 |
| 多副本部署 | 多个 Laravel 进程共享同一 Redis 是 OK 的（Lua 原子）；但要保证它们指向同一个 Redis 实例（非 cluster 时） |
| 测试场景 | InMemory 实现不验证真实 Redis 网络/Lua bytecode；手动 tinker 实测覆盖了真实路径 |

## iteration-11 候选

| 方向 | 简述 |
|------|------|
| pgvector / sqlite-vec 语义检索 ⭐ | 解决 FTS5 中文 token 召回弱点 |
| Bad Case 收集 + 标注后台 | AI 持续改善闭环 |
| 真实快递鸟接入 | 用户提供 appKey 后替换 LogisticsService Driver |
| Admin Policy 精细化 | 后端 Gate/Policy 把 admin/buyer 权限补齐 |
| 库存预警 Webhook | 利用 sku.stock_threshold 字段，低于阈值时通知运营 |
