# Iteration 1 Runbook — 设计确认 + 云开发初始化

> 【当前焦点】Phase 0 设计确认执行中  
> 创建时间：2026-05-15  
> 架构变更：2026-05-15（Laravel → 微信云开发）  
> 主控 Agent 维护

---

## 本轮范围

**Phase 0**：设计 Agent 出原型图 → 用户确认 → 开发才能启动  
**Phase 1**：云开发环境联通 + healthCheck 云函数 + 前端基础联通

**本轮完成后的可验证状态**：
- 核心页面原型图已获用户确认
- 小程序云开发初始化完成
- `healthCheck` 云函数可调用，返回 code:0
- 云数据库 3 个集合已创建并配置权限
- 小程序首页能成功调用 healthCheck 云函数

---

## 本轮不做

- 真实 AI 服务接入（Phase 3）
- 真实 ASR 接入（Phase 3）
- 完整业务功能实现（Phase 2 及后）
- 历史记录、我的页面（Phase 4）
- 线上部署

---

## 角色调度顺序

```
Step 0: orchestrator → 确认架构调整，更新技术栈文档 ✅
Step 1: design       → 出原型图（P0-001 ~ P0-003）
Step 2: [用户确认]  → 原型图逐页用户确认（门控）
Step 3: architect    → 完成云函数架构 + Report Schema（P1-008）
Step 4: developer    → 云开发配置 + healthCheck（P1-003 ~ P1-006）
Step 5: developer    → 前后端联通（P1-007）
Step 6: tester       → 基础测试（P1-009）
Step 7: orchestrator → 验收 Phase 1，回写 progress，启动 Phase 2
```

---

## 各角色产物

| 角色 | 任务 | 产物文件 |
|---|---|---|
| design | 录入页+AI确认页原型 | `outputs/design/wireframe-record.md` |
| design | 日报结果页原型 | `outputs/design/wireframe-report.md` |
| design | 首页+历史页原型 | `outputs/design/wireframe-home-history.md` |
| architect | 云函数规范 + Schema | `outputs/architecture/report-schema.json` |
| developer | 云开发配置 | `miniprogram/app.js` + `project.config.json` |
| developer | healthCheck 云函数 | `cloudfunctions/healthCheck/index.js` |
| developer | 云数据库初始化 | 集合 + 权限配置（文字说明） |
| developer | utils/cloud.js | `miniprogram/utils/cloud.js` |
| tester | 验收报告 | `outputs/testing/phase1-acceptance-report.md` |

---

## Phase 0 阶段切换条件

Phase 0 → Phase 1 的条件（**全部满足**才切换）：

- [ ] P0-001：录入页 + AI确认页原型图 → 用户确认 ✅
- [ ] P0-002：日报结果页原型图 → 用户确认 ✅
- [ ] P0-003：首页 + 历史页原型图 → 用户确认 ✅
- [ ] 主控在 progress.md 更新门控状态为"已确认"

---

## Phase 1 阶段切换条件

Phase 1 → Phase 2 的条件（**全部满足**才切换）：

- [ ] 小程序云开发环境连接成功
- [ ] `healthCheck` 云函数返回 `{ code: 0 }`
- [ ] 云数据库 3 个集合创建并配置权限
- [ ] 小程序首页调用 healthCheck 成功
- [ ] 所有 Phase 1 测试用例 PASS
- [ ] 测试 Agent 提交验收报告
- [ ] 主控回写 progress.md

---

## 风险与待确认项

| 风险 | 可能性 | 处理方案 |
|---|---|---|
| 原型图用户反复修改 | 中 | 每次修改记录 blocker，最多 3 轮修改后主控介入决策 |
| 云开发未开通 | 低 | 提交 blocker，主控协助开通 |
| DeepSeek API 不稳定 | 中 | Phase 1 用 mock，Phase 3 才真实接入 |
| ASR 服务申请限制 | 中 | Phase 1 用 mock 文字，Phase 3 接入 |

**待用户确认的默认值**：
- [ ] AI 服务：DeepSeek 还是 OpenAI？
- [ ] ASR 服务：腾讯云还是其他？
- [ ] 原型图主色调：微信绿 #1AAD19？

---

## 设计 Agent 工作说明（Phase 0 立即启动）

设计 Agent 按以下顺序出原型图，每出一页即提交用户确认：

**第一批（最高优先级）**：
1. 工作录入页（默认态 + 录音中 + AI处理中）
2. AI 整理确认页（结果展示 + 编辑态）

**第二批**：
3. 日报结果页（个人版 + 汇报版 + 复制）

**第三批**：
4. 首页
5. 历史记录页
