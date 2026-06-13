# Reconcile Report · Iteration 19（死信队列后台 UI）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：iter-17 留的尾巴 —— Webhook 队列化做完了，但 webhook 重试用尽后 job 进 failed_jobs 表，之前只能 CLI 看。补后台 UI：列表 / 重试 / 删除 / 清空 / Dashboard 卡片
- 结论：AdminFailedJobController 5 个端点；前端 [FailedJobsPage](frontend/src/views/admin/FailedJobsPage.vue) 异常详情可展开；Dashboard 红卡片
- 测试：PHPUnit **157/157**（+8）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| 重试实现 | **`Artisan::call('queue:retry', ['id' => [$uuid]])`** | Laravel 内建命令最稳；不重新发明轮子 |
| 列表 payload | **PHP 端 decode 关键字段（displayName / attempts）** | 原始 payload 太长太丑；前端要的是可读摘要 |
| 异常摘要 | **400 字截断 + 详情行点击展开** | 列表清爽；要排查时一键看完整 stacktrace |
| 清空操作 | **二次 confirm** | 不可逆；防误点 |
| 鉴权 | **沿用 iter-12 admin 中间件** | 一致；无新增 |
| `oldest_at` 字段 | **直接返 min()，不包 optional()** | optional 序列化成 `{}` 是个 Laravel 坑（已踩 + 修） |

## 后端产物

| 文件 | 说明 |
|------|------|
| `app/Http/Controllers/Api/AdminFailedJobController.php` | index / retry / destroy / clear / stats 五方法；toJson 解 payload |
| `routes/api.php` | + 5 条 admin 路由 |
| `tests/Feature/AdminFailedJobTest.php` | 8 测试：list / delete / delete 404 / clear / stats / retry / retry 404 / 非 admin 403 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/api/admin-failed-job.ts` | 5 个 API + 类型 |
| `src/views/admin/FailedJobsPage.vue` | 表格 + UUID 短形点击展开异常详情红底 + 重试/删除按钮 + 顶部清空 |
| `src/views/admin/DashboardPage.vue` | + 死信队列红色卡片（健康时绿色"✓ 队列健康"） |
| `src/router/index.ts` | + /admin/failed-jobs |
| `src/views/profile/MePage.vue` | admin 快捷入口加 "死信队列 →" |

## 端到端实测

```bash
# 1. 用 tinker 造 1 条失败作业
$ tinker DB::table('failed_jobs')->insert([...])

# 2. stats
$ curl ... /admin/failed-jobs/stats
{"code":0,"data":{"count":1,"oldest_at":"2026-05-23 01:29:07","latest_at":"2026-05-23 01:29:07"}}

# 3. list（payload 已解码）
$ curl ... /admin/failed-jobs
{"items":[{"uuid":"f7f28c66-...","job_class":"App\\Jobs\\DispatchWebhookJob","attempts":3,
  "exception_excerpt":"RuntimeException: Webhook failed (attempt 3/3): HTTP 500",
  "failed_at":"2026-05-23 01:29:07"}], "total":1}
```

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `test_admin_lists_failed_jobs_with_decoded_metadata` | payload 解码 → job_class / attempts / exception_excerpt 正确 |
| `test_admin_delete_removes_single_failed_job` | DELETE /failed-jobs/{uuid} → DB 行删 |
| `test_admin_delete_404_when_not_found` | 不存在 uuid → 404 |
| `test_admin_clear_removes_all` | POST /clear → 全删 + 返 cleared count |
| `test_admin_retry_removes_from_failed_table` | POST /retry → queue:retry 命令把 uuid 从 failed_jobs 删除 |
| `test_admin_retry_404_when_not_found` | 不存在 → 404 |
| `test_non_admin_blocked_from_all_endpoints` | iter-12 中间件继续护住（403） |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 3 后端 + 5 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 157/157（+8）· pytest 22/22 · Vitest 18/18 |
| 手动验收 | ✅ curl stats/list 实测正常返回 |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. admin 登录 → /admin → 新卡片 "死信队列"（绿色 ✓ 队列健康）
2. 模拟一条失败作业（用上面 tinker 命令）→ 刷新 Dashboard → 卡片变红色 "1 ⚠️"
3. 点进 /admin/failed-jobs → 看到列表（失败时间 / 作业类 / 队列 / UUID / 异常摘要 / 操作）
4. 点 UUID 短形 → 展开下方红底完整异常详情
5. 点"重试" → 该行消失（已重新入队；作业还会再失败 3 次）
6. 想一次清干净：右上"🗑 清空全部"，二次 confirm 后清空

## 风险与已知问题

| 项 | 说明 |
|----|------|
| 列表无分页 | 默认 50 条；失败作业堆积上千时性能不够；可加翻页 |
| 重试无确认 | 重试是幂等的（再失败也只是重新入 failed_jobs），所以没加二次确认 |
| stacktrace 解析弱 | 只 preg_replace 折行；没解析成 file:line 链接 |
| 无搜索 | 想按 job_class 或时间窗找暂时只能滚 |
| Artisan::call 在并发下 | queue:retry 本身原子；但同时点两次同 uuid 第二次会无效（已删）这是正确行为 |

## iteration-20 候选

| 方向 | 简述 |
|------|------|
| pgvector / sqlite-vec 语义检索 | 需 embedding API key |
| 真实快递鸟接入 | 需 appKey |
| label 协作冲突保护（updated_at 乐观锁） | iter-15 尾巴 |
| 主动登出所有设备 / 设备管理 | iter-18 延伸 |
| ai-service 一侧 confidence 标准化 | iter-16 留的下游 |
| 失败作业按时间窗 / 类型 搜索 + 翻页 | iter-19 自身扩展 |
