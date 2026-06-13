# Iteration 2 · Runbook（用户认证闭环）

## 【当前焦点】

- 范围：**TRADE-001 用户认证 6 个子功能完整实现**（不含 AI / 商品 / 支付）
- 目标：用户能在浏览器走完 注册→登录→个人中心→企业认证→角色切换→登出 闭环
- 关键约束：所有接口必须有 PHPUnit 测试；前端组件用 design-system token

## 任务清单

| Task ID | 任务 | 状态 |
|---------|------|------|
| TRADE-001-01 | 手机号+验证码注册（后端 stub 已完成，需补前端 UI + 60 秒倒计时 + 限流提示） | 推进中 |
| TRADE-001-02 | 微信快捷登录（接口 placeholder + 前端按钮入口；真实微信开放平台对接推迟 iteration-3） | 范围内 |
| TRADE-001-03 | 登录（手机号 + 密码 / 验证码，后端已完成，需前端 UI） | 推进中 |
| TRADE-001-04 | 企业认证提交（companies 表 migration + Controller + 前端表单 + 文件上传） | 范围内 |
| TRADE-001-05 | 企业认证审核（admin 接口 + 审核日志；前端 admin 后台 UI 第一版） | 范围内 |
| TRADE-001-06 | 个人/企业角色切换（后端 + 个人中心顶部下拉） | 范围内 |

## 不在 iteration-2 范围（明确）

- ❌ 商品展示（TRADE-002）
- ❌ AI 模块（AI-001/002）
- ❌ 真实微信开放平台对接（接口签名约定齐备，等用户提供 AppID）
- ❌ 真实阿里云 OSS（文件上传暂用本地 storage，生产换 OSS driver）
- ❌ 短信真实发送（继续 SmsService 日志降级）

## 切换条件（Phase 2-iter2 → Phase 2-iter3）

1. 6 个子功能产物清单提交（按 development SKILL 标准格式）
2. 主控 ls 验证全部文件
3. PHPUnit 测试 PASS（至少新增 8 个）
4. 手动测试清单 phase-2-iter2-manual-test.md 用户勾选
5. 对账报告 reconcile-report-iteration-2.md 生成

## 风险

| 风险 | 缓解 |
|------|------|
| Sanctum + Vite 跨域 cookie 问题 | 已配置 SANCTUM_STATEFUL_DOMAINS + Vite proxy /api |
| 微信登录真实回调需开放平台账号 | 第一版按 mock 实现，留出真实接入位 |
| 文件上传（营业执照）需 OSS | 暂用 Laravel 默认 storage/app/public + symlink |
