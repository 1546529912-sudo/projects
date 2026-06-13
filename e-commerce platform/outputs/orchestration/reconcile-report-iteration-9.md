# Reconcile Report · Iteration 9（物流跟踪 + 超时自动取消）

> 完成时间：2026-05-22

## 【当前焦点】

- 范围：TRADE-006-03 物流跟踪 + TRADE-005-04 30 分钟未付款自动取消
- 结论：发货生成 3 节点 mock 物流轨迹；超时订单 Laravel Schedule 每分钟扫一次自动取消并释放库存
- 测试：PHPUnit **90/90**（新增 5）· pytest 22/22 · Vitest 18/18

## 后端产物

| 文件 | 说明 |
|------|------|
| `migrations/2026_05_22_000013_create_logistics_tracks.php` | `logistics_tracks` 表 |
| `Models/LogisticsTrack.php` | + occurred_at datetime cast |
| `Services/LogisticsService.php` | `generateMockTracks` 一次性写入 3 节点（揽件/转运/派送）+ `appendDeliveredNode` 用户确认时补"已签收" + `getTracks` |
| `Console/Commands/CancelStaleOrders.php` | `php artisan orders:cancel-stale --minutes=30` 取消超时 + 释放库存 |
| `bootstrap/app.php` | `withSchedule`：每分钟扫一次 |
| `OrderAdminController.ship` | 写入 tracking_no 后调 LogisticsService 生成轨迹 |
| `OrderController.confirmReceipt` | 触发"已签收"节点 |
| `OrderController.orderDetail` | 返回 `tracks[]` 字段（最新在前） |

## 前端产物

| 文件 | 说明 |
|------|------|
| `api/order.ts` | + `LogisticsTrack` 类型；`OrderDetail.tracks?` |
| `views/order/OrderDetailPage.vue` | + **倒计时 banner**（pending_payment 状态显示剩余 mm:ss）+ **物流时间线**（彩色 dot + 节点标签 + 时间 + 位置）；删除原 tracking_no 简单展示 |

## 端到端实测

```
1. admin 发货 顺丰 SF202605221234
   → 3 条轨迹生成：
     [accepted]    08:57:12  【顺丰】快递员已揽件，运单号 SF202605221234
     [transit]     14:27:12  【转运中】快件已离开深圳，发往目的城市
     [dispatching] 次日 08:27 【派送中】快件已到达派送网点，开始派送

2. buyer 进订单详情
   → 物流轨迹时间线倒序展示（最新在上）+ 物流公司+单号 mono 字体

3. CLI 触发超时取消任务（--minutes=1）
   → "已取消 1 个超时订单（阈值：1 分钟）"
   → 订单 status=cancelled，cancel_reason="1 分钟内未支付，系统自动取消"
   → SKU 库存恢复
```

## 关键技术点

| 项 | 做法 |
|---|------|
| Provider 抽象 | `LogisticsService` 仅暴露 generateMockTracks/appendDeliveredNode/getTracks 三方法；接入快递鸟时新增 Driver，业务侧零改动 |
| 轨迹时间合成 | 揽件 = 发货+30min / 转运 = +6h / 派送 = +24h（Carbon 推算）|
| 签收节点延迟生成 | shipped 时只写前 3 节点；用户确认收货时补 delivered 节点 |
| Schedule 注册 | Laravel 11 用 `withSchedule()` 在 bootstrap/app.php 注册 |
| Schedule 频率 | 每分钟扫一次 pending_payment + created_at < 30min 之前 |
| 库存释放 | DB::transaction 包住 status 更新 + SKU.stock increment |
| 倒计时 UI | onMounted 起 1s interval，computed 算 deadline - now，到 0 显示"等定时任务自动取消" |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 7 后端 + 2 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 90/90（+5）|
| 手动验收 | ⏳ |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. 任意 buyer 下单 → 进订单详情 → **顶部黄色 banner：⏰ 请在 29:50 内完成支付**（每秒倒数）
2. admin 进订单管理 → 发货 → buyer 端订单详情看到 **物流时间线**（揽件 / 转运 / 派送 三个节点 + 时间）
3. 用户确认收货 → 时间线多一条**已签收**节点（绿色 dot）
4. 想观察自动取消：等 30 分钟，或用 `php artisan orders:cancel-stale --minutes=1` 强制触发

## 风险与已知问题

| 项 | 说明 |
|----|------|
| Mock 物流时间 | 揽件/转运/派送 时间是发货时一次性算好的，不是真实物流轨迹推进 |
| 真实快递鸟接入 | 留 LogisticsService\Drivers\KdNiao 占位，提供 appKey/appId 后可换 |
| Schedule 需 cron 拉起 | 生产部署需在服务器 cron 加：`* * * * * cd /path && php artisan schedule:run` |
| 倒计时表示已超时 | 客户端到 0 仅 UI 提示，实际取消依赖 Schedule（最长 1 分钟内执行）|

## iteration-10 候选

| 方向 | 简述 |
|------|------|
| **pgvector + embedding** ⭐ | 解决 FTS5 中文按字 token 语义召回弱 |
| Redis Lua 预扣库存 | 防超卖 + 性能提升 |
| Bad Case 收集 + 标注 | AI 持续改善闭环 |
| 真实快递鸟接入 | 用户提供账号后可接 |
| Admin Policy 精细化 | 后端权限校验 |
