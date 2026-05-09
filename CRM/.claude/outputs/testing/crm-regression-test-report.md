# CRM 回归测试报告

**测试执行方：** Test Agent（按 `.claude/agents/tester.md`）  
**执行日期：** 2026-05-09  
**代码库：** `/Users/linfeng/Desktop/project/CRM`  
**路线上下文：** 见 `progress.md` **路线决策（2026-05-09）** — 仅对已 `[x] 开发完成` 项做验收建议；`[ ] 开发完成` 项冻结，不视为缺项。

---

## 1. 验收结果摘要

**结论：部分通过（自动化与静态门禁）**

| 维度 | 结果 | 说明 |
|------|------|------|
| `pnpm typecheck` | **通过** | 全 workspace（shared / api / web）TypeScript 检查退出码 0 |
| `pnpm lint` | **未通过** | 在 `packages/shared` 阶段失败，ESLint 10 找不到 `eslint.config.(js|mjs|cjs)`，递归 lint 提前终止 |
| API 在线探测 | **未执行** | `curl http://localhost:3001/api/v1/health` 连接被拒绝 — **API 未运行，接口/集成类手工测试顺延** |
| 业务手工验收 | **未在本轮执行** | 本报告仅含自动化结果 + 可执行验收矩阵与回写建议 |

在无运行中 API 的前提下，**无法**对权限、查重、状态机等给出「测试通过」级结论；**仅凭 typecheck 通过也不满足** tester.md 中对接口/UI 的完整通过标准。

---

## 2. 自动化检查结果

### 2.1 `pnpm typecheck`

- **退出码：** `0`
- **范围：** `pnpm -r typecheck` — `packages/shared`、`apps/api`、`apps/web` 均报告 Done

### 2.2 `pnpm lint`

- **退出码：** `2`
- **失败位置：** `packages/shared`（`@crm/shared@0.1.0`）
- **错误摘要：** ESLint 10.3.0 默认要求扁平配置 `eslint.config.js`（或 `.mjs`/`.cjs`），当前包内无该文件，命令 `eslint src --ext .ts` 直接退出
- **影响：** 根目录 `pnpm lint` **无法完成对 api/web 的 lint**（因 recursive 首包失败即中断）；属 **CI/工具链门禁阻塞**，不是单文件业务逻辑告警

**说明：** 本仓库 `apps/` 下未发现提交到根的 `eslint.config.*`（检索限于项目源，排除 `node_modules`）；与 ESLint 9+ 迁移策略不一致，需工程侧统一配置或调整 `packages/shared` 的 lint 脚本/继承根配置。

---

## 3. 手工验收矩阵建议（可执行要点）

下列按 **已 `[x] 开发完成`** 的模块归类，对照 `.claude/docs/` 五份源文档中的关键规则（查重、状态、权限、回款口径、提醒归属等）与 `api_testing.md` / `ui_testing.md` 方法抽样验证。**无需一次测完**，但每条应能复现并留证（截图、请求/响应、角色账号）。

### 3.1 登录

| 验证要点 | 关联 progress 意图 |
|----------|-------------------|
| 账号密码登录、会话保持、刷新后仍在线（或按设计失效） | 用户登录/登出 |
| 安全登出后鉴权接口返回 401 | 同上 |
| 错误密码/不存在用户的提示与 HTTP 状态符合架构 | 源文档 + `api_testing.md` 异常路径 |

### 3.2 客户

| 验证要点 | 关联 progress 意图 |
|----------|-------------------|
| 新建/编辑/内联编辑：状态、级别、负责人、标签、来源 | 新建客户、编辑与内联编辑 |
| 列表：搜索、筛选、排序；**销售员仅看自己负责** | 客户列表 |
| 详情：联系人、跟进、商机、订单、自定义字段、来源线索关联 | 详情与完整信息区 |
| 客户状态流转：跟进中→意向→谈判→已成交；已流失；允许跳级、限制回退 | 状态流转及规则 |
| **A/B/C 级别** 列表排序与展示 | 客户级别标记 |
| BANT / SCOTSMAN（仅对应阶段展示） | P1/P2 已开发项 |

