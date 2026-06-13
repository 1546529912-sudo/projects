# Reconcile Report · Iteration 12（Admin 后端权限兜底）

> 完成时间：2026-05-22

## 【当前焦点】

- 范围：补一个被忽视的安全洞 —— /api/v1/admin/* 之前**只靠前端 router meta** 拦，任何登录用户用 curl 都能绕过
- 结论：新增 EnsureAdmin 中间件，alias `role.admin`，套在 admin 路由组外层；非 admin → 403
- 测试：PHPUnit **118/118**（+5）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| Middleware vs Gate/Policy | **Middleware** | admin 是粗粒度全局权限，没有"per-resource owner check"，中间件最简 |
| 检查 `role` 还是 `active_role` | **`role`** | role 是身份（admin/individual/enterprise）；active_role 是用户在 buyer 端切的"模式"（individual/enterprise），与权限无关 |
| 403 还是 401 | **403** | 401 表示未认证；用户已登录但角色不足是 403。语义对 |
| Laravel 11 注册位置 | `bootstrap/app.php` 的 `$middleware->alias()` | 11 弃用了 Kernel.php，alias 注册放 bootstrap |

## 后端产物

| 文件 | 说明 |
|------|------|
| `app/Http/Middleware/EnsureAdmin.php` | 检查 `auth user && user->role==='admin'`，否则返 JSON 403 |
| `bootstrap/app.php` | `withMiddleware` 注册 `'role.admin' => EnsureAdmin::class` |
| `routes/api.php` | admin 路由组加 `.middleware('role.admin')`：`Route::prefix('admin')->middleware('role.admin')->group(...)` |
| `tests/Feature/AdminPolicyTest.php` | 5 测试：未登录 401 / individual 403 / enterprise 403 / admin 200 / 写接口同样 403 |

## 前端产物

无（前端 router meta.requiresAdmin 已有，现在后端兜底）。

## 端到端实测（真实 curl）

```
# 未登录
$ curl -s -H "Accept: application/json" http://localhost:8000/api/v1/admin/stock-alerts
{"code":401,"message":"请先登录","data":null}            ← 401

# 普通买家 token（role=individual）
$ curl -s -H "Authorization: Bearer 25|MSsa..." -H "Accept: application/json" .../stock-alerts
{"code":403,"message":"需要管理员权限","data":null}      ← 403

# 管理员 token（role=admin）
$ curl -s -H "Authorization: Bearer 26|r4zn..." -H "Accept: application/json" .../stock-alerts
{"code":0,"message":"ok","data":{"items":[],"total":0,...,"open_count":0}}   ← 200
```

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `AdminPolicyTest.test_unauthenticated_request_to_admin_returns_401` | 5 个 admin 端点全部返 401 |
| `AdminPolicyTest.test_individual_user_cannot_access_admin_endpoints` | 5 个端点全部 403，message 含"管理员" |
| `AdminPolicyTest.test_enterprise_user_also_cannot_access_admin_endpoints` | enterprise 也不行（不是 admin） |
| `AdminPolicyTest.test_admin_user_can_access_admin_endpoints` | admin 全部 200，code=0 |
| `AdminPolicyTest.test_non_admin_blocked_from_write_endpoints_too` | POST /admin/products 和 /admin/orders/{id}/ship 也 403 |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 4 文件（1 中间件 + 1 bootstrap + 1 路由 + 1 测试） |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 118/118（+5）· pytest 22/22 · Vitest 18/18 |
| 手动验收 | ✅ 真实 curl 三态（401/403/200）验证通过 |
| 对账报告 | ✅ |

## 用户手动验收

```bash
# 1. 重启服务（如果开发服务器在跑），让 routes 重载
cd backend-laravel && php artisan route:cache  # 可选

# 2. 浏览器：用 admin 账号（13800000001/admin123）正常进 /admin/*
# 3. 浏览器：用 buyer 账号（13900000000/buyer123）尝试手动改地址栏到 /admin/stock-alerts
#    → 前端 router 拦回首页；即使绕过前端，后端也会 403
```

## 风险与已知问题

| 项 | 说明 |
|----|------|
| role 字段不是枚举 enum 强约束 | DB 层 enum('individual','enterprise','admin')，model 没有 cast；可以扩展为更多 role 后中间件需相应调整 |
| 没有"分级权限" | 当前只 admin/非 admin 二分；如果未来需要 operator/super-admin 分级，需要扩展为 `role.in:admin,operator` 这种 |
| Gate/Policy 未引入 | 当前没有"资源级"判断（如订单只能本人或 admin 看）；OrderController.show 已经 where user_id=自己，但靠 controller 内逻辑而非 Policy |
| Sanctum token 永不过期 | 这个不是 iter-12 范围，但 demo 阶段值得标 |

## iteration-13 候选

| 方向 | 简述 |
|------|------|
| pgvector / sqlite-vec 语义检索 ⭐ | 解决 FTS5 中文 token 召回弱点（需通义/智谱 embedding key） |
| Bad Case 收集 + 标注后台 | AI 持续改善闭环 |
| 真实快递鸟接入 | 用户提供 appKey 后接入 |
| Webhook 队列化 + 重试 | iter-11 留的尾巴，提高 webhook 可靠性 |
| Sanctum token 过期 + 刷新 | 安全收尾 |
