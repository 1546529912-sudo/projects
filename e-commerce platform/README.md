# 中研复材 · 产业互联网平台 · 项目导航

> 任何 Agent 启动时第一个读的文件。超过 50 行必须裁剪。

## 【当前焦点】

- **当前迭代：** iteration-26（label 协作乐观锁 ✅）· 全栈在线
- **PHPUnit 179/179（+5） + pytest 22/22 + Vitest 18/18 PASS + vue-tsc 清**；label 加 if_match 微秒级；冲突 409 + data.current；前端 confirm 让用户选"覆盖"或"放弃"
- **下一动作：** 选择 iter-27（URL query 同步 / 移动端覆盖抽屉 / 通知开关 / 扩展乐观锁到其他端点）

## 【必须遵守】

1. 任何 Agent 启动前先读本文件 + [AGENTS.md](AGENTS.md) + [HARNESS.md](HARNESS.md)
2. 只有主控 Agent 可回写 [progress.md](progress.md)
3. Phase 切换必须先生成对账报告（见 [HARNESS.md](HARNESS.md)）
4. 任务"完成"必须附产物清单 + 文件路径 + 函数名

## 【关键文件索引】

- 治理：[AGENTS.md](AGENTS.md) · [HARNESS.md](HARNESS.md) · [EXECUTION_POLICY.md](EXECUTION_POLICY.md) · [progress.md](progress.md)
- 产品：[outputs/product/](outputs/product/)（5 份 · 305+ 判定项）
- 设计：[outputs/design/](outputs/design/)
- 架构：[outputs/architecture/](outputs/architecture/)（中型档 6 份）
- 代码：[backend-laravel/](backend-laravel/) · [frontend/](frontend/) · [ai-service/](ai-service/)
- 对账：[iter-1](outputs/orchestration/reconcile-report-iteration-1.md) · [iter-2](outputs/orchestration/reconcile-report-iteration-2.md) · [iter-3](outputs/orchestration/reconcile-report-iteration-3.md) · [iter-4](outputs/orchestration/reconcile-report-iteration-4.md) · [iter-5](outputs/orchestration/reconcile-report-iteration-5.md) · [iter-6](outputs/orchestration/reconcile-report-iteration-6.md) · [iter-7](outputs/orchestration/reconcile-report-iteration-7.md) · [iter-8](outputs/orchestration/reconcile-report-iteration-8.md) · [iter-9](outputs/orchestration/reconcile-report-iteration-9.md) · [iter-10](outputs/orchestration/reconcile-report-iteration-10.md) · [iter-11](outputs/orchestration/reconcile-report-iteration-11.md) · [iter-12](outputs/orchestration/reconcile-report-iteration-12.md) · [iter-13](outputs/orchestration/reconcile-report-iteration-13.md) · [iter-14](outputs/orchestration/reconcile-report-iteration-14.md) · [iter-15](outputs/orchestration/reconcile-report-iteration-15.md) · [iter-16](outputs/orchestration/reconcile-report-iteration-16.md) · [iter-17](outputs/orchestration/reconcile-report-iteration-17.md) · [iter-18](outputs/orchestration/reconcile-report-iteration-18.md) · [iter-19](outputs/orchestration/reconcile-report-iteration-19.md) · [iter-20](outputs/orchestration/reconcile-report-iteration-20.md) · [iter-21](outputs/orchestration/reconcile-report-iteration-21.md) · [iter-22](outputs/orchestration/reconcile-report-iteration-22.md) · [iter-23](outputs/orchestration/reconcile-report-iteration-23.md) · [iter-24](outputs/orchestration/reconcile-report-iteration-24.md) · [iter-25](outputs/orchestration/reconcile-report-iteration-25.md) · [iter-26](outputs/orchestration/reconcile-report-iteration-26.md)

> ⚠️ 后端目录名由 `backend/` 改为 `backend-laravel/`，避免 iCloud Drive 同步与本地 mv 冲突（macOS 文件系统问题）

## 【启动三服务】

```bash
# Laravel (8000)
cd backend-laravel && composer install && php artisan migrate && php artisan serve

# AI (8001)
cd ai-service && source .venv/bin/activate && uvicorn app.main:app --port 8001

# Vue (5173)
cd frontend && npm install && npm run dev

# Redis (Docker)
docker start zhongyan-redis  # 已创建容器
```

访问 http://localhost:5173/ — 注册 → 登录 → 个人中心 → 企业认证 全流程可走。