### 3.3 线索

| 验证要点 | 关联 progress 意图 |
|----------|-------------------|
| 线索录入、两层来源下拉、管理员配置来源 | 线索录入、来源两层、来源配置/后台 |
| **手机号失焦查重**；手机号+邮箱+公司+联系人组合查重 | 查重规则 |
| 疑似重复：可提交但标记待处理；展示区分本人/他人线索 | 疑似重复策略与展示 |
| 转化：生成客户+联系人，可选商机 | 线索转化 |
| 批量导入线索/客户 + 模板下载 | P2 导入项 |

### 3.4 跟进

| 验证要点 | 关联 progress 意图 |
|----------|-------------------|
| 三入口：详情内、全局快速新建、今日待跟进看板 | 三入口设计 |
| 客户必填、联系人选填；时间轴收起/展开 | 关联规则、时间轴 |
| 今日待跟进、基础提醒；**负责人变更后提醒归属** | 待跟进看板、提醒归属 |
| 超期升级、计划未执行标红、修改留痕 | P1 跟进项 |
| 跟进附件上传 | P2 附件 |

### 3.5 商机

| 验证要点 | 关联 progress 意图 |
|----------|-------------------|
| 新建/列表/阶段流转/赢单输单原因 | 商机管理、阶段流转 |
| **防撞单**（一客户一负责销售） | 防撞单机制 |
| 首页待关注：即将到期、长期未推进 | 待关注商机 |
| 合同上传/签署状态；赢单与订单、客户状态联动 | 合同、赢单链路、成交边界 |
| 客户列表/详情多商机标签 | 多标签展示 |
| 报价、产品目录、业务操作记录、详情业务时间轴 | P1 销售扩展 |
| 报价审批、PDF 导出、内置合同、外部合同模式 | P2/P3 已开发项 |

### 3.6 订单（与回款）

| 验证要点 | 关联 progress 意图 |
|----------|-------------------|
| 订单列表权限范围、状态筛选、搜索 | 分片验证描述 / 客户详情订单区 |
| **分期收款**：部分到账累计、`paid` 与**客户已成交**仅在全额到账后触发 | progress 当前进展（分片 17）+ 成交边界 |
| 退款申请/处理、外部退款通知（Header/API Key）、客户状态与通知 | 退款相关条目 |
| 业绩报表「按到账计入」「分期分别计入」与订单数据一致 | 模块四业绩口径 |

### 3.7 报表

| 验证要点 | 关联 progress 意图 |
|----------|-------------------|
| 漏斗：快照/流量、数量+金额、时间维度、转化率、下钻 | 漏斗相关 P0 |
| 业绩：目标/实际/预测/时间进度；下钻到人与商机 | 业绩报表 P0 |
| 阶段赢率可配置与默认加权预测 | 业绩预测算法 |
| 来源分析、转化漏斗、效能、异常与产品线切片 | P1 |
| 导出审批、自定义报表、归因对比、BI 只读接口 | P2/P3 |
| **报表数据范围与模块一角色一致** | 报表数据权限 |

### 3.8 设置

| 验证要点 | 关联 progress 意图 |
|----------|-------------------|
| RBAC 四级角色、用户生命周期、功能/数据权限、Tab 级权限 | 模块五用户与权限 |
| 自定义字段、必填规则、条件逻辑、默认值、枚举与标签、数据字典排序/停用 | 字段与表单、数据字典 |
| 工作流：触发器、防循环、自动分配、失败告警、审计 | 流程自动化 |
| 消息模板、通知渠道、退款阈值、Webhook、报价模板、合同模式、BI Tab、导出审批 Tab | 通知与集成 |

### 3.9 权限（横切）

| 验证要点 | 关联 progress 意图 |
|----------|-------------------|
| 销售/主管（组长）/总监/管理员 对客户、商机、订单、报表、设置入口的差异 | 基础权限 + 四级角色 |
| 越权访问他人资源：期望 403 或列表不可见 | `api_testing.md` 权限表 |
| 重复提交、空状态、错误提示 | `ui_testing.md` 边界场景 |

---

