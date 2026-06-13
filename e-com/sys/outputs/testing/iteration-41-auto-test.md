# iteration-41-auto-test.md · BIZ-09-2 营销专题 + 营销日历自动测试

> auto-test，manual-test 见 [iteration-41-manual-test.md](iteration-41-manual-test.md)。

## 前置
- 4 后端 Up；2 migration 跑过（marketing_topics + marketing_topic_items 在 oms_db）
- 端口：OMS=8003 / shop=8001

## 范围（BIZ-09 第 2 轮收口）
- **iter-41 营销专题 + 营销日历**：
  - 2 表 oms_db：marketing_topics（code+name+banner+description+start/end+sort+status+store_id）+ marketing_topic_items（topic_id+spu_id+sort，UNIQUE 防重复）
  - MarketingTopicService（含 CRUD + 关联 SPU 增删 + 公开读 + **calendar() 聚合 banner+featured+topic+coupon 4 类**）
  - MarketingTopic controller 11 接口（admin CRUD + 关联 + 营销日历 + public list/detail）
  - shop-backend Cms BFF + topic/list + topic/:code 转发
  - Vue Topics.vue（CRUD + 详情弹框管理关联 SPU）+ MarketingCalendar.vue（按时间段拉 4 类活动 + 彩色 type tag + 可点筛选 + 时间条可视化）
  - 营销菜单 + 2 项：专题管理 + 营销日历
  - 小程序 topic-detail 新页（banner + 描述 + SPU 网格）+ 首页加 topic 入口（拉 topic/list 前 3 个）

## 用例（共 8 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| Migration | 2 表建成 | marketing_topics + marketing_topic_items 在 oms_db | ✅ | ✅ |
| T1 | admin POST /admin/topic 建 618 大促 2026-06-10 → 06-20 | code=0 id=1 | ✅ | ✅ |
| T2 | admin POST /admin/topic/1/items spu_ids=[1,2] | added=2 + 跨库 PIM 回填 spu_name+main_image+price | iPhone/HUAWEI 跨库拉回 ¥8999/¥6999 | ✅ |
| T3 | 公开 GET /topic/list（today=06-03 早于 06-10）| list=[] 时间段守卫工作 | ✅ | ✅ |
| T4 | 公开 GET /topic/618-2026（详情接口不限时间）| topic + items 跨库 PIM 数据完整 | 2 SPU 名+主图+价 | ✅ |
| T5 | admin GET /admin/marketing-calendar?start=2026-06-01&end=2026-06-30 | 聚合 banner+featured+topic+coupon 4 类按 start 升序 | total=15 含全 4 类 | ✅ |
| T6 | shop-backend BFF /topic/list 透传 | code=0 list=[] 一致 | ✅ | ✅ |
| T7 | shop-backend BFF /topic/618-2026 透传 | topic + items 完整 | ✅ | ✅ |
| T8 | DELETE /admin/topic/1/items/2 移除 SPU#2 | items=1 行 | ✅ | ✅ |

## 结论
**9/9 ✅** — 0 fix。

## 关键产物

**新增 PHP（4）**
- `apps/oms-backend/database/migrations/20260603900001_create_marketing_topics.php`
- `apps/oms-backend/database/migrations/20260603900002_create_marketing_topic_items.php`
- `apps/oms-backend/app/service/MarketingTopicService.php`（含 Topic CRUD + 关联 SPU + 跨库 PIM 回填 + **calendar() 聚合 4 类活动按 start 排序**）
- `apps/oms-backend/app/controller/MarketingTopic.php`（11 接口）

**编辑 PHP（3）**
- `apps/oms-backend/route/app.php`（+ 2 公开 + 7 admin + 1 marketing-calendar）
- `apps/shop-backend/app/controller/Cms.php`（+ topicList / topicDetail BFF 转发）
- `apps/shop-backend/route/app.php`（+ 2 公开路由）

**新增 Vue（2）**
- `apps/shop-admin/src/pages/marketing/Topics.vue`（含 ImageUpload 复用 + 详情弹框管理关联 SPU + 跨库 PIM 信息显示）
- `apps/shop-admin/src/pages/marketing/MarketingCalendar.vue`（4 类 type tag 彩色 + 可点筛选 + 时间条 + 时间段 picker）

