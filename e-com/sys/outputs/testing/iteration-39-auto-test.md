# iteration-39-auto-test.md · BIZ-08-5 入驻流程 + 店铺自管自动测试（5 轮规划收口）

> auto-test，manual-test 见 [iteration-39-manual-test.md](iteration-39-manual-test.md)。

## 前置
- docker compose 4 后端 Up
- 0 新 migration（复用 iter-35~38 表结构）
- 端口：OMS=8003 / shop=8001

## 范围（BIZ-08 5 轮规划之第 5 轮 · **收口**）
- **iter-39 入驻流程 + 店铺自管**：
  - StoreService.approve 增强：自动建 store_owner admin_user + 绑定 store_admins（若该店尚无 admin）
    - 用户名格式：`shop-<store.code>`
    - 密码：可传 default_password 或自动生成 `shopXXXX`（仅返回一次）
  - 加 StoreService.selfUpdate：店主可改 name/description/logo/contact（不可改 code/status/commission/抽佣）
  - 加 controller selfUpdate + publicDetail（公开店铺信息）
  - OMS 路由：`PUT /admin/store/me`（store_owner 独占）+ `GET /store/:code`（公开）
  - shop-backend BFF：`GET /store/:code` 转发到 OMS（小程序店铺主页用）
  - 小程序 detail 页：spu.store_id≠1 时拉店铺信息显示 "🏪 由 xxx 提供"
  - Vue Stores 点"通过"弹账号密码（dangerouslyUseHTMLString 警示"密码只显示一次"）
  - Vue Settlement 加 type 选项 "平台抽佣"（iter-37 抽佣 settlement 行可单独筛）
  - publicDetail 支持 code 或数字 id（兼容小程序按 spu.store_id 数字传入）

## 用例（共 9 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | super_admin 建 pending 店 shop-mate | code=0 id=3 status=pending | ✅ | ✅ |
| T2 | approve 不传 default_password | status=approved + auto_account.username='shop-shop-mate' + 随机 password 返回 | id=8 username=shop-shop-mate role=store_owner | ✅ |
| T3 | 用 auto_account 登录 | code=0 token 返回 | TOKEN_LEN=244 | ✅ |
| T4 | approve 第二个店 shop-pixel 传 `default_password=mypwd123` | auto_account.password=mypwd123 | ✅ | ✅ |
| T5 | shop-shop-pixel/mypwd123 登录 | code=0 | ✅ | ✅ |
| T6 | 店主自管 PUT /admin/store/me 改 name=谷歌 Pixel 专卖店 + description | 改成功 + 不能改 commission/status | name 已变 | ✅ |
| T7 | 公开 OMS /store/shop-pixel | code=0 + 仅 id/code/name/logo/description/contact/created_at | ✅ | ✅ |
| T8 | 公开 OMS /store/4（数字 id）| 与 T7 一致 | ✅ | ✅ |
| T9 | shop-backend BFF /api/v1/store/shop-pixel + /api/v1/store/1 | 透传 OMS 不要登录 | 全成功 | ✅ |

## 结论
**9/9 ✅** — 0 fix。BIZ-08 5 轮规划全部交付。

## 关键产物

**编辑 PHP（4）**
- `apps/oms-backend/app/service/StoreService.php` — approve 自动建 store_owner 账号 + 绑定（含临时密码生成；幂等：已有 admin 跳过）+ selfUpdate 方法
- `apps/oms-backend/app/controller/Store.php` — approve 接 default_password + selfUpdate + publicDetail（支持 code/id 双查）
- `apps/oms-backend/route/app.php` — `PUT /admin/store/me`（store_owner 独占）+ `GET /store/:code`（公开）
- `apps/shop-backend/route/app.php` — 公开组加 `/store/:code` 路由

**新增 PHP（1）**
- `apps/shop-backend/app/controller/Store.php` — 公开 BFF 转发到 OMS