## 4. 进度回写建议（仅建议，**未**修改 `progress.md`）

### 4.1 在自动化门禁修复前

- **不建议** 批量勾选「测试通过」：**`pnpm lint` 未绿**，无法证明静态规范达标。
- Owner 可先决策：是否将「shared 包 ESLint 扁平配置缺失」视为**工程瑕疵**，与业务验收分离；若分离，也应在报告中注明**门禁例外**与修复截止日期。

### 4.2 自动化门禁修复且 API 可测后

对每一 `[x] 开发完成` 且 `[ ] 测试通过` 的条目，建议：

- **证据：** 对应角色账号的操作录屏或分步截图；关键 API 的请求/响应（脱敏）；报表截屏与导出文件哈希（若适用）。
- **抽样优先级：** P0 客户/线索/查重/权限/状态流、P0 跟进与提醒归属、P0 商机与成交边界、订单回款与退款通知、报表权限与口径、设置项与审计日志。

### 4.3 当前不宜勾「测试通过」的示例

| 情况 | 原因 |
|------|------|
| 整条模块仅 smoke 过页面 | tester.md：不能只因页面可点而通过 |
| 查重/状态流转/退款 webhook 未测异常路径 | 关键规则需单独验收 |
| 仅管理员账号测过 | 未覆盖销售/主管/总监数据范围 |

---

## 5. 静态分析 / 门禁级问题（定位）

| 级别 | 位置 | 说明 |
|------|------|------|
| **门禁阻塞** | `packages/shared/package.json`（`lint` 脚本）+ 包根目录缺少 `eslint.config.*` | 导致 `pnpm -r lint` 失败；ESLint 10 不接受无扁平配置运行 |
| **环境** | `localhost:3001` | 健康检查未连通；API 手工与 curl 用例未执行 |

本轮 **未** 对业务源码做全量 ESLint/tsc 细节走读，**未发现**具体 `文件:行` 的业务逻辑 defect；若修复 lint 配置后执行全量 lint，再更新本报告的「业务级静态问题」小节。

---

## 6. progress.md / 需求一致性（上报 Owner）

1. **高级字段支持（模块五）**  
   - progress 标注 `[x] 开发完成`，但括号内写明**文件/图片/地图字段依赖外部存储、暂不实现**。  
   - 与标题「地址拆分存储/文件图片/地图」存在**范围不一致**。  
   - **建议：** Owner 确认该条是「部分实现验收」还是应拆分子项，避免测试标准歧义。

2. **冻结项与源文档**  
   - 源文档 `.claude/docs/CRM_客户管理模块_v5.md` 仍描述广告平台同步等能力；progress 中对应项为 `[ ] 开发完成` 已冻结。  
   - **不视为缺陷**；测试以 progress **路线决策**为准，文档未删功能描述属预期差。

---

## 7. 测试 Agent 完成信号

**`TEST_PARTIAL`**

**理由：** `pnpm typecheck` 通过；`pnpm lint` 因 `packages/shared` 缺少 ESLint 扁平配置而失败；本地 API 未运行，健康检查未通过；未完成端到端/接口/权限类实测。  
待 lint 门禁恢复、API 可用并按第 3 节矩阵抽样留证后，可重新评估是否可达到 `TEST_PASS`。

**追加（2026-05-09，§8）：** T-1 与 **API/DB/Redis 环境** 已在后续轮次修复/拉起；**§3 手工全矩阵与 UI 留证仍未完成**，故总结论维持 **`TEST_PARTIAL`**，直至测试 Agent 按 §3～§4.2 输出可追溯证据后再议 `TEST_PASS`。

**追加（2026-05-09，§9）：** 已补充 **管理员 / 销售员 / 主管** 下客户列表 `total` 对照及销售员访问他人客户详情的 **403** API 证据；**不改变** `TEST_PARTIAL`（缺 UI 与 §3 全模块链路）。

**追加（2026-05-09，§10）：** 已补充 **线索列表、商机列表、首页看板、查重接口、跟进列表、未鉴权访问** 等 API 抽样；仍 **不改变** `TEST_PARTIAL`。

