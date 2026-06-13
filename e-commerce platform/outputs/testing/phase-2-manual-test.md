# Phase 2 · Manual Test Checklist（手动测试清单）

> 测试 Agent 列步骤 + 预期；**用户填实际结果**。每条 `[ ]` 复选框由你勾选。
> 全部勾选后 Phase 2 才能通过。

## 【当前焦点】

- Phase：2（项目骨架联通）
- 用户：linfeng（juana_quosyx@mail.com）
- 用例总数：12 条

## 前置准备

### 1. 三服务启动

```bash
# Terminal 1 - Laravel 后端
cd "project/e-commerce platform/backend"
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate
php artisan serve  # 监听 http://127.0.0.1:8000

# Terminal 2 - Python AI 服务
cd "project/e-commerce platform/ai-service"
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8001

# Terminal 3 - Vue 前端
cd "project/e-commerce platform/frontend"
npm install
npm run dev  # 监听 http://localhost:5173
```

## 手动测试用例

### A. 服务联通

| # | 用例 | 步骤 | 预期 | 实际（你填） | 状态 |
|---|------|------|------|------------|------|
| 1 | FastAPI 健康检查响应 | 浏览器打开 http://127.0.0.1:8001/ai/v1/health | JSON `{"code":0, "data":{"service":"zhongyan-ai-service", ...}}` |  | [ ] |
| 2 | FastAPI Swagger 文档可访问 | 浏览器打开 http://127.0.0.1:8001/docs | 看到 5 个分组：health/intent/rag/chat/quotation |  | [ ] |
| 3 | Laravel 健康检查响应 | 浏览器打开 http://127.0.0.1:8000/api/v1/health | JSON 含 mysql/redis/ai_service 三 checks |  | [ ] |
| 4 | Laravel 联通 FastAPI 成功 | 同上接口的 `data.checks.ai_service.ok` | true（FastAPI 在跑时） |  | [ ] |
| 5 | Vue 前端首页可访问 | 浏览器打开 http://localhost:5173 | 看到红色"中研复材"logo + 搜索栏 + 6 张分类卡片 |  | [ ] |
| 6 | Vue 健康检查页能调通后端 | 浏览器打开 http://localhost:5173/health | 表格显示 MySQL/Redis/AI 三行 ✅ |  | [ ] |

### B. 视觉规范一致性

| # | 用例 | 步骤 | 预期 | 实际 | 状态 |
|---|------|------|------|------|------|
| 7 | 品牌色正确 | 首页 logo 和"搜索"圆形按钮颜色 | 品牌红 #ff385c（与 design-system.md 一致） |  | [ ] |
| 8 | 搜索栏为 pill 形状 | 首页中间搜索栏 | 完全椭圆圆角（无硬角） |  | [ ] |
| 9 | 分类卡片 hover 效果 | 鼠标 hover 分类卡片 | 卡片浮起一层阴影（design-system.md `--shadow-hover-float`） |  | [ ] |
| 10 | 字体正确 | 任意页文字 | Inter（或 PingFang SC 中文回退） |  | [ ] |

### C. 接口响应性能

| # | 用例 | 步骤 | 预期 | 实际 | 状态 |
|---|------|------|------|------|------|
| 11 | 健康检查接口 <500ms | 在 http://localhost:5173/health 打开 DevTools Network | `GET /api/v1/health` <500ms |  | [ ] |
| 12 | 首页首屏加载 <2s | DevTools Lighthouse 测试 | LCP < 2.5s |  | [ ] |

## 不在 Phase 2 范围（明确推迟）

- ❌ 实际注册/登录 UI 联调（task-spec.md TRADE-001-01 完整流程）— iteration-2
- ❌ AI 抽屉 UI（design 已规范，未在 Phase 2 实现）— iteration-2
- ❌ 商品列表 UI（task-spec.md TRADE-002-04）— iteration-2

## 用户勾选完成确认

- [ ] 我已逐条执行上述 12 条用例
- [ ] 我已在每条用例的"实际"栏写入结果
- [ ] 失败的用例我已记入 outputs/orchestration/rework-log.md（如有）

完成日期：________________
签名：________________
