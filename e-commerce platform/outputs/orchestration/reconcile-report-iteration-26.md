# Reconcile Report · Iteration 26（label 协作乐观锁）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：iter-15 起标注 bad case，没有并发保护 —— 两个 admin 同时点"标注"会静默互相覆盖。本迭代加 `if_match` 乐观锁
- 结论：label 端点检查 `if_match`（客户端记的 `updated_at` 字符串）；不一致 → 409 + 返当前服务端状态；前端可选"用我的版本覆盖"
- 测试：PHPUnit **179/179**（+5）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| 乐观锁 key | **updated_at 字符串** | 不加新列；与 If-Match HTTP 语义对齐；零迁移 |
| 时间精度 | **微秒（`Y-m-d\TH:i:s.uP`）** | 默认秒精度会导致同秒双写撞死锁（实际测试踩到）；微秒级足够避免 |
| Model.dateFormat | **`'Y-m-d H:i:s.u'`** | 让 Eloquent 持久化时也保留微秒 |
| 缺 if_match 时行为 | **跳过检查（保持兼容）** | 老 client / 脚本 / 单 admin 场景仍能用；不强制升级 |
| 冲突响应 | **409 + `data.current` 当前状态** | RFC 一致；client 能展示"对方改了什么" |
| 前端冲突恢复 | **confirm 让用户选"覆盖"或"放弃"** | 不静默丢数据；不静默覆盖；用户决策 |
| 覆盖路径 | **再次提交不带 if_match** | 复用 backwards compat 通道；不另加 force 参数 |

## 后端产物

| 文件 | 说明 |
|------|------|
| `app/Models/AiFeedback.php` | + `$dateFormat = 'Y-m-d H:i:s.u'` 微秒精度持久化 |
| `app/Http/Controllers/Api/AdminAiFeedbackController.php` | label 加 `if_match` 校验：不匹配 → 409 + data.current；toJson 输出 `updated_at` 微秒格式 |
| `tests/Feature/LabelOptimisticLockTest.php` | 5 测试：if_match 匹配 ok / stale 409 含 current / 无 if_match bypass / 双 admin 竞争第二个 409 / list 输出 updated_at |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/api/admin-bad-case.ts` | AiFeedback 加 `updated_at`；adminLabelBadCase 加可选 `ifMatch` 参数 |
| `src/views/admin/BadCasesPage.vue` | submitLabel 带 `labelingItem.updated_at`；catch 409 → confirm 弹窗 → 用户选"覆盖"则再次提交不带 if_match |

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `test_label_with_matching_if_match_succeeds` | 拿到刚读的 updated_at → 提交 → 200 |
| `test_label_with_stale_if_match_returns_409_with_current_state` | 服务端被别人改过 → 自己的旧 if_match → 409 + data.current.tags 是对方版本，自己的修改未应用 |
| `test_label_without_if_match_bypasses_check` | 不带 if_match → 即使被改过也允许覆盖（脚本/老 client 兜底） |
| `test_two_admins_race_second_one_blocked` | admin1 + admin2 同时加载 → admin1 先提交成功 → admin2 用同 if_match 提交 → 409；admin1 版本保留 |
| `test_list_response_includes_updated_at_for_clients_to_track` | list 接口返 updated_at；客户端能在加载时记下 |

## 时序图

```
admin1 加载 (updated_at = T0)
                                    admin2 加载 (updated_at = T0)
admin1 POST { if_match: T0 } → 200
DB updated_at = T1
                                    admin2 POST { if_match: T0 } → 409
                                    ↳ data.current { tags: admin1的, updated_at: T1 }
                                    ↳ 前端弹 confirm "他人已改..."
                                    ↳ 用户选"覆盖" → 不带 if_match 再提 → 200
```

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 3 后端 + 2 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 179/179（+5）· pytest 22/22 · Vitest 18/18 · vue-tsc 清 |
| 手动验收 | ⏳ 浏览器开两窗口 admin 同时标同一条 |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/admin/bad-cases

1. 开两个浏览器窗口（或一个隐身）都以 admin 登录
2. 两窗口都进 /admin/bad-cases 选同一条未标注
3. 窗口 A 标注"知识缺失"保存 → 成功
4. 窗口 B 用旧加载状态保存"答非所问" → 弹窗 "他人已修改..." → 显示窗口 A 的版本
5. B 选"取消" → 刷新列表，看到 A 的版本；选"覆盖" → 强写 B 的版本

## 风险与已知问题

| 项 | 说明 |
|----|------|
| updated_at 时区 | 用 `Y-m-d\TH:i:s.uP` 含时区偏移；不同时区 server 集群下要确认 NTP 同步 |
| 字符串比对 | 严格字符串等价；如果两端 format 有 1 微秒差 → 误报；当前一致由代码集中保证 |
| 仅 label 一处加锁 | resolve / 其他 update 路径仍无锁；本迭代只覆盖最易冲突的标注 |
| 微秒精度 SQLite | 测试用 in-memory SQLite 实测可用；MySQL 需要 `datetime(6)` 列类型，老版本可能丢精度 |
| 不带 if_match bypass | 是 feature 也是风险；脚本批量覆写不会冲突；如要严格可加 `?force=1` 显式语义 |

## iteration-27 候选

| 方向 | 简述 |
|------|------|
| URL query 同步（搜索 + 翻页） | iter-25 尾巴 |
| 移动端覆盖式抽屉 sidebar | iter-21 真·移动版 |
| user.notify_new_device 个人开关 | iter-24 延伸 |
| Stock alert resolve 也加乐观锁 | iter-26 扩展（同模式覆盖到其他 update 端点） |
| pgvector / 真实快递鸟 | 阻塞，需 key |
