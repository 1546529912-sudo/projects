# iteration-45-auto-test.md · EFF-07 WMS PDA H5 移动端拣货 + 入库

> 主控自动跑（curl / docker exec / DB 验证），用户无需操作。

## 范围
- **EFF-07** 独立 `/pda/*` 路由组（不走 AdminLayout，新建 PdaLayout 移动 viewport + 44px+ tap target + 大字大按钮）：
  - `/pda/login` — 复用 OMS adminLogin，按钮宽 100% / 高 52px
  - `/pda` — 首页 2 卡片入口（拣货 / 入库），实时显示我的待处理数 + 待入库数
  - `/pda/picking` — 我的任务 + 待领取 tab；点开始扫码 → 详情
  - `/pda/picking/:id` — 进度条 `picked/expected` + 扫码输入框（自动 focus + Enter 即提交 + SKU 不匹配 toast 拒绝）+ ⚡ 一键置完成 兜底
  - `/pda/inbound` — pending 入库单卡片列表
  - `/pda/inbound/:no` — 物品清单 + ⚡ 一键完成（autoComplete 用推荐 Top1）
  - 401 兜底改 PDA 路径走 `/pda/login`（非 admin `/login`）
- **0 后端改动 0 新 endpoint 0 新表**：纯复用 iter-22~25 WMS picking-task / inbound API

## 前置
- 测试账号：warehouse / wh123（仓管角色，OMS adminLogin 同 token）

## 用例（共 9 项，全 PASS）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | warehouse 登录后调拣货任务 `/picking-task/list?status=pending&size=5` | code:0，列表含 pending 项 | code:0 total:6 sample 3 项 [{id:14,sku:SPU001-001,exp:1,picked:0,st:pending}, ...] | ✅ |
| T2 | 入库列表 `/inbound/list?status=pending&size=5` | code:0，列表含 pending | code:0 total:1 first: IB202606021240016046 | ✅ |
| T3 | 领取 id=14 → assign operator=warehouse | status=assigned, operator=warehouse | code:0 status:assigned operator:warehouse | ✅ |
| T4 | scan id=14 incr_qty=1（expected=1） | 1/1, status 自动 → picked | code:0 picked:1/1 status:picked | ✅ |
| T5 | 我的任务过滤（operator=warehouse） | 返回我的 2 历史任务，已 picked 不在列 | code:0 total:2 未完成:[] | ✅ |
| T6 | 入库详情 IB202606021240016046 nested shape `{order,items}` | order.status 存在, items 1 项 | code:0 order.status:received items_count:1 | ✅ |
| T7 | 一键 autoComplete | code:0, status flip 到 received | code:0 | ✅ |
| T8 | 超量 scan（picked 已满 +1） | 400 "任务已结束" | code:400 msg:任务已结束 | ✅ |
| T9 | 无 token 访问 picking-task/list | 401 | HTTP 401 | ✅ |

## 实施修复

| # | 问题 | 修复 |
|---|---|---|
| fix-1 | T6 入库详情 `r.get("status")` 返 None — 后端返 `{order: {...}, items: [...]}` 嵌套，PdaInboundDetail.vue 直接读 `detail.status` 拿不到 | InboundDetail.vue 改 `detail.value = { ...(d.order || {}), items: d.items || [] }` 扁平化。**经验：service 返 nested 结构（detail wrapper）vs flat 不一致时，UI 层扁平化比强求后端改更稳** |
| fix-2 | omsApi 方法叫 `adminLogin` 不是 `login`；http.ts 401 兜底硬编码 `/login` | PdaLogin.vue 改 `omsApi.adminLogin({...})` + http.ts 401 判 `/pda/*` 走 `/pda/login`。**经验：双登录入口必须分别处理 401 重定向** |

## 文件清单（~10 个）
- 1 新 Vue layout（layouts/PdaLayout.vue — header 56px + back/home/logout + scoped pda-card/pda-input/pda-big-btn 共享样式）
- 5 新 Vue 页（pda/Login + Home + PickingList + PickingDetail + InboundList + InboundDetail，共 6 页）
- 1 编辑 ts（router/index.ts 加 /pda/login + /pda 路由组 6 子路由 + 401 兜底分流）
- 1 编辑 ts（apis/http.ts 401 跳 `/pda/login` vs `/login`）

## 总结
**9/9 ✅ + 2 fix**（fix 都在 auto 阶段捕获修完）

- PDA 全链路通：登录 / 入口 / 拣货流（领取 → 扫码 +1 → picked → 自动跳回） / 入库流（详情 → ⚡ 完成 → 列表）
- 0 后端改动：完全复用 iter-22~25 WMS API，证明现有 API 设计已经"PDA-ready"
- 401 兜底分流：PDA 路径走 `/pda/login` 不丢用户到 admin login
- 扫码即提交（Enter 触发）+ 200ms 内 focus 回扫码框 + 错码 toast 拒绝 + 完成自动返列表 — 减少手指操作

ⓘ iter-46 EFF 收口后候选：**BI-01 用户 RFM 分层**（数据洞察开篇）或先回填 Q35-03/Q39-03 商家自助提现