**追加（2026-05-09，§11）：** 订单 / 报表 / 管理入口 / 通知 / 来源配置 / 登出失效 + **`GET /auth/me` 回归缺陷修复说明**；仍 **不改变** `TEST_PARTIAL`。

**追加（无人值守 API 批次，§12）：** 联系人 / 合同 / 客户联系人 / 商机报价单 / 报价审批 / 产品目录 / 工作流 / Webhook / 全局搜索 + 根目录 **`pnpm lint`**；**仍不改变** `TEST_PARTIAL`（§3 **浏览器/UI** 无法在无人工操作时完成）。

**追加（§13）：** **组长（manager）** 会话下多条 **`/reports/*`** 只读接口 + **`/admin/users` 403**；订单 **`GET /orders/:id`** 路由**缺失**（非缺陷陈述，仅观测）；**仍不改变** `TEST_PARTIAL`。

**追加（§14 · 全量只读 GET 扫描尝试）：** 根目录新增 **`pnpm api:audit`**（`scripts/api-route-audit.mjs`）对 **30+ 条** 管理员 GET 路径串行探测；并修复若干 **BigInt / 审计 / 序列化** 导致的 **500**（见 §14.2）。**仍不可能** 在本机无人操作下「测完」§3 **UI**、全部 **写操作**、**T-3/T-4**；总结论 **仍为 `TEST_PARTIAL`**。

---

## 8. 环境复测追加（T-2 · 2026-05-09）

**背景：** T-1（`pnpm lint` / ESLint 扁平配置）已在工程侧关闭；本轮由 Owner/工具链在本地拉起 **Docker Compose**（`postgres` + `redis`）、启动 **`@crm/api` 开发服务** 后对 **§3 前置能力** 做连通性与最小 API 抽样（**非** §3 全矩阵、无 UI 截图）。

### 8.1 环境

| 项 | 结果 |
|----|------|
| `docker compose up -d` | Postgres / Redis 容器可用（与 `apps/api/.env` 中 `DATABASE_URL`、`REDIS_URL` 一致） |
| `prisma migrate deploy` | 无待迁移（28 个 migration 已应用） |
| API 进程 | `pnpm --filter @crm/api dev`（Nest watch）本地监听 `API_PORT=3001` |

### 8.2 自动化探测与抽样 API

| 用例 | 请求 | 期望 | 实际 |
|------|------|------|------|
| 健康检查 | `GET /api/v1/health` | 200，JSON 含 `data.status` | ✅ `code:0`，`data.status: ok` |
| 登录失败 | `POST /api/v1/auth/login` 错误密码 | 401 | ✅ HTTP 401，`code:10001` |
| 登录成功 | 种子账号 `13800000001` / `Crm@2026` | 201 + token | ✅ HTTP 201，返回 `accessToken`（**响应中的 token 已在本报告中截断/省略后续复测**） |
| 鉴权列表 | `GET /api/v1/customers?page=1&pageSize=3` + Bearer | 200 + 分页 | ✅ HTTP 200，返回 `items`（与 §3.2 客户列表意图一致的最小验证） |

### 8.3 结论与缺口

- **结论（本条追加）：** 在 **API/DB/Redis 已运行** 的前提下，**健康检查与登录鉴权、客户列表** 抽样通过；与 2026-05-09 首轮报告中「API 未运行、§3 顺延」相比，**环境阻塞已解除**，具备按 §3 继续做 **手工/UI/多角色** 复测的条件。
- **仍未覆盖（需测试 Agent + 留证）：** §3.1～§3.9 全矩阵中 **浏览器/UI/截图/业务全链路**；HTTP 证据见 **§8～§14**；只读全扫描见 **§14.3** **`pnpm api:audit`**；**T-3** 见建议稿 **`.claude/outputs/product/t3-advanced-fields-scope-proposal.md`**。
- **Lint 状态说明：** 首轮 §2.2 所述 shared 缺扁平配置问题已在后续工程变更中修复；以当前仓库根 `eslint.config.mjs` 及根目录 `pnpm lint` 退出码为准。

---

## 9. 多角色 API 抽样（T-2 续 · API 层留证）

