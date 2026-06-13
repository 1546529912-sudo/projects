# Reconcile Report · Iteration 25（死信队列搜索 + 翻页）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：iter-19 死信队列 UI 只能看最新 50；本迭代加搜索（job_class / exception / queue）+ 翻页（per_page / page / last_page）
- 结论：AdminFailedJobController.index 加 keyword + 分页；前端搜索框 + 翻页按钮（300ms debounce）
- 测试：PHPUnit **174/174**（+4）· pytest 22/22 · Vitest 18/18 · vue-tsc 清

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| keyword 命中字段 | **payload + exception + queue** | 三个最常用的过滤维度；都是字符串 LIKE，简单可靠 |
| 翻页风格 | **前/后 + 总页数** | 不写复杂数字翻页器；够用 |
| per_page 上限 | **200** | 防恶意拉大；20 默认；用户能看时间窗内的足量 |
| 搜索 debounce | **300ms** | 边输入边搜，不刷爆服务端 |
| 排序 | **保持 failed_at DESC** | 最新失败最关心 |
| 命中 payload 而不解析 JSON | **直接 LIKE** | JSON 子串搜索足够；不解析跨方言 SQL |

## 后端产物

| 文件 | 说明 |
|------|------|
| `app/Http/Controllers/Api/AdminFailedJobController.php` | index 加 keyword + page + per_page；返回 `page/per_page/last_page`；per_page clamp 到 [1, 200] |
| `tests/Feature/AdminFailedJobTest.php` | +4 测试（pagination meta / keyword payload+exception / keyword queue / per_page cap）→ 174/174 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/api/admin-failed-job.ts` | FailedJobList 加 page/per_page/last_page；adminListFailedJobs 改 params 对象 |
| `src/views/admin/FailedJobsPage.vue` | header 加搜索框（debounce 300ms）；表格下加前/后翻页 + 当前页/总页 |

## 端到端实测

```
# 1. seed 25 条假数据，含 9 条 displayName=DispatchWebhookJob
$ tinker ...

# 2. page 1, per_page 10
$ curl ?per_page=10&page=1 → total=26  page=1  last=3  items=10

# 3. 关键词搜 "Webhook"
$ curl ?keyword=Webhook → total=10  items=10
```

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `test_index_returns_pagination_meta` | 25 条 + per_page=10 + page=2 → total=25, page=2, last_page=3, items=10 |
| `test_index_keyword_filters_by_payload_or_exception` | keyword=StockSync → 命中 payload；keyword=TimeoutException → 命中 exception |
| `test_index_keyword_filters_by_queue_name` | keyword=special-queue → 命中 queue 字段 |
| `test_per_page_capped_at_200` | per_page=10000 → 实际 200 |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 2 后端 + 2 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 174/174（+4）· pytest 22/22 · Vitest 18/18 · vue-tsc 清 |
| 手动验收 | ✅ 真实 curl seed 25 + 翻页 + 关键词命中 9 |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/admin/failed-jobs

1. 列表默认 20 条/页
2. 搜索框输 `Webhook` → 300ms 后只显示作业类含 Webhook 的
3. 搜 `TimeoutException` → 异常含此关键字的命中
4. 搜 `default` → 队列名命中（demo 中所有队列都叫 default → 全显）
5. 多条记录时底部出现"上一页 / 第 1/N 页 / 下一页"控件，点击切换不影响搜索关键字

## 风险与已知问题

| 项 | 说明 |
|----|------|
| LIKE 在 payload (JSON) 上 | SQLite/MySQL 都能跑；遇大表（百万级）慢；可后续加 ENGINE INDEX 或落 jobs 表的 displayName 单独列 |
| 中文 keyword | 用 LIKE，单纯字符串匹配；如果未来需要全文检索，可像 RAG 那样上 FTS5 |
| 翻页不带 URL query | 切页不改 URL；刷新会回到 page=1。可后续把 page/keyword 同步到 router.query |
| `per_page=10000` 静默截到 200 | 已限制但不返错误；用户可能困惑；可后续返 422 |

## iteration-26 候选

| 方向 | 简述 |
|------|------|
| 翻页/搜索同步 URL query | iter-25 自身扩展（可刷新、可分享链接） |
| 移动端覆盖式抽屉 sidebar | iter-21 真·移动版 |
| label 协作冲突保护（updated_at 乐观锁） | iter-15 尾巴 |
| user.notify_new_device 个人开关 | iter-24 延伸 |
| pgvector / 真实快递鸟 | 阻塞 |