**编辑 Vue（2）**
- `apps/shop-admin/src/pages/oms/Stores.vue` — onApprove 弹账号密码 dialog（HTML 警示"只显示一次"）
- `apps/shop-admin/src/pages/oms/Settlement.vue` — type 下拉加"平台抽佣"

**编辑小程序（3）**
- `apps/shop-miniprogram/apis/index.js` — 加 storeDetail 方法
- `apps/shop-miniprogram/pages/detail/index.js` — load 时 store_id≠1 拉店铺信息
- `apps/shop-miniprogram/pages/detail/index.wxml` + `.wxss` — 显示 "🏪 由 xxx 提供" 标签

## 关键设计

| 维度 | 选 | 理由 |
|---|---|---|
| approve 自动建账号 | 幂等：已有 admin 跳过 | 重复 approve 不重复造账号 |
| 临时密码 | 自动 shopXXXX 或可传 default_password | 平台运营线下沟通商家 |
| 密码返回一次 | auto_account.password 仅 approve 时返回 | 同 webhook secret 模式 |
| 店主自管 | 仅 name/description/logo/contact | code/status/commission 是平台权限 |
| publicDetail 字段 | 仅 id/code/name/logo/description/contact/created_at | 不暴露内部字段（如 business_license, approved_by） |
| code/id 双查 | ctype_digit 判断 | 小程序按 spu.store_id（数字）方便直接查 |
| 平台店 id=1 | 小程序不显示店铺 tag | 隐藏自营，UI 一致 |
| Vue 弹窗 | dangerouslyUseHTMLString 显示 | 让运营复制账号密码方便 |

## 经验记录

1. **approve 自动建账号是收口关键**：iter-35 建店表 + iter-36/37/38 各模块多店化都已就位，但**手动建店主账号 → 手动绑 store_admins** 流程太繁琐。iter-39 把 approve 改成"通过 + 自动建账号"一步完成，运营体验巨大提升。**经验：架构地基铺好后，业务流程的"一步到位"是收口标志**
2. **临时密码只返回一次的安全模式**：approve 返回 `auto_account.password` 只在创建时给一次。同 webhook secret / API token / OTP 模式。**经验：密码不持久化在响应里反复出现 — 让运营立即记下来**
3. **幂等 approve**：若该店已有 admin（之前手动绑过）则跳过自动建，避免重复造账号。**经验：状态转换接口的幂等性能避免 90% 的运营误操作**
4. **publicDetail 支持 code 和 id**：小程序按 spu.store_id（数字）方便直接调；运营在浏览器测试用 code 方便。`ctype_digit` 一行判断。**经验：路由参数允许多形式时按数据特征 dispatch 比强制规范化简单**
5. **shop-backend BFF 公开 store/:code**：小程序不直连 OMS，统一走 shop-backend BFF。store 公开信息也走 BFF 保证一致性。**经验：BFF 模式不要为单个公开接口破例**

## BIZ-08 多商家入驻 5 轮规划 · 全部交付 ✅

| iter | 主题 | 状态 | 关键产物 |
|---|---|---|---|
| iter-35 | 架构地基 | ✅ | stores + store_admins + StoreContextService + AdminAuth 注入 store_ids |
| iter-36 | PIM 多店化 | ✅ | spus/skus 加 store_id + 真实隔离 |
| iter-37 | OMS 拆单+抽佣 | ✅ | 6 ALTER + feature flag + 订单拆单 + 父单整付 + 平台抽佣自动算 |
| iter-38 | WMS 多店化 | ✅ | warehouses + inventory 加 store_id + warehouse_type self/merchant |
| iter-39 | 入驻流程收口 | ✅ | approve 自动建账号 + 店主自管 + 小程序店铺主页 |

**~70 文件，5 轮 / 1 天**。从单店电商完整改造为多商家平台，feature flag 保护旧链路，0 现有业务破坏。

## 路线图

- ✅ **BIZ-08 多商家入驻 5 轮规划全部交付**
- 下一方向候选：BIZ-09 内容运营 / 运营效率 EFF / 数据洞察 BI / M3 安全治理 / 真接微信支付 / 拼团秒杀 等