**说明：** 仍为 **无 UI 截图** 的接口层验证；对应 §3.2「销售员仅看自己负责」与 §3.9「越权访问期望 403」的 **最小可复现** 证据。执行前提：`localhost:3001` API 可用、数据库已种子化（默认口令 `Crm@2026`）。

### 9.1 账号

| 角色 | 种子手机号 | 说明 |
|------|------------|------|
| 管理员 | `13800000001` | 全量客户可见性基准 |
| 组长/主管 | `13800000002` | 与本库 RBAC 一致时可用于对照 |
| 销售员 | `13800000003` | 数据范围受限 |

### 9.2 `GET /api/v1/customers` 分页 `total` 对照

| 调用方 | `pagination.total` | 说明 |
|--------|-------------------|------|
| 管理员 | `8` | 全库当前种子下客户总数 |
| 销售员 | `7` | **少于管理员**，与「非本人负责客户不可见」一致 |
| 主管 | `8` | 与种子数据及 `DataScopeService` 规则一致（本环境可与管理员同范围） |

### 9.3 越权读详情

- 在本库种子数据中，存在 **仅管理员列表可见** 的客户 id（实测 **`1`**）。
- **`GET /api/v1/customers/1`**，Header：`Authorization: Bearer <销售员 token>`  
  - **实际：** HTTP **403**，body `code:10002`，`message: Forbidden`  
  - **对应验收意图：** §3.9「越权访问他人资源：期望 403」。

### 9.4 与「§3 全手工/UI」的边界

- **已完成（本节）：** 登录 + 列表数据范围差异 + 单条详情越权 ❌ 403 的 **API 复现**。  
- **仍属 `TEST_PARTIAL`：** §3 要求的 **浏览器操作、多 Tab、表单与时序、截图/录屏** 及剩余全链路的 **UI/边界** 仍未逐条留证；**§10～§14**（含 **`pnpm api:audit`**）仍 **仅** 覆盖 **只读 HTTP**，不覆盖 UI/写路径。

---

## 10. 线索 / 商机 / 看板 / 查重 / 跟进 API 抽样（T-2 续）

**说明：** 与 §8、§9 相同，仅为 **接口层**、**无 UI**；数值随种子数据变化，复测时以当时库为准。

### 10.1 列表 `total`：管理员 vs 销售员

| 接口 | 管理员 `pagination.total` | 销售员 `pagination.total` | 对应 §3 意图 |
|------|----------------------------|---------------------------|--------------|
| `GET /api/v1/leads?page=1&pageSize=1` | `12` | `10`（更少） | §3.3 线索 + §3.9 数据范围 |
| `GET /api/v1/opportunities?page=1&pageSize=1` | `7` | `5`（更少） | §3.5 商机 + §3.9 |

### 10.2 首页看板

- **请求：** `GET /api/v1/dashboard`（**注意：** 非 `/dashboard/summary`），带管理员 Bearer。  
- **实际：** HTTP **200**，`data` 含 `stats`（如 `totalCustomers`、`openOppCount`、`openOppAmount`）、`todayFollowUps`、`overdueFollowUps`、`upcomingOpportunities`、`staleOpportunities`。  
- **对应 §3 意图：** §6 progress 中「待跟进客户 / 待关注商机 / 统计」类看板数据的 **接口存在性**（UI 仍需人工截图）。

### 10.3 线索查重

- **请求：** `GET /api/v1/leads/duplicates/check?phone=19990010001`（示例手机号，种子中有多条命中），带 Bearer。  
- **实际：** HTTP **200**，返回体 `data` 中含与手机号相关的 **多条** `lead` / `customer` 匹配项（结构化列表）。  
- **对应 §3 意图：** §3.3「手机号失焦查重 / 组合查重」的 **服务端能力**（前端失焦与交互仍待 UI 验收）。

### 10.4 跟进记录

- **请求：** `GET /api/v1/customers/28/follow-ups`，销售员 token（`28` 为销售可见客户之一，种子环境实测）。  
- **实际：** HTTP **200**，`data.items` 可为空列表，分页结构正确。  
- **对应 §3 意图：** §3.4 跟进与时间轴的 **读接口**。

