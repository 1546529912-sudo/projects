# Reconcile Report · Iteration 23（设备管理 · 多端登录列表 + 远程撤销）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：iter-18 token 过期/续期之上，给用户"我账号有哪些活跃登录、能远程踢"的能力
- 结论：登录时 token name 从硬编码 `'auth'` 改成 `"浏览器 · OS · IP"` 可读标签；3 个端点 list/revoke/logout-others；MePage 加"登录设备"卡片
- 测试：PHPUnit **164/164**（+7）· pytest 22/22 · Vitest 18/18 · vue-tsc 清

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| 设备标签来源 | **UA 简化（浏览器名 / OS 名）+ IP** | 不引入 ua-parser 库；自写 6 行 detect 够用 |
| 撤销别人 token | **本人 token 范围内（where tokenable_id）** | 安全；越权写 404 而非 403（不暴露 id 存在性） |
| 登出所有 vs 登出其他 | **登出其他** | 用户本意几乎都是"踢掉可疑设备但保留本机" |
| 当前会话标记 | **`is_current: true`** | 前端用此判定按钮文案（"退出" vs "撤销"） |
| refresh 时设备名 | **保留旧 token 的 name** | 续期同设备；如果改名会让"我有几个登录"误差 |
| 老 token name='auth' | **不回填**，前端原样显示 | 历史数据；iter-23 之后新登录都会有标签 |

## 后端产物

| 文件 | 说明 |
|------|------|
| `app/Http/Controllers/Api/AuthController.php` | + `devices` / `revokeDevice` / `logoutOthers` 三方法 + `deviceLabel` / `detectBrowser` / `detectOS` 辅助；4 处 createToken 改用 deviceLabel；refresh 保留旧 name |
| `routes/api.php` | + GET /auth/devices · DELETE /auth/devices/{id} · POST /auth/logout-others（auth:sanctum 组内） |
| `tests/Feature/DeviceManagementTest.php` | 7 测试：login 持久化 UA 标签 / list 标 current / revoke / 越权 404 / logout-others 留 current / 未认证 401 / refresh 保留 name |

## 前端产物

| 文件 | 说明 |
|------|------|
| `src/views/profile/MePage.vue` | + `devices` 加载 + "登录设备" 卡片（列表行：设备名 + 当前标签 + 登录时间/最近活动 + 撤销按钮）+ "登出其他设备 →" 危险红链 |

## 端到端实测（真实 curl）

```
# 1. 登录（Chrome UA）→ token 命名包含 "Chrome · macOS"
$ curl -H "User-Agent: ... Chrome/119" -d '...' .../auth/login
→ access_token id=36 name="Chrome · macOS · 127.0.0.1"

# 2. 列表
$ curl ... /auth/devices
{ devices: [
    { id: 36, name: "Chrome · macOS · 127.0.0.1", is_current: true },
    { id: ..., name: "auth", is_current: false },  ← iter-23 之前的老 token
  ]
}

# 3. 另一浏览器登录
$ curl -H "User-Agent: ... Firefox" -d '...' .../auth/login
$ curl ... /auth/devices → 列表多了 "Firefox · Windows · 127.0.0.1"

# 4. 一键登出其他
$ curl -X POST ... /auth/logout-others
→ { revoked: 17 }
```

## 关键测试 case

| 测试 | 验证 |
|------|------|
| `test_login_persists_device_label_from_ua` | UA 含 Chrome+Mac → 入库 name 含 "Chrome" 和 "macOS" |
| `test_devices_list_marks_current` | 2 个 token，列表 is_current 仅当前那一个为 true |
| `test_revoke_device_deletes_token` | DELETE → 对应 DB 行删；当前 token 不动 |
| `test_revoke_cannot_touch_other_users_token` | Alice 试图撤 Bob 的 → 404，Bob token 不动 |
| `test_logout_others_revokes_all_but_current` | 3 个 token → 撤 2 留 1 |
| `test_devices_endpoint_requires_auth` | 无 Bearer → 401 |
| `test_refresh_preserves_device_name` | iter-18 refresh 后新 token name 等于原 name（同设备） |

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 3 后端 + 1 前端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 164/164（+7）· pytest 22/22 · Vitest 18/18 · vue-tsc 清 |
| 手动验收 | ✅ 真实 curl 多浏览器场景 + logout-others 实测 |
| 对账报告 | ✅ |

## 用户手动验收

http://localhost:5173/

1. 任意账号在 Chrome 登 → /profile 滚到底部 → 看到"登录设备"卡片，1 行带"当前设备"蓝色标签
2. 在另一个浏览器 / 隐身窗口再登一次同账号 → 回到 Chrome 刷新 /profile → 列表多 1 行（无"当前设备"标签）
3. 点新设备那行右侧"撤销" → 弹 confirm → 确认 → 列表减 1 行
4. 点底部红色"登出其他设备 →" → 弹 confirm → 一次踢光所有非当前
5. 点当前设备的"退出"按钮 → 等价于 logout，跳回登录页

## 风险与已知问题

| 项 | 说明 |
|----|------|
| UA 检测粗糙 | 自写正则；遇到爬虫 / 罕见浏览器会归 "其他"；如要精准接 ua-parser-js 后端版 |
| IP 是 `$request->ip()` | 在反向代理后面会拿到代理 IP；要真实 IP 配 `trusted_proxies` |
| 老 token 显示 "auth" | iter-23 前创建的；不回填；用户可以"登出其他"一键清理 |
| 设备标签未脱敏 | IP 直接展示；如果 demo 要给客户看可考虑只显示前两段（192.168.x.x） |
| 没有 push 通知新设备登录 | 安全侧重防御，没做"主动告警"；可扩展 Webhook |

## iteration-24 候选

| 方向 | 简述 |
|------|------|
| 移动端覆盖式抽屉 sidebar | iter-21 真·移动版 |
| label 协作冲突保护（updated_at 乐观锁） | iter-15 尾巴 |
| 失败作业按时间窗 / 类型 搜索 + 翻页 | iter-19 自身扩展 |
| 新设备登录 push 提醒 | iter-23 安全延伸（接 Webhook） |
| pgvector / 真实快递鸟 | 阻塞，需用户提供 key |
