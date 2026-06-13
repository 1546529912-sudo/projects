# iteration-44-auto-test.md · EFF-02 ⌘K 全局快速搜索

> 主控自动跑（curl / docker exec / DB 验证），用户无需操作。

## 范围
- **EFF-02** 全局快捷搜索：⌘K（Mac）/ Ctrl+K（Win/Linux）唤起 overlay，支持订单号 SO* / 退款号 RF* / 换货号 EX* / 11 位手机号反查 / SPU code 或名称模糊匹配
- 单 endpoint 聚合：OMS `/admin/quick-search?q=` 返 `{orders,refunds,exchanges}`；PIM `/admin/quick-search?q=` 返 `{spus}`，每类 ≤ 5 条
- Vue 全局监听 + AdminLayout 顶栏新加"🔍 快速搜索 ⌘K"按钮 + dialog overlay 结果分组点击跳详情

## 前置
- 3 账号：admin/admin123 / sales/sales123 / editor/editor123（iter-43 加）
- 0 新表 0 新 migration（纯增 2 endpoint + 1 Vue 组件）

## 用例（共 13 项，全 PASS）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | super 搜 `SO202606` | orders ≥ 1，refunds ≥ 0，exchanges ≥ 0 | code:0 orders:5 refunds:3 exchanges:0 | ✅ |
| T2 | super 搜 `RF20260604` | refunds 包含 RF20260604* 单 | code:0 refunds:2 first: RF202606040830308511 | ✅ |
| T3 | super 搜 `EX20260604` | exchanges 包含 EX20260604* 单 | code:0 exchanges:3 first: EX202606040834377719 | ✅ |
| T4 | super 搜 `13800138000`（11 位手机号） | address JSON LIKE 命中 ≥ 1 | code:0 orders:5 first: SO202606021547087170 | ✅ |
| T5 | super 搜 `a`（1 字符） | 直接返空（min 2 字符） | code:0 orders:0 | ✅ |
| T6 | super 搜 `SPU001` | PIM spus ≥ 1，name 含 iPhone | code:0 spus:1 first: SPU001 / iPhone 15 Pro Max 改名 | ✅ |
| T7 | super 搜 `iPhone`（name 模糊） | PIM spus ≥ 1 | code:0 spus:2 | ✅ |
| T8 | editor PIM quickSearch（editor 跨店白名单） | 可见 spus（同 super 视角） | code:0 editor 可见 spus:1 | ✅ |
| T9 | super 搜完整 `SO202606031520341513` | orders=1 + refunds=1（该订单有退款） | orders:1 refunds:1 exchanges:0 | ✅ |
| T10 | super 搜 `test`（收货人名） | 走 default 分支匹 address LIKE | orders:4 | ✅ |
| T11 | super 搜空 `q=` | 空集 | code:0 orders:0 refunds:0 exchanges:0 | ✅ |
| T12 | editor 调 OMS quickSearch（不应见业务单） | OMS 三类全空（角色守卫） | code:0 orders:0 refunds:0 exchanges:0 | ✅ |
| T13 | super 同查询 `SO`（T12 对照组） | orders=5（正常） | orders:5 | ✅ |

## 实施修复

| # | 问题 | 修复 |
|---|---|---|
| fix-1 | T4 手机号 `13800138000` 用原 `"%\"phone\":\"%xxx%\"%"` JSON LIKE 模式返 0 — 因为 address JSON 字段实际带空格（`"phone": "138..."` 而非 `"phone":"138..."`）| 改用简单 `LIKE "%xxx%"`（11 位纯数字撞 address 其他字段概率极低，可接受）。**经验：JSON 字段 LIKE 必须考虑序列化输出空格 — 严格 `:""` 模式 fragile；MySQL JSON_EXTRACT 才是稳的，但 MySQL 5.7+ 才有。iter-42 EFF-01 也用了同模式，将沉淀 Q44-01** |
| fix-2 | T12 editor 调 OMS quickSearch 返回业务数据（不应见）| OMS Admin.quickSearch 顶部加 `if (role == 'editor') return empty`。**经验：OMS admin group 用默认 middleware（不限角色），任何 admin 角色都通过；新加业务接口必须显式守 editor 这类"应该看不到"的角色** |

## 文件清单（~7 个）
- 1 编辑 PHP（OMS Admin.quickSearch + 路由 +1）
- 1 编辑 PHP（PIM Admin.quickSearch + 路由 +1）
- 2 编辑 ts（apis/oms.ts + apis/pim.ts 各 +1 method）
- 1 新 Vue（components/QuickSearch.vue 含全局 keydown 监听 + dialog overlay + 4 类结果分组）
- 1 编辑 Vue（AdminLayout.vue 加快速搜索按钮 + mount QuickSearch + isMac 显示）

## 总结
**13/13 ✅ + 2 fix**（fix 都在 auto 阶段捕获修完）

- ⌘K 全链路通：键盘呼出 + 4 类结果分组 + 跳详情
- 编辑器角色 + 跨库守卫双层：跨店三态 + editor 显式拒绝 OMS 业务数据
- 0 新表 0 新 migration（纯加 2 endpoint + 1 component）
- 复用：iter-29 PIM→OMS 副连接 + iter-36 StoreContextService 三态过滤 + iter-43 editor 跨店白名单

ⓘ iter-45 EFF 第 4 轮候选：**EFF-07 WMS PDA H5**（移动端拣货扫码 + 入库扫码）或 **EFF-03 审批意见字段**（Q43-02）