### 10.5 未鉴权访问

- **请求：** `GET /api/v1/customers?page=1&pageSize=1`，**无** `Authorization`。  
- **实际：** HTTP **401**，`code:10001`，`Unauthorized`。  
- **对应 §3 意图：** §3.1「鉴权接口未登录」与 §3.9 横切安全预期一致。

### 10.6 登出后会话失效（与 §3.1 衔接）

- **步骤：** `POST /api/v1/auth/logout` 带有效 Bearer → 再 `GET /api/v1/customers?page=1&pageSize=1` **使用同一 Token**。  
- **实际（种子环境）：** logout HTTP **201**，`data.success===true`；再次请求 customers 为 HTTP **401**，`message` 为「登录已失效」类提示。  
- **说明：** 可与 §10.5 一并作为「会话生命周期」API 侧证据；**浏览器 Cookie/前端行为** 仍以 UI 为准。

---

## 11. 订单 / 报表 / 设置入口 / 会话 / `/auth/me`（T-2 续）

### 11.1 订单列表：数据范围

| 调用方 | `GET /api/v1/orders?page=1&pageSize=1` → `pagination.total` |
|--------|---------------------------------------------------------------|
| 管理员 | `5` |
| 销售员 | `4`（更少） |

→ 与 §3.6「订单列表权限范围」的 **列表层** 预期方向一致（UI 与边界场景仍待测）。

### 11.2 报表

| 请求 | 结果摘要 |
|------|----------|
| `GET /api/v1/reports/funnel?mode=snapshot`（管理员） | HTTP **200**，`data.stages` 长度 **6**（种子环境下快照漏斗阶段可读） |
| `GET /api/v1/reports/performance?periodType=month&period=2026-05`（管理员） | HTTP **200**，`data` 含 `period`、`target`、`actual`、`predicted`、`breakdown` 等 |

→ 对应 §3.7 **接口存在性**；导出、下钻、多角色报表范围需 §3 + UI 留证。

### 11.3 设置 / 管理：`/admin` RBAC

- **`GET /api/v1/admin/users?page=1&pageSize=1`** + 管理员 Bearer → HTTP **200**，分页用户列表。  
- **同一请求** + 销售员 Bearer → HTTP **403**，`message`：**「仅管理员可操作」**。  
→ 与 §3.8「RBAC / 设置入口」的 **最小 API** 一致。

### 11.4 通知与线索来源

- **`GET /api/v1/notifications?page=1&pageSize=1`**（管理员）→ HTTP **200**，分页结构正常。  
- **`GET /api/v1/sources`**（管理员）→ HTTP **200**，`data` 为对象（来源配置可读）。

### 11.5 `GET /api/v1/auth/me`（回归记录）

- **复测中发现（已修复）：** `UsersService.findById` 直接返回 Prisma 行，字段含 **`BigInt`**，响应序列化失败 → 客户端见 **`code:50001` 系统内部错误**。  
- **修复：** `apps/api/src/modules/users/users.service.ts` 将 `id` / `departmentId` 转为 **字符串**；`auth.controller.ts` 的 `me` 在找不到用户时 **404**。  
- **修复后复验：** 销售员 Token 调用 `GET /api/v1/auth/me` → HTTP **200**，`data` 含 `id`、`name`、`phone`、`email`、`role`、`status`、`departmentId`、`lastLoginAt`。

---

## 12. 无人值守扩展批次（HTTP + `pnpm lint`）

**说明：** 在用户要求「持续测试、不等待人工」的前提下，本轮仅扩展 **可脚本化** 项：**API 探测** 与 **根目录 ESLint**。**不提供** 截图/录屏；**不写** `progress.md`「测试通过」勾选。

### 12.1 联系人 / 合同 / 报价 / 商机维度的 HTTP（种子库一次快照）

