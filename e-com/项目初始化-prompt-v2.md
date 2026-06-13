# 多 Agent 项目初始化 Prompt v2.0（电商商城专版）

> 本版本基于通用 v1 prompt，融合本项目的硬性约束：
> 1. **业务范围**：电商商城（含 PIM / OMS / WMS / 商城页面 四个系统）
> 2. **技术栈固定**：PHP + ThinkPHP 8 + MySQL + 原生微信小程序 + Vue 3 + Element Plus
> 3. **设计参考固定**：Airbnb 风格 + 关键组件复用
> 4. **已下载 skill 优先使用**

---

## 零、项目背景与硬性约束【必须遵守】

### 0.1 项目定位
搭建一套电商系统，覆盖 **商城页面 / PIM / OMS / WMS** 四个子系统的最小可运行骨架。

### 0.2 业务输入（已存在）
本项目 PRD 已就绪，**禁止重新创作**，所有 Agent 必须基于以下文档工作：

- [project/e-com/商城页面/商城页面-PRD.md](./商城页面/商城页面-PRD.md)
- [project/e-com/PIM/PIM-PRD.md](./PIM/PIM-PRD.md)
- [project/e-com/OMS/OMS-PRD.md](./OMS/OMS-PRD.md)
- [project/e-com/wms/WMS_PRD_v2.md](./wms/WMS_PRD_v2.md)
- [project/e-com/电商系统整体架构.md](./电商系统整体架构.md)（跨系统协同手册）

### 0.3 技术栈（已固化，不再"待确认"）

| 层 | 技术 | 说明 |
|---|---|---|
| 后端 | PHP 8 + **ThinkPHP 8** | 4 个子系统各一套独立工程 |
| 数据库 | MySQL 8 | 1 个实例，4 个 database：`shop_db` / `pim_db` / `oms_db` / `wms_db` |
| 缓存 | Redis 7 | 队列 / 缓存 / 库存锁 |
| 移动端 | **原生微信小程序** | wxml + wxss + js，不使用 uni-app / Taro |
| 商家后台 | **Vue 3 + Element Plus** | 单页应用，调 ThinkPHP API |
| 容器化 | docker-compose | 一键起 MySQL + Redis + 4 个 PHP 服务 |

### 0.4 范围与裁剪
- **MVP 范围**：四个子系统各取 PRD 中 M1/一期。
- **本期不做**：营销系统（优惠券/秒杀/满减）、独立支付中台、独立用户中心、独立 ERP。
- **临时处理**：用户表临时放 `shop_db.users`；支付直接接微信支付 SDK；财务数据先落库不外推。