**编辑 Vue（3）**
- `apps/shop-admin/src/apis/oms.ts`（+ 9 方法）
- `apps/shop-admin/src/router/index.ts` + `AdminLayout.vue`（+ 2 路由 + 2 菜单项）

**新增小程序（4）**
- `apps/shop-miniprogram/pages/topic-detail/{js,wxml,wxss,json}`（topic banner + 描述 + 时间段 + SPU 网格 2 列）

**编辑小程序（3）**
- `apis/index.js`（+ topicList / topicDetailByCode）
- `app.json`（+ topic-detail 注册）
- `pages/home/{js,wxml,wxss}`（首页 loadTopics + 进行中专题卡片入口）

## 关键设计

| 维度 | 选 | 理由 |
|---|---|---|
| topic + items 拆 2 表 | UNIQUE(topic_id, spu_id) 防重复 | 关联表通用模式 |
| 跨库 PIM 在 service 内 | service.detail 一次性 join | 避免 caller N+1 |
| 公开 list 守时间段 | start/end NULL=不限 + 同时段 | 时间段守卫一致性 |
| 公开 detail 不守时间段 | code 直链可访问历史 | 营销复盘需求 |
| calendar 聚合 4 类 | 统一 schema `{type, id, name, start, end, status}` | UI 只渲染一种 schema |
| coupons 容错 | try/catch 跳过 | 第三方表 schema 变化不让日历崩 |
| Vue 时间条 | div + bgcolor 简单方块 | 不引第三方 gantt 库 |
| 小程序 topic 卡片 | 列表式（首页/banner/描述/时间） | 比横向滚动占据更直观 |

## 经验记录

1. **calendar 聚合 4 类活动用统一 schema**：每类查完后 map 成 `{type, id, name, start, end, status}`，前端只需渲染一种结构。**经验：异构数据聚合时把"差异性"挡在 service 层，让前端只关心"统一表征"**
2. **公开 list vs detail 守时间段不同**：list 仅返当前有效活动（业务逻辑严格），detail 不限（让复盘 + 直链分享可访问）。**经验：同一 entity 的 list/detail 守卫策略可以不同 — 列表是"展示型"，详情是"溯源型"**
3. **跨库 PIM 在 service 内一次 join**：iter-40 Featured + iter-41 Topic 都是同一模式。**经验：相同模式重复 3 次以上时考虑抽辅助方法或拷贝继承**
4. **UNIQUE(topic_id, spu_id) 在 INSERT 时捕获异常**：addItems 用 try/catch 计数 added/skipped，让运营批量操作时不被单条重复打断。**经验：批量操作的部分失败容错策略要 explicit**
5. **calendar 时间窗按 start/end overlap 算**：`start <= range_end AND end >= range_start` 双条件。**经验：时间段 overlap 不能用 BETWEEN 单字段，必须比对 start 和 end 两端**
6. **Vue 时间条直接 div + 颜色**：不引 gantt 库省 200KB 包体。**经验：原生 CSS 能解决就不引专门库，可视化简单需求慎用第三方组件**

## BIZ-09 内容运营 2 轮规划 · 全部交付 ✅

| iter | 主题 | 关键产物 | 文件数 |
|---|---|---|---|
| iter-40 | Banner + 推荐位 | banners + featured_items + 小程序首页 swiper/scroll-view | ~14 |
| iter-41 | 专题 + 营销日历 | marketing_topics + marketing_topic_items + calendar 聚合 + 小程序 topic-detail | ~16 |
| **合计** | **完整内容运营基础** | **~30 文件 / 2 轮** | — |

## 路线图

- ✅ **BIZ-09 内容运营 2 轮规划全部交付**
- 下一方向：**三、运营效率 EFF**（OMS 高级搜索 / 审批流 / 待办中心 / 角色细分 / PDA 移动端）或 **四、数据洞察 BI**（RFM 分群 / 留存分析 / 业务预警）