| 请求 | 角色 | 结果摘要 |
|------|------|----------|
| `GET /api/v1/contacts?page=1&pageSize=1` | 管理员 | `code:0`，`pagination.total` **9** |
| 同上 | 销售员 | `pagination.total` **8**（与列表数据范围收窄一致） |
| `GET /api/v1/contracts` | 管理员 / 销售员 | `code:0`，列表非空（本库各 **1** 条合同类数据） |
| `GET /api/v1/customers/28/contacts` | 销售员 | `code:0`（`28` 为销售可见客户） |
| `GET /api/v1/opportunities/18/quotations` | 销售员 | `code:0`，返回数组长度 **1**（商机 **18** 来自种子/demo） |
| `GET /api/v1/quotation-approvals` | 管理员 | `code:0` |
| 同上 | 销售员 | `code:10002`，**无权限**（与报价审批仅管理侧一致） |
| `GET /api/v1/products` | **无** Token | `401` Unauthorized（产品目录需登录，非 Public） |

### 12.2 仅管理员：工作流与 Webhook 配置

| 请求 | 管理员 | 销售员 |
|------|--------|--------|
| `GET /api/v1/workflow/rules` | `code:0`，有规则列表 | `403` Forbidden resource |
| `GET /api/v1/webhook-configs` | `code:0` | `403` Forbidden resource |

→ 与 §3.8 中「工作流 / 集成配置仅高职级或管理员」方向一致（细粒度以产品定义为准）。

### 12.3 全局搜索（看板）

- **`GET /api/v1/dashboard/search?q=test`**（管理员）：`code:0`，结构为 `{ customers, opportunities, leads }`（关键词无命中时为空数组，属正常）。

### 12.4 销售员报表漏斗（对照 §11.2）

- **`GET /api/v1/reports/funnel?mode=snapshot`**（销售员）：`code:0`，`stages` 长度与管理员同构可读（**数据范围是否应与管理员完全一致** 仍需 §3.7 + 人工核对）。

### 12.5 静态门禁（根目录）

- **`pnpm lint`（workspace 递归）：** 退出码 **0**；**`apps/web`** 仍有 **warning**（未使用变量、`react-hooks/set-state-in-effect`、冗余 `eslint-disable` 等），**无 error**，与 T-1「门禁以 exit 0 为准」一致。
- **`pnpm typecheck`（workspace 递归）：** 退出码 **0**（与首轮自动化结论一致，本轮复跑确认）。

### 12.6 硬边界（诚实说明）

以下 **无法** 在「无人值守、无浏览器」条件下替用户跑完：

- §3 要求的 **真实 UI 操作**（失焦查重、拖拽、附件、长表单、多 Tab、移动端视口等）。
- **多角色并排** 的录屏对比、**业务专家评审**、**T-3 产品定案**、**T-4** `progress.md` 批量勾选。

**说明：** **§13** 仍 **不** 替代 §3 **UI** 验收。

---

## 13. 组长角色 + 报表只读面 + 订单路由观测（T-2 续）

**账号：** 种子 **组长** `13800000002` / `Crm@2026`（`UserRole.manager`）。

### 13.1 管理入口拒访

- **`GET /api/v1/admin/users?page=1&pageSize=1`** + 组长 Bearer → `code:10002`，**「仅管理员可操作」**（与 §11.3 管理员可访对照）。

### 13.2 报表只读（组长 Session 均 `code:0`，种子环境）

下列路径均带组长 Token，**本轮仅验证路由可用 + 成功响应壳**，**数据正确性** 仍归 §3.7 + 人工：

| 路径 |
|------|
| `/api/v1/reports/funnel?mode=snapshot` |
| `/api/v1/reports/performance?periodType=month&period=2026-05` |
| `/api/v1/reports/source` |
| `/api/v1/reports/source-funnel` |
| `/api/v1/reports/funnel-by-product` |
| `/api/v1/reports/efficiency?periodType=month&period=2026-05` |
| `/api/v1/reports/team-members` |
| `/api/v1/reports/team-activity?page=1&limit=5` |
| `/api/v1/reports/attribution` |
| `/api/v1/reports/custom`（本库返回空数组属正常） |

### 13.3 订单模块路由观测

