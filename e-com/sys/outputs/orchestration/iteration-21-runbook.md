# iteration-21-runbook.md · 运营 Dashboard 增强四件套

## 一、文件清单（共 ~5 文件，3 Wave）

### Wave 1 · 后端 stats 扩展（OMS Admin）
1. `apps/oms-backend/app/controller/Admin.php` — `stats()` 加 4 个新字段：`coupon_metrics` / `coupon_series` / `review_metrics` / `retention_metrics`；`exportOrders()` 加 `coupon_name` + `discount_yuan` 两列（Q19-06）

### Wave 2 · Vue Dashboard 加 3 新图 + KPI
2. `apps/shop-admin/src/pages/Dashboard.vue` — 加券核销率折线图 + 评价 KPI 卡 + 留存复购 KPI 卡 + 周月趋势图

### Wave 3 · 测试
3. `outputs/testing/iteration-21-auto-test.md`
4. `outputs/testing/iteration-21-manual-test.md`

> 5 个文件中 1 改 1 改 + 2 测试 + 1 runbook/reconcile。**真正修改的代码文件只有 2 个**。

## 二、四件套设计

### A · 券核销率图（Q19-07）
**后端**：
- `coupon_metrics`: 总览
  - `total_claimed`: 历史累计领取
  - `total_used`: 历史累计核销
  - `overall_use_rate_pct`: total_used / total_claimed × 100
- `coupon_series`: 日序列（最近 N 天）
  - 每日 claimed + used + use_rate_pct（按 user_coupons.received_at 与 used_at 分组）

**前端**：折线图 — 双轴或单图，X 轴日期，Y1 领取数 / 已用数，单独显示日核销率%。

### B · 评价数据周月统计
**后端**：
- `review_metrics`:
  - `total_reviews`: 累计评价数（active 状态，跨库读 shop_db.reviews）
  - `avg_rating`: 累计平均分（active）
  - `recent_reviews`: 最近 N 天评价数
  - `recent_avg_rating`: 最近 N 天平均分
- `review_series`: 日序列 — 每日评价数 + 当日平均分

**前端**：1 张评价 KPI 卡（总数 / 均分 / 最近 N 天均分趋势）+ 折线图（评价数趋势）

### C · 用户留存 / 复购率
**后端**：
- `retention_metrics`:
  - `total_users`: shop_db.users 总数
  - `total_buyers`: 至少下过 1 单的用户数（distinct user_id from oms_db.orders WHERE status≠pending_pay）
  - `repeat_buyers`: 下过 ≥2 单的用户数
  - `buyer_rate_pct`: total_buyers / total_users × 100
  - `repeat_rate_pct`: repeat_buyers / total_buyers × 100
- 跨库需求：users 在 shop_db、orders 在 oms_db → 用 shop 副连接 count users，本库 count buyers

**前端**：3 个 KPI 卡（总用户 / 下单用户占比 / 复购率）+ 1 个"客户漏斗"小条形图

### D · CSV 导出加优惠券列（Q19-06）
**后端**：
- `exportOrders` SQL 加 LEFT JOIN user_coupons + coupons → 取 coupon_name
- 增加两列：`优惠券` / `优惠金额(¥)`
- 已用 `discount` 字段计算 yuan

**前端**：无改动（已有"导出 CSV"按钮）。

## 三、关键设计决策

| 主题 | 决策 |
|---|---|
| 单接口扩展 vs 多接口 | 沿用 iter-18 单 `/admin/stats` 大响应模式（前端一次加载） |
| 跨库读 | 评价数（shop_db.reviews）+ 用户数（shop_db.users）走 OMS 已有 `shop` 副连接（iter-20 加） |
| 复购定义 | 至少 2 单（排除 pending_pay），iter-21 不细分时间窗 |
| 留存定义简化 | buyer_rate = 下单用户/总用户；不引入"N 天内活跃"（无埋点） |
| 评价均分 | 仅 active 状态计入（隐藏的不算） |
| 周月统计 | 复用 days 参数 + time_series 模式，**不引入"周/月"切换**（一旦 days=30 自然就是月） |
| CSV 加列位置 | 在金额列之后插 优惠券+优惠金额，不改 BOM 与编码 |

## 四、避坑

| 风险 | 规避 |
|---|---|
| 用户数跨库统计慢 | shop_db.users 通常 ~10K，count() 单次几 ms，不缓存 |
| coupon used_count 与 user_coupons 不一致 | 用 user_coupons.used_at 作为权威源；coupons.used_count 仅用于"概览" |
| 评价隐藏后影响均分 | aggregate 时只算 active；hidden 不计 |
| CSV LEFT JOIN 多匹配 | user_coupons.order_no UNIQUE 约束没建，但业务上一单一券；GROUP BY order_no 兜底 |
| 时间序列 NULL | 沿用 iter-18 PHP 补 0 模式 |

## 五、待用户运行验证（2 步）

1. **重启 oms-backend**（无 migration，仅 controller 改）：
   ```bash
   docker-compose restart oms-backend
   ```
2. **Vue 前端热更**（vite 自动监听）

> auto-test 我跑（curl）→ `iteration-21-auto-test.md`
> manual-test 用户跑（UI）→ `iteration-21-manual-test.md`

## 六、剩余非阻塞（M3+）
- Q21-01：留存按时间窗细分（7/30/90 天注册-下单转化）
- Q21-02：复购按时间段（最近 30 天 ≥2 单）
- Q21-03：评价周/月切换（取代纯 days）
- Q21-04：券核销漏斗（领取→使用 + 时长分布）
- Q21-05：Dashboard 时间筛选加自定义日期范围