### 0.5 设计参考（已固化）
- **风格参考**：[Airbnb 设计组件库](https://github.com/1546529912-sudo/all_skills/tree/main/design-md/airbnb)
- **复用层级**：风格 + 关键组件（详情页 / 商品卡片 / 筛选器）复用，其他自画
- 设计 Agent 必须解析该仓库，在 `design-brief.md` 中明确列出复用的组件清单

---

## 一、项目初始化总目标

帮我初始化一个新的多 Agent 项目（**电商商城 v1**）。一次性生成完整结果，不只是文档，必须同时落地：
- 完整的多 Agent 协作文档体系
- 真实的工程目录与代码骨架（4 个 PHP 后端 + 1 个小程序 + 1 个 Vue 后台 + docker-compose）
- 第一轮可执行的开发任务
- progress 机制 + 反脱节验证

如果我没明确说"只要文档"，默认必须同时生成上述所有内容。
**项目初始化完成 = 仓库里有真实工程，不是只有治理文档。**

---

## 一·五、Skill 使用策略【必须遵守】

### 启动前必扫
每个 Agent 启动时，第一步必须扫描已装 skill：
```bash
ls ~/.claude/skills/
```
并在自己的工作日志中列出"本任务匹配到的 skill 清单"。

### 命中即用
按角色匹配关键词，命中以下 skill **必须使用**（用 Skill 工具调起）：

| 角色 | 必用 skill |
|---|---|
| 产品 Agent | `prd-development`、`user-story`、`user-story-splitting`、`jobs-to-be-done`、`problem-statement`、`epic-breakdown-advisor` |
| 架构 Agent | （目前无强匹配，按需）|
| 设计 Agent | `web-design-guidelines`（仅用于审查 UI 规范） |
| 开发 Agent | `karpathy-guidelines`（通用编码规范） |
| 主控 Agent | `prioritization-advisor`（拆 phase 用） |
| 流程类 | `skill-authoring-workflow`（若需要新建 skill）|

### 禁止
- 禁止擅自 `npx -y skills add ...` 安装新 skill；
- 没命中的 skill，按全局规则走"按需推荐 → 用户确认 → 安装"流程；
- 禁止假装用过 skill 但实际没调用——主控对账时会检查工作日志。

---

## 二、角色清单与硬约束

### 总则:所有角色的通用要求

每个角色必须有自己的目录和 SKILL.md，每份 SKILL.md 至少包含:
- **read first**（启动时必读的文件清单，必须包含本项目 PRD 路径）
- **responsibilities**（这个角色具体负责什么）
- **workflow**（接到任务后的工作步骤）
- **required outputs**（必须输出什么文件，路径明确）
- **guardrails**（绝对不做什么）
- **blocking / escalation**（遇到阻塞怎么上报）
- **skill check**（启动时必扫的 skill 关键词，参见 §一·五）

**关键原则:任何角色，如果没有"required outputs"清单，就等于这个角色没有被实质定义。**

### 2.1 主控 Agent（orchestrator）

**职责:** 流程编排、任务调度、progress 维护、阶段切换决策

**必须输出:**
- `README.md`（项目导航，≤50 行）
- `AGENTS.md`（角色清单与调度规则）
- `HARNESS.md`（防错机制）
- `EXECUTION_POLICY.md`（返工与升级规则）
- `progress.md`（任务进度，唯一真相源）
- `outputs/orchestration/iteration-N-runbook.md`（每轮 runbook）
- `outputs/orchestration/reconcile-report-iteration-N.md`（每轮对账报告）

**硬约束:**
- 只有主控 Agent 可回写 progress.md
- 每轮 Phase 切换前，必须先生成对账报告
- 对账报告中任何"已完成"条目，证据不全则状态打回"待返工"
- 对账时必须用 `ls` / `grep` 真实验证，不允许凭 Agent 自述结论

**不做的事:**
- 不直接编码
- 不直接出设计稿
- 不替代任何下游 Agent 的工作

### 2.2 产品 Agent ★ 本次重点强化

**职责:** 把已有 PRD **细化**为可执行的任务清单和验收标准（**禁止重新创作 PRD**）

**read first（必读）:**
- [project/e-com/电商系统整体架构.md](./电商系统整体架构.md)
- [project/e-com/商城页面/商城页面-PRD.md](./商城页面/商城页面-PRD.md)
- [project/e-com/PIM/PIM-PRD.md](./PIM/PIM-PRD.md)
- [project/e-com/OMS/OMS-PRD.md](./OMS/OMS-PRD.md)
- [project/e-com/wms/WMS_PRD_v2.md](./wms/WMS_PRD_v2.md)

**必须输出（5 份核心产物）:**
- `outputs/product/feature-breakdown.md` — 功能拆解（每个 PRD 功能拆为子功能，**按系统分章节**：商城/PIM/OMS/WMS）
- `outputs/product/task-spec.md` — 任务定义清单（每个子功能配判定标准）
- `outputs/product/edge-cases.md` — 边界与异常情况清单
- `outputs/product/non-goals.md` — 明确不做的范围（必须列出本期不做的 营销/支付中台/独立用户中心 等）
- `outputs/product/design-brief.md` — 给设计 Agent 的输入清单

**task-spec.md 的格式硬约束:**

每个子功能必须包含:
- 任务 ID（前缀按系统：`SHOP-XXX` / `PIM-XXX` / `OMS-XXX` / `WMS-XXX`）
- 一句话描述
- 至少 5 条判定项（不允许"实现 xxx 功能"这种模糊描述）
- 判定项必须覆盖: 正常流程 / 异常流程 / 边界情况 / 交互细节 / 数据状态
- 每条判定项必须可验证（写明"怎么验证"）

**粒度规则（本项目固化）:**
- **MVP 范围内**：按 PRD 功能数 × 5 拆任务
- **非 MVP 范围**（M2-M5 的内容）：只列功能名 + 一句话描述，不展开判定项
- MVP 范围界定参考各 PRD 的"M1"或"一期"

**design-brief.md 的格式硬约束:**

至少包含:
- **风格参考**：必须包含 [Airbnb design-md 仓库 URL](https://github.com/1546529912-sudo/all_skills/tree/main/design-md/airbnb)，并列出**要复用的关键组件**（建议至少 3 类：商品卡片 / 详情页布局 / 筛选器）
- 色彩偏好或品牌色（如未指定，从 Airbnb 取色：`#FF385C` 红 + `#222222` 文本 + `#717171` 次级文本）
- 目标用户审美定位（C 端年轻消费者 + 商家后台运营人员）
- 必须避免的风格（土味/拼多多式密集排版/低端配色）
- 关键页面的视觉密度倾向（小程序留白偏多，后台信息密度中等）

**硬约束:**
- 产品 Agent 是 Phase 0（设计确认）之前的 **Phase -1**
- Phase -1 切换条件: 5 份产物全部提交 + 用户确认通过
- task-spec.md 的 MVP 任务数 ≥ MVP 功能数 × 5
- design-brief 不得为空，不得只写"参考 Airbnb"——必须列出具体复用的组件清单

**未完成时:**
- 设计 Agent 不得启动
- 架构 Agent 不得启动
- 开发 Agent 不得启动
- progress.md 不得新增任何开发条目

**不做的事:**
- **不写 PRD**（PRD 已就绪，产品 Agent 的任务是"细化已有 PRD"，不是"创作")
- 不出设计稿
- 不写代码

### 2.3 设计 Agent ★ 加 design-brief 前置 + Airbnb 解析

**职责:** 出原型图、交互设计、视觉规范

**启动前置条件:**
- `outputs/product/design-brief.md` 必须存在且经用户确认
- 未拿到 design-brief 时，设计 Agent 必须主动向用户索要，不得自行启动出图
- **必须先访问 [Airbnb design-md 仓库](https://github.com/1546529912-sudo/all_skills/tree/main/design-md/airbnb)** 解析可复用组件清单

**必须输出:**
- 每个 MVP 核心页面的原型图（含至少 4 个状态: 默认 / 加载 / 完成 / 异常）
- 每个原型图必须配交互说明
- `outputs/design/design-system.md`（颜色、字体、间距、组件规范）
- `outputs/design/airbnb-components-map.md` — **Airbnb 组件 → 本项目页面**的映射表，每条说明：复用哪个 Airbnb 组件 / 应用在哪个本项目页面 / 改动了什么 / 为什么改

**原型图格式硬约束:**
- 必须有页面状态枚举（不允许只画"默认态"一张）
- 必须有交互说明（点击哪里发生什么）
- 必须有边界情况标注（空数据 / 错误 / 超长内容怎么处理）
- 小程序与后台分别成册，标注目标端

**不做的事:**
- 不写代码
- 不做技术架构决策

### 2.4 架构 Agent（本项目已固化为"中型集合"）

**职责:** 技术方案、数据结构、模块划分

**项目档位（已固化）：中型集合**
- 多个独立后端服务 + 移动端 + 后台 + 外部依赖（微信支付/微信小程序登录）

**必须输出:**
- `outputs/architecture/tech-stack.md`（**第一行必须固化为本项目技术栈，不得改写**）
- `outputs/architecture/data-schema.md`（**按系统分章节**：shop_db / pim_db / oms_db / wms_db 的核心表）
- `outputs/architecture/api-list.md`（4 个后端的 API 清单，**带跨系统调用关系**）
- `outputs/architecture/module-deps.md`（模块依赖关系，参考整体架构文档的边界图）
- `outputs/architecture/data-flow.md`（关键数据流：下单/履约/售后/库存）

**tech-stack.md 第一行模板（必须照抄）:**
> 本项目技术栈：后端 PHP 8 + ThinkPHP 8 + MySQL 8 + Redis 7；移动端原生微信小程序；商家后台 Vue 3 + Element Plus；容器 docker-compose。项目档位：中型集合。

**硬约束:**
- 不允许"过度设计"（个人小程序写微服务拆分）也不允许"欠设计"（中型 SaaS 只交一个 schema）
- 4 个子系统的 `data-schema.md` 必须分别给出建表 SQL（不是只画 ER 图）
- API 列表必须包含跨系统调用（如 OMS 调 WMS 的 `/picking-order`）

**不做的事:**
- 不替代产品 Agent 定义需求
- 不写业务代码

### 2.5 开发 Agent ★ 加产物清单要求

**职责:** 按 task-spec 实现功能代码

**编码规范（本项目固化）:**
- PHP：遵循 **PSR-12**；命名空间 `App\<System>\...`
- 小程序：原生 wxml/wxss/js，目录按 `pages/` 分；公共组件放 `components/`
- Vue 后台：Vue 3 Composition API + `<script setup>`；Element Plus 按需引入
- 所有 API：JSON in/out，统一响应格式 `{code, msg, data}`

**必须输出（每完成一个任务）:**

按以下格式提交产物清单，禁止只写"完成 xxx 任务":

```
任务 ID: SHOP-001
产物清单:
- apps/shop-backend/app/controller/User.php （新增）
- apps/shop-backend/app/model/User.php （新增）
- apps/shop-backend/route/app.php （修改：+8 行）
- apps/shop-backend/tests/UserTest.php （新增）
关键函数/接口:
- POST /api/user/login
- App\Shop\Controller\User::login()
判定项对照:
- ✅ 手机号+验证码登录 → tests/UserTest::testLoginByCode
- ✅ 验证码错误返回 400 → tests/UserTest::testInvalidCode
- ⚠️ 未实现：图形验证码（原因：MVP 不要求，已沟通确认）
```

**硬约束:**
- 没有"产物清单"的任务，progress.md 不得标记完成
- 产物清单里声称的文件必须真实存在（主控对账时会验证）
- 判定项对照必须逐条对应 task-spec.md，未完成项必须标注"⚠️ 未实现 + 原因"
- **每个 PHP 工程必须能 `php think run` 独立启动**
- **小程序必须能在微信开发者工具里加载首页不报错**

**不做的事:**
- 不擅自扩大需求范围
- 不在 task-spec 之外的功能上"顺便加点东西"
- 不修改未声明的文件

### 2.6 测试 Agent ★ 重新定义能力边界

**关键变化:测试 Agent 区分"自动化测试"和"手动测试清单"两类工作。**

**测试 Agent 真实能做的（自动化测试）:**
- 检查文件是否存在
- 检查函数/接口名是否能在代码里找到
- 检查代码规范（命名、PSR-12、ESLint 等）
- 检查 schema 是否合法
- 检查文档是否齐全
- 跑自动化测试脚本（PHPUnit / Vitest）
- 用 curl/Postman 脚本测 API 响应

**测试 Agent 不能做的（手动测试，必须由用户执行）:**
- 在微信开发者工具中操作小程序 UI
- 在浏览器中操作 Vue 后台
- 验证微信支付实际付款流程
- 验证视觉呈现是否符合 Airbnb 风格
- 验证小程序在真机上的表现

**必须输出（每个 Phase 结束时两份文档）:**

1. `outputs/testing/phase-N-auto-test.md` — 自动化测试报告
   - 这份由测试 Agent 自己填，必须有"实际结果"
   - 不允许只交模板
   - 不允许"待填写"作为最终交付状态

2. `outputs/testing/phase-N-manual-test.md` — 手动测试清单
   - 这份由测试 Agent 列出步骤，**用户填写结果**
   - 格式: 每条用例必须可勾选 + 留空给用户写实际结果
   - 必须包含：小程序端 / Vue 后台 / 微信支付三类手动验证

**硬约束:**
- Phase 切换条件: 自动化测试报告全部 PASS + 手动测试清单被用户勾选完
- 测试 Agent 提交的报告，"实际结果"栏位必须有内容，否则视为未提交
- 不允许提交全是【待填写】的文档作为最终产物

**不做的事:**
- 不假装做了它做不到的测试
- 不在没有用户验证的情况下宣称"全流程通过"

---

## 三、Phase 流程与门控

### 标准 Phase 顺序（本项目）

```
Phase -1: 产品 Agent 细化 PRD（5 份产物）
   ↓
Phase  0: 设计 Agent + 架构 Agent 并行（设计 brief 已就绪）
   ↓
Phase  1: 工程骨架初始化（4 PHP + 小程序 + Vue 后台 + docker-compose）
   ↓
Phase  2: 单系统 MVP 开发（商城 → PIM → OMS → WMS 串行 or 并行视资源定）
   ↓
Phase  3: 跨系统联调（下单 → 履约一条链路打通）
   ↓
Phase  4: 测试 + 文档完善 + 上线准备
```

### 每个 Phase 切换的硬约束

**切换前必须执行的检查清单:**
1. 上一 Phase 所有任务的产物清单已提交
2. 产物清单中声称的文件，主控 Agent 已逐个 `ls` 验证存在
3. 自动化测试报告"实际结果"栏位全部有内容
4. 手动测试清单已被用户勾选完成
5. 对账报告 `outputs/orchestration/reconcile-report-iteration-N.md` 已生成

**任一项不满足，禁止切换。**

### 返工与升级规则

- 子 Agent 自主返工上限 3 次
- 第 4 次仍未通过 → 升级给主控 Agent
- 主控介入后可再给 1 次定向修正
- 同类问题连续 2 次出现 → 主控提前介入
- 同类问题第 3 次出现 → 暂停该 Phase，主控判断是否需要重做 task-spec

---

## 四、progress.md 反脱节机制

### 状态变更的证据要求

任何任务从"进行中"改为"完成"，必须同时具备:
- 涉及的文件路径（相对项目根目录，如 `apps/shop-backend/app/controller/User.php`）
- 涉及的函数/接口/类名（必须能在代码里 grep 到）
- 自动化测试结果（PHPUnit/Vitest 输出，如适用）
- 手动测试用户确认（如适用）
- 改动时间戳（精确到分钟）

**缺任一项，状态保持"待验证"，不得标记完成。**

### 对账机制（每轮 Phase 结束强制执行）

主控 Agent 更新 progress.md 前，必须执行:
1. 读取 progress.md 中所有"已完成"条目的证据
2. 逐条验证文件/函数/测试是否真实存在（用 `ls` / `grep`）
3. 验证失败的条目，状态打回"待返工"，记录失败原因
4. 输出 `outputs/orchestration/reconcile-report-iteration-N.md`
5. 对账报告生成后，才能更新 progress.md

### 认知一致性检查

当两个 Agent 对同一任务状态描述不一致:
- 以"产物清单"为准，不以"状态描述"为准
- 文件不存在 = 任务未完成，不管 Agent 怎么说

### progress.md 结构要求

- 【当前焦点】区块在最前
- 每条任务必含: Task ID / 负责角色 / 所属系统（商城/PIM/OMS/WMS）/ 状态 / 产物路径 / 完成条件 / 证据
- 必须有"当前问题"区
- 必须有"返工记录"区
- 已完成内容下沉到归档区，不占用前 1/3 视野

---

## 五、文档体系与 Context 规则

### README.md 要求（≤ 50 行）

- 全项目唯一的"当前状态速览 + 导航入口"
- 任何 Agent 启动时第一个读的文件
- 必含: 当前焦点 / 核心规则 / 角色导航 / 关键文件索引 / 当前阻塞 / 已装 skill 速览
- 每次 Phase 切换主控刷新【当前焦点】
- 超过 50 行必须裁剪，溢出内容下沉到对应文档

### 信号词标注

- 【当前焦点】= 现在在做什么，每次必读
- 【必须遵守】= 核心规则，不可跳过
- 【按需查看】= 细节内容，用到再读
- 【已完成归档】= 已完成内容，不需要再执行

### Context 结构原则

- 每份文档最前面必须有【当前焦点】区块
- 重要内容放在文件前 1/3
- 用列表格式，不用长段落
- 历史和细节放后面

---

## 六、代码初始化与项目骨架

### 6.1 技术栈（已固化，不再询问）

参见 §0.3。**不再触发"小程序/移动端必须先问"的规则**，因为已明确为原生微信小程序。

### 6.2 必须生成的工程目录

```
project/e-com/
├── apps/
│   ├── shop-backend/        # ThinkPHP 8（商城）
│   ├── pim-backend/         # ThinkPHP 8（PIM）
│   ├── oms-backend/         # ThinkPHP 8（OMS）
│   ├── wms-backend/         # ThinkPHP 8（WMS）
│   ├── shop-miniprogram/    # 原生微信小程序
│   ├── shop-admin/          # Vue 3 + Element Plus
│   └── docker-compose.yml   # MySQL + Redis + 4 PHP
├── .agents/
│   ├── orchestrator/SKILL.md
│   ├── product/SKILL.md
│   ├── design/SKILL.md
│   ├── architecture/SKILL.md
│   ├── development/SKILL.md
│   └── testing/SKILL.md
├── outputs/
│   ├── product/
│   ├── design/
│   ├── architecture/
│   ├── orchestration/
│   └── testing/
├── README.md
├── AGENTS.md
├── HARNESS.md
├── EXECUTION_POLICY.md
└── progress.md
```

### 6.3 每个工程的最小可运行骨架

| 工程 | 最小可运行能力 |
|---|---|
| shop-backend / pim-backend / oms-backend / wms-backend | ThinkPHP 8 init + `GET /health` 接口 + 1 张表 migration + 1 个 PHPUnit 用例 |
| shop-miniprogram | 首页 + 商品列表（mock 数据）+ 调通 shop-backend `/health` 接口 |
| shop-admin | 登录页 + 商品列表页（mock 数据）+ 调通 pim-backend `/health` 接口 |
| docker-compose | 一键 `docker-compose up` 起 MySQL + Redis + 4 个 PHP 服务 |

### 6.4 端到端最小联通链路（必须打通）

```
小程序首页 → shop-backend /api/product/list → 调 pim-backend /api/product/list → MySQL 返回数据 → 小程序展示
```

---

## 七、默认推导与待确认机制

### 7.1 本项目已明确，**不再推导**的内容
- 业务范围（四系统骨架）
- 技术栈（§0.3）
- 设计参考（Airbnb）
- 用户/支付/营销系统的处理方式（§0.4）

### 7.2 仍可能需要推导的内容

如果 PRD 某处遗漏，产品 Agent 可推导：
- 具体字段细节（如订单表的某个枚举值）
- 默认状态机的过渡条件
- 异常分支的处理策略

架构 Agent 可推导：
- ThinkPHP 模块划分细节
- Redis 缓存 key 命名规范
- API 版本管理策略

**所有推导内容必须标注为「待确认默认值」**，区分:
- 用户明确需求（不可改）
- Agent 推导假设（待用户确认）

---

## 八、执行原则

- 能直接创建就直接创建
- 能直接落地代码就不要只写建议
- 能明确成任务就不要停留在抽象描述
- 能形成可执行初始化结果就不要只交付文档集合

**除非我明确说"只出方案，不落地文件"，否则以"真实初始化项目"为最终目标。**

---

## 九、最终交付检查清单

初始化完成后，输出必须同时满足:

**通用检查（来自 v1）：**
1. ✅ 文档体系完整（含本 prompt 列出的全部产物）
2. ✅ 产品 Agent 5 份核心产物已生成
3. ✅ 设计 Agent 已拿到 design-brief（或主动向用户索要）
4. ✅ 测试 Agent 区分了自动化测试和手动测试清单
5. ✅ 项目目录真实存在
6. ✅ 至少一条端到端可运行链路
7. ✅ progress.md 反脱节机制已就位
8. ✅ 第一阶段不只有文档任务，包含真实开发条目

**本项目专项检查（v2 新增）：**
9. ✅ `design-brief.md` 中已列出**至少 3 个**复用的 Airbnb 组件
10. ✅ `tech-stack.md` 第一行已固化为 §0.3 模板
11. ✅ 4 个 PHP 工程都能 `docker-compose up` 起来，`/health` 返回 200
12. ✅ 小程序能在微信开发者工具中加载首页不报错
13. ✅ Vue 后台能 `npm run dev` 起来，能进入登录页
14. ✅ 端到端链路（小程序首页 → 商品列表 → pim-backend）已打通
15. ✅ README.md 中【当前焦点】指向 Phase -1（或当前所在 Phase）
16. ✅ 每个 Agent 的 SKILL.md 中 `skill check` 段落已写明命中关键词
17. ✅ 主控对账报告已生成第一份（即使内容是"骨架阶段无任务可对账"）

---

## 附录 A：本项目 MVP 范围速查（基于已有 PRD）

| 系统 | MVP 范围 | 来源 |
|------|---------|------|
| 商城 | 登录注册、首页、分类、商品列表、商品详情、购物车、结算、支付、订单列表/详情 | 商城页面-PRD §11 M1 |
| PIM | 类目、属性、SPU/SKU、品牌 基础 CRUD | PIM-PRD §9 M1 |
| OMS | 订单接收+标准化、状态机、库存四态、WMS 联动 | OMS-PRD §8 M1 |
| WMS | 基础数据、入库、库存表+流水、出库（摘果式）| WMS_PRD_v2 §9 一期 |

非 MVP（M2-M5 / 二三期）的功能：在 `feature-breakdown.md` 中列名，但 `task-spec.md` 中不展开判定项。

---

## 附录 B：已下载 skill 速查

启动每个 Agent 前先扫一次 `~/.claude/skills/`。本项目相关 skill：

- **PM 类（产品 Agent 必用）**：
  `prd-development` / `user-story` / `user-story-splitting` / `jobs-to-be-done` / `problem-statement` / `epic-breakdown-advisor` / `epic-hypothesis` / `user-story-mapping` / `prioritization-advisor`

- **设计审查**：`web-design-guidelines`

- **通用编码**：`karpathy-guidelines`

- **流程**：`skill-authoring-workflow`、`workshop-facilitation`、`loop`、`schedule`

- **不直接相关（本项目用不上）**：所有 `vercel-*` 系列、`deploy-to-vercel`、各类 advisor/canvas 类

---

*v2 修订记录：*
- *新增 §零 项目背景与硬性约束*
- *新增 §一·五 Skill 使用策略*
- *§2.2 产品 Agent 改为"细化 PRD"而非"创作"；粒度规则改为 MVP × 5*
- *§2.3 设计 Agent 加入 Airbnb 仓库前置 + 组件映射表产物*
- *§2.4 架构 Agent 档位固化为"中型集合"，tech-stack.md 第一行模板化*
- *§2.5 开发 Agent 加入本项目编码规范*
- *§2.6 测试 Agent 的手动测试清单加入小程序/Vue 后台/微信支付三类*
- *§六 删除"小程序必须先问"规则，列出 7 个工程的最小可运行骨架*
- *§七 收窄推导范围*
- *§九 新增 9 条项目专项验收*
- *附录 A、B 新增*