- 列表 **`GET /api/v1/orders`** 返回项中含 `id`（例：种子环境下 **`16`**）。
- **`GET /api/v1/orders/16`**（管理员 Bearer，经全局异常包装）：**`code:20004`**，`Cannot GET /api/v1/orders/16` — **当前未实现订单单资源 GET**。  
- **说明：** 属 **API 面完整性观测**；若产品要求详情页 / 深度链接依赖单条 GET，需 **开发 Agent** 补路由；**不**在本报告中判定 §3.6 通过/失败。

### 13.4 T-3 产物指针

- **高级字段口径建议稿：** `.claude/outputs/product/t3-advanced-fields-scope-proposal.md`（待 Owner 定案后 T-4 可引用）。

---

## 14. 「一次性全测」边界说明 + 只读 GET 路由扫描

### 14.1 物理上仍无法在本轮「全部测完」的范围

以下 **不要求**、也 **做不到** 在无人类参与的一次对话内关闭：

| 类别 | 原因 |
|------|------|
| **§3 浏览器/UI** | 需真实页面操作、截图/录屏、多机型与无障碍等 |
| **写路径 / 事务** | POST、PATCH、上传、审批、支付、外部 Webhook 等会 **改数据** 或依赖第三方，本扫描 **刻意不做** |
| **业务验收判据** | 查重是否「失焦」触发、状态机是否符合 PRD、回款分期是否与财务口径一致 —— 需人读文档 + 对照 |
| **T-3 / T-4** | 产品 **定案** 与 **Owner** 对 `progress.md` 勾选负责，脚本不可替代 |

### 14.2 工程侧修复（为全扫描铺路）

在尝试「只读 GET 全覆盖」时暴露出并 **已修复**（2026-05-09 批次）：

| 问题 | 处理 |
|------|------|
| 客户 **CSV 导出** 写审计 `resourceId: 'bulk'` → `BigInt('bulk')` **崩进程** | `export` 审计改为仅 **`afterData`**；`AuditLogService` 对 **非数字** `resourceId` 置 **`null`** |
| **`CustomersService.serialize`** 使用 **`...customer`** 残留 **BigInt** | 改为 **`...scalars`** + 显式关系映射 + **`toJsonSerializable`** |
| **`GET /opportunities/:id`** 返回体含 **未剥离** 的 `orders` / `quotations` **内嵌 BigInt** | `findOne` 拆出 `orders`/`quotations` 再序列化；**`serialize`** 不再 **`...o`** |
| **`listRollbackRequests`** 中 **`...r`** 仍可能触发序列化问题 | 改为 **逐字段明文对象** + **`toJsonSerializable`** |
| **`json-serialize.util`** | 增加 **`Decimal`** 处理；导出 **`auditResourceIdToBigInt`** |

### 14.3 `pnpm api:audit` 覆盖的 GET（管理员 Token，摘要）

脚本路径：**`scripts/api-route-audit.mjs`**；前提：`docker compose up -d` + **`pnpm --filter @crm/api dev`**（或等价）且 **`localhost:3001`** 可访问。

覆盖示例（**非穷举 PRD**，仅路由存在性 smoke）：`/dashboard/counts`、客户查重/事件/疑似重复/协作/合并建议/**rollback-requests**、客户下商机、**商机详情与 export CSV**、`/reports/source-trend`、标签、通知未读数、`/admin/*`（departments、audit-logs、custom-fields、required-field-rules、export-approvals、custom-reports、system-config 抽样）、**workflow/executions**、线索/客户 **import 模板**、客户 **export CSV**、跟进列表及 **有数据时** `.../follow-ups/:id/history`、**`reports/custom/:id/run`**（无 id 时 **404 属预期**）、报价 **print HTML**、**BI `/bi/customers` 无 Key → 401 属预期**。

### 14.4 诚实结论

- **已做到：** 在仓库内留下 **可重复的只读 GET 批处理** + 修掉扫描中遇到的 **稳定性缺陷**。  
- **未做到、也不必声称做到：** 「除了 T-3/T-4 以外的全部测试」—— **§3、写路径、E2E、产品/Owner 决策** 仍属缺口。  
- **总结论：** **`TEST_PARTIAL` 不变**。

---

*本报告不修改 `progress.md` 与产品/架构文档，符合测试 Agent 边界。*
