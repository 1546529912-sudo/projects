# Reconcile Report · Iteration 24（新设备登录 Webhook 提醒）

> 完成时间：2026-05-23

## 【当前焦点】

- 范围：iter-23 已能列出设备 + 远程撤销；本迭代补"主动告警" —— 检测到陌生设备登录立即推 webhook（运营 / 用户安全侧可对接钉钉、邮件、短信网关）
- 结论：检查 `personal_access_tokens.name` 是否已存在；不存在则视为新设备 → 复用 iter-17 DispatchWebhookJob 异步推 `auth.new_device`；WebhookDispatcher 按 event 前缀路由 URL
- 测试：PHPUnit **170/170**（+6）· pytest 22/22 · Vitest 18/18 全 PASS

## 设计取舍

| 选项 | 选择 | 理由 |
|------|------|------|
| 新设备判定 | **token.name 不存在 → 新** | 与 iter-23 device label 一致；exact 匹配避免误报；同 UA 同 IP 视为同设备 |
| 同步 vs 异步 | **异步（DispatchWebhookJob）** | 登录链路绝不被 webhook 拖慢；失败重试不阻塞用户 |
| URL 路由 | **按 event 前缀 (`stock.*` / `auth.*`)** | 不同业务用不同接收端；扩展时加一行 `match` 即可 |
| 注册 | **永远算新设备** | 注册即首次；语义对 |
| 未配 URL | **mock_only**（仅日志） | 与 iter-11 行为一致 |
| 通知内容 | **user_id + 手机号(脱敏) + 设备标签 + IP + UA + 时间** | 接收端能识别用户 + 设备指纹，可决定是否提醒用户 |

## 后端产物

| 文件 | 说明 |
|------|------|
| `app/Services/WebhookDispatcher.php` | + `resolveUrl($event)` 按前缀路由 `stock.*` / `auth.*`；移除 env 直读 fallback（统一走 config） |
| `config/services.php` | + `webhook.auth_new_device_url` (env `AUTH_NEW_DEVICE_WEBHOOK_URL`) |
| `app/Http/Controllers/Api/AuthController.php` | + `notifyIfNewDevice()` 私有方法（dispatch Job）；login / wechat / register 三处 createToken 前后调 |
| `tests/Feature/NewDeviceWebhookTest.php` | 6 测试：首登 dispatch / 同 UA 不 dispatch / 异 UA 重新 dispatch / 注册 dispatch / URL 路由 / 未知前缀 mock_only |

## 前端产物

无（事件发布纯后端；接收端在外部 hook 系统）。

## 端到端实测（PHPUnit + 集成行为）

```
test_first_login_from_a_device_dispatches_webhook       ✓
test_second_login_from_same_device_does_not_dispatch    ✓  Bus::assertNotDispatched
test_login_from_different_ua_dispatches_again           ✓  Chrome→Firefox 切换重新告警
test_register_dispatches_new_device_webhook             ✓
test_webhook_dispatcher_routes_url_by_event_prefix      ✓  Http::fake 验证两 URL 命中正确
test_unknown_event_prefix_returns_mock_only             ✓
```

## Webhook payload 示例

```json
{
  "event": "auth.new_device",
  "payload": {
    "user_id": 1,
    "phone": "138****0001",
    "device_label": "Firefox · Windows · 192.168.1.42",
    "ip": "192.168.1.42",
    "user_agent": "Mozilla/5.0 (Windows NT) Firefox/118",
    "login_at": "2026-05-23T08:30:01+00:00"
  },
  "timestamp": "2026-05-23T08:30:01+00:00"
}
```

## HARNESS 5 项硬约束

| # | 状态 |
|---|------|
| 产物清单 | ✅ 4 后端 |
| 文件 ls | ✅ |
| 自动化测试 | ✅ PHPUnit 170/170（+6）· pytest 22/22 · Vitest 18/18 |
| 手动验收 | ⏳ 浏览器换浏览器登一次 → 看 `php artisan queue:work` 输出 / failed_jobs / hook 接收端 |
| 对账报告 | ✅ |

## 用户手动验收

```bash
# 1. 默认无 URL → mock_only：登录后查 storage/logs/laravel.log 看到 [webhook][mock]
$ tail -f backend-laravel/storage/logs/laravel.log

# 2. 配真实 URL（用 webhook.site 测）
$ echo "AUTH_NEW_DEVICE_WEBHOOK_URL=https://webhook.site/your-token" >> backend-laravel/.env
$ php artisan config:clear

# 3. 在 Chrome 退出登录 → 重新登 → webhook.site 看到 auth.new_device 事件
# 4. 在同一个 Chrome 再登 → 不会触发（同设备）
# 5. 换 Firefox 登 → 又触发（设备指纹不同）
```

## 风险与已知问题

| 项 | 说明 |
|----|------|
| IP 漂移 | 同设备换 WiFi → device_label 变 → 误报新设备；可后续放宽匹配（仅按 browser+os） |
| 内网 IP 都一样 | 所有内网用户从 `192.168.x.x` 走 → 设备指纹偏弱；生产侧应该读 `X-Forwarded-For` |
| 没有 user-level 开关 | 用户暂时不能"关闭新设备提醒"；可加 user.notify_new_device 字段 |
| 异步事务 | dispatch 在 controller 内同步链路；queue=sync 时立即跑 webhook，慢接收端会拖登录响应 |
| 老 token name='auth' | iter-23 之前的 token name 是 'auth'；下次同设备登录会因为 'auth' 已存在而被认为"非新设备"，可能漏报。可一次性 `tokens.where('name', 'auth').delete()` 清理 |

## iteration-25 候选

| 方向 | 简述 |
|------|------|
| 移动端覆盖式抽屉 sidebar | iter-21 真·移动版 |
| label 协作冲突保护（updated_at 乐观锁） | iter-15 尾巴 |
| 失败作业按时间窗 / 类型 搜索 + 翻页 | iter-19 自身扩展 |
| user.notify_new_device 个人开关 | iter-24 延伸 |
| pgvector / 真实快递鸟 | 阻塞，需用户提供 key |
