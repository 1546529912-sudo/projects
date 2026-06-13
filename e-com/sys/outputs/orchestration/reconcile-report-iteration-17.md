# reconcile-report-iteration-17.md · PIM/WMS endpoint enforcement + admin 用户管理

## 【当前焦点】
Wave A：PIM/WMS 加 admin JWT 校验 + 角色限制（之前仅 OMS）。
Wave B：Vue 后台 super_admin 可视化增删改 admin_users。

## 一、文件清单（14 文件，对照 [iteration-17-runbook §一](iteration-17-runbook.md#一文件清单共-14-文件3-wave)）

合计代码量：~700 行 PHP + ~250 行 Vue/TS。

## 二、关键设计决策

| 主题 | 决策 |
|---|---|
| 跨服务 JWT 校验 | 各后端独立 verify（同 secret + 同算法）；不调 OMS /admin/me（避免每请求跨服务）|
| 跨服务 secret 对齐 | env `ADMIN_JWT_SECRET`，fallback `JWT_SECRET`，再 fallback `'dev-insecure-secret'` |
| middleware 参数 | `->middleware(class, 'role1', 'role2')` → handle(...$allowedRoles) 变参 |
| 中间件向后兼容 | `if ($allowedRoles)` 判空，不传 role 等于"任意 admin"，iter-16 旧用法不破坏 |
| 删除 super_admin 兜底 | 至少保留 1 个 enabled super_admin + 禁止自删 |
| audit 联动 | adminUser CRUD 自动调 AuditService::log（admin_user.create/update/change_password/delete）|

## 三、本轮主动避坑

| 风险 | 规避 |
|---|---|
| 跨服务 verify 实现漂移 | 3 份 AdminTokenService 完全相同代码（拒绝抽象到 composer 包，节省运维）|
| 公开接口被误锁 | PIM `product/list` / `sku/*` 等放 middleware group 外；WMS `picking-order` 同 |
| iter-16 OMS admin/* 路由（无 role）不破坏 | 中间件变参 + 判空兜底 |
| 旧 token 改角色后仍有效 7 天 | 记 Q17-01 M3 补 token blacklist |
| 仅 UI 菜单隐藏不够 | API 层 middleware 双层兜底，URL 直接访问 → 403 toast |
| 自删账户后失锁 | 显式检查 currentUserId |
| 至少 1 个 super_admin 不变量 | 删除前 count(role=super_admin AND status=enabled) >= 2 |
| del 未 import | TS 编译报错即时修复 |
| WMS picking-order 被误锁 | 文档明确该路由是 OMS infra 调用，保留无 auth |

## 四、与历史 iter 对账

| iter | 主题 | 关联 |
|---|---|---|
| iter-9 | 异步事件总线（同 Redis 跨服务）| iter-17 类比"同 JWT secret 跨服务" |
| iter-15 | audit log | iter-17 admin_user CRUD 自动写 audit |
| iter-16 | admin_users + JWT + 3 角色 + OMS endpoint enforce | **iter-17 推广到 PIM/WMS + 增删改 UI** |

## 五、与 iter-16 兼容性

| 场景 | iter-16 行为 | iter-17 行为 |
|---|---|---|
| OMS admin/* 不传 role | 任意 admin OK | 完全一致（中间件判空跳过 role 检查）|
| OMS admin/user/* | (无此路由) | 仅 super_admin（middleware 强制）|
| PIM admin/* | 无 auth（暴露）| 强制 super_admin / sales_ops |
| WMS 全部（除 picking-order）| 无 auth | 强制 super_admin / warehouse |

## 六、剩余非阻塞（M3+）

| 编号 | 事项 |
|---|---|
| Q17-01 | Token blacklist / 角色变更立即生效 |
| Q17-02 | 按 admin 用户聚合 audit_log |
| Q17-03 | 登录限流（防暴力）|
| Q17-04 | 密码复杂度 |
| Q17-05 | 自助改密 / 找回 |

## 七、待用户运行验证

详见 [iteration-17-runbook §四-五](iteration-17-runbook.md#四待用户运行4-步)：4 步命令 + 8 步浏览器/curl 清单。

## 八、对账结论

✅ **代码全量交付**：14 个文件，A+B+C 三 Wave 全部按 runbook 完成。
⏳ **运行时验证**：等待用户执行 3 后端 restart + Vue HMR + 8 步清单（含 curl 测 403）。
🔄 **预期返工**：可能 1-2 项小修；本轮已主动规避公开接口锁死 / 旧 middleware 不兼容 / del 未 import / super_admin 失锁 4 类风险。

## 九、对账时间
2026-05-28

## 十、本对账使用的 skill
- `karpathy-guidelines`（不引入跨服务调用 / 不引入新依赖 / 不抽象 JWT 库到 monorepo composer 包，按需最小补充）
