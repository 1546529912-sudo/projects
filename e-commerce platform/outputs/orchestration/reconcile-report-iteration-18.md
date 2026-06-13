# Reconcile Report · Iteration 18（Sanctum token 过期 + 滑动续期）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：之前 demo Sanctum token 永不过期是明显的安全洞。补：120 分钟默认过期 + 临期 30 分钟时自动续期（X-Refresh-Token 响应头送回前端，无感）+ 显式 `/auth/refresh` 兜底
- 结论：用户活跃时自动滑动续期，永不被踢；不活跃 ≥ 30 分钟后自然过期 → 401 → 重新登录
- 测试：PHPUnit **149/149**（+6）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| Access + Refresh token 双 token | **单 token 滑动续期** | 简单清晰；Sanctum 不原生支持双 token；demo 不值得引入 JWT |
| 续期时机：定时 vs 临期 | **临期 30 分钟自动续** | 用户感知零；活跃必续；不活跃自然死 |
| 续期信道：response header vs response body | **header (X-Refresh-Token)** | 不污染业务 body schema；任何接口都可以续；前端拦截器统一处理 |
| 过期时间默认值 | **120 分钟** | 短到能控风险（被偷 token 最多用 2h），长到不打扰用户 |
| `expiration=null` 的语义 | **保留旧行为：永不过期** | 给"绝对不想要"的部署逃生通道 |
| 显式 `/auth/refresh` | **保留** | 前端可主动续；调试也方便 |

## 后端产物

| 文件 | 说明 |
|------|------|
| `config/sanctum.php` | `expiration` 从 null 改为 `env('SANCTUM_TOKEN_EXPIRATION', 120)` |
| `app/Http/Middleware/RotateTokenIfNearExpiry.php` | 临期 30 分钟时签新 token、删旧、设 `X-Refresh-Token` / `X-Refresh-Expires-In` 头 |
| `bootstrap/app.php` | alias `rotate.token` |
| `routes/api.php` | `auth:sanctum` 组改 `['auth:sanctum', 'rotate.token']` —— 全 auth 接口都享受滑动续期 |
| `app/Http/Controllers/Api/AuthController.php` | +`refresh()` 方法（删旧+签新+返 `access_token` + `expires_in`） |
| `routes/api.php` | +`POST /auth/refresh` (auth:sanctum) |
| `tests/Feature/SanctumExpirationTest.php` | 6 测试：过期 401 / 新鲜不 rotate / 临期 rotate / refresh 返新 / 老 token DB 删 / expiration=null 禁用 |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/api/http.ts` | response 拦截器读 `x-refresh-token`，写入 localStorage（axios header 名小写）；401 仍走原 redirect login 逻辑 |

## 端到端实测（真实 curl）

```
# 1. 登录拿 token id=28
$ curl ... /auth/login → {access_token: "28|...", expires_in: 7200}

# 2. 后门把 created_at 倒推 100 分钟（120-100=20min 剩，< 30 阈值）
$ tinker update created_at = now()-100min

# 3. 任意 auth 接口 → 200 + 临期续期头
$ curl -i ... /users/me
HTTP/1.1 200 OK
X-Refresh-Token: 29|orAQ8o...
X-Refresh-Expires-In: 7200

# 4. 再倒推到 130 分钟（已过期）
$ tinker update created_at = now()-130min

# 5. 再请求 → 401
$ curl ... /users/me → {"code":401, "message":"请先登录"}
```

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `test_expired_token_returns_401` | 130min 旧 → Sanctum 直接 401 |
| `test_fresh_token_returns_200_with_no_rotation_header` | 新 token → 200，无 X-Refresh-Token |
| `test_near_expiry_token_triggers_rotation` | 100min 旧 → 200 + 新 token 头；老 token DB 行已删；新 token 可用 |
| `test_refresh_endpoint_returns_new_token` | POST /auth/refresh → 新 token + expires_in=7200；老 DB 行删 |
| `test_old_token_invalid_after_refresh` | 验证 `findToken($plain)` 返 null（DB 删干净；测试套件 Auth guard 跨请求缓存导致 401 状态码不可断言，已加注释说明） |
| `test_expiration_null_disables_feature` | `config('sanctum.expiration', null)` + 9999min 旧 → 仍 200，不 rotate |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 6 后端 + 1 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 149/149（+6）· pytest 22/22 · Vitest 18/18 |
| 手动验收 | ✅ 真实 curl 全链路（rotate 头+401）已实测 |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. 现有 token 默认 120 分钟过期；当登录后正常用满 90 分钟仍在用，第 91 分钟到 120 分钟之间任意请求就会自动换新（浏览器开发者工具能看到 X-Refresh-Token 头，localStorage.access_token 跟着换）
2. 想短期测试：`.env` 加 `SANCTUM_TOKEN_EXPIRATION=2` 重启 → 2 分钟即过期；登录 + 等 2 分钟 → 任意请求 → 401 跳登录
3. 想关掉：`SANCTUM_TOKEN_EXPIRATION=null` 在 env 里不生效，需要 `config/sanctum.php` 改回 null —— 或直接配 `SANCTUM_TOKEN_EXPIRATION=` 留空 + 改默认；不建议

## 风险与已知问题

| 项 | 说明 |
|----|------|
| Auth guard 跨请求缓存 | Laravel 测试套件下，同测试内连续请求 Auth::guard('sanctum')->user() 缓存 → 没法断言"老 token 立刻被 401"。真实 HTTP 不缓存 → curl 验证通过 |
| 时序边界 | 临期 30 分钟阈值是固定常量；不同接口想用不同策略需要扩展（如 admin 5min，user 30min） |
| 多并发请求同时临期 | 两个请求同时到达临期 → 各签一个新 token、各删一次（其中一次 delete 是 noop）；少数情况下前端收到两个 X-Refresh-Token，会用最后那个，OK |
| `expiration=null` 时 middleware 跳过 | 退路；但同时禁用了 rotate，行为退回 iter-17 |
| 没有"主动登出所有设备" | 单 token revoke 可以；删用户所有 token 没暴露 API |

## iteration-19 候选

| 方向 | 简述 |
|------|------|
| pgvector / sqlite-vec 语义检索 | 需 embedding API key（DeepSeek 不提供） |
| 真实快递鸟接入 | 需 appKey |
| label 协作冲突保护（updated_at 乐观锁） | iter-15 尾巴 |
| ai-service 一侧 confidence 标准化 | iter-16 留的下游 |
| 死信队列后台 UI | iter-17 尾巴 |
| 主动登出所有设备 / 设备管理 | iter-18 延伸 |
