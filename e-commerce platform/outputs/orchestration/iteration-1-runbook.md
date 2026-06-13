# Iteration 1 · Runbook（项目初始化）

## 【当前焦点】

- 迭代目标：完成 Phase -1 → Phase 2 全链路初始化
- 当前 Phase：Phase -1（等待用户确认）
- 下一动作：用户 review 5 份产品产物 → 通过后启动 Phase 0/1/2

## Phase 序列

| Phase | 目标 | 负责 Agent | 切换条件 |
|-------|------|-----------|---------|
| -1 | 产品需求细化 | product | 5 份产物 + 用户确认 |
| 0 | 设计规范 | design | design-system + 8 页面原型 + 用户确认 |
| 1 | 技术架构 | architecture | 6 份架构文档（中型档） |
| 2 | 项目骨架 + 端到端联通 | development | 1 条端到端链路可跑 + 健康检查 PASS |
| 2 末 | 测试 | testing | 自动化报告全 PASS + 手动清单用户勾选 |

## 本轮迭代任务清单

### Phase -1 任务

- [x] 治理框架（README/AGENTS/HARNESS/EXECUTION_POLICY/progress + 6 SKILL.md）
- [x] feature-breakdown.md（59 子功能矩阵）
- [x] task-spec.md（305+ 条判定项）
- [x] edge-cases.md（5 模块 + 平台级共 35+ 条）
- [x] non-goals.md（功能/技术/AI/策略四维度 30+ 条）
- [x] design-brief.md
- [ ] **用户确认 Phase -1（阻塞点）**

### Phase 0 任务（待解锁）

- [ ] design-system.md（基于 DESIGN.md 裁剪适配 B2B）
- [ ] 8 个核心页面原型说明（每页 ≥4 状态）

### Phase 1 任务（待解锁）

- [ ] tech-stack.md（声明中型档）
- [ ] data-schema.md（17 表 DDL）
- [ ] api-list.md（HTTP + FastAPI 接口）
- [ ] module-deps.md
- [ ] data-flow.md（4 条核心数据流）
- [ ] non-functional.md

### Phase 2 任务（待解锁）

- [ ] Laravel 11 后端骨架（composer.json / .env.example / 路由 / 控制器 stub）
- [ ] Vue 3 + Vite 前端骨架（package.json / vite.config / 路由 / 健康检查页）
- [ ] Python FastAPI AI 服务骨架（main.py / requirements.txt / /health）
- [ ] MySQL migration（users / products / categories 三表起步）
- [ ] 端到端最小链路：前端 → Laravel /api/v1/health → FastAPI /health → 链路返回
- [ ] PHPUnit 基础测试用例 1 组
- [ ] Vitest 基础测试用例 1 组

### Phase 2 末测试任务（待解锁）

- [ ] outputs/testing/phase-2-auto-test.md（实际结果全填）
- [ ] outputs/testing/phase-2-manual-test.md（用户勾选）

## 对账要求

每轮 Phase 末必须生成对账报告：

- `outputs/orchestration/reconcile-report-iteration-1.md`

对账内容：

1. 列出所有声称"已完成"的任务
2. ls 验证每个声明文件存在
3. grep 验证声明的函数 / 接口名能在代码里命中
4. 跑自动化测试，记录通过率
5. 用户手动测试勾选完成度

## 当前阻塞点

- 等待用户 review 产品产物
- 等待用户 review design-brief 中的"待用户确认清单"（logo / 首页风格 / AI 对话窗口形态 / 登录页背景）

## 风险登记

| 风险 | 影响 | 缓解 |
|------|------|------|
| AI 报价引擎依赖 RAG 知识库初始内容 | 上线前知识库空可能让 AI 大量转人工 | 上线前需补 50+ 条核心知识条目（运营任务，非开发） |
| 物流接口选型未定（快递鸟 vs 顺丰开放） | 阻塞 TRADE-006-03 实现 | Phase 1 架构 Agent 决策 + 用户确认 |
| 微信/支付宝商户号未确认 | 阻塞 TRADE-005-01 联调 | 第一期可用沙箱，正式上线前补 |
| Milvus vs pgvector 二选一 | 影响 ai-service 依赖 | 默认 pgvector（运维简单，第一期数据量小），用户可修改 |
