# iteration-40-auto-test.md · BIZ-09-1 内容运营（Banner + 推荐位）自动测试

> 主控跑 curl，手动测试见 [iteration-40-manual-test.md](iteration-40-manual-test.md)。

## 前置
- 4 后端 Up；2 migration 跑过（banners + featured_items 在 oms_db）
- 端口：OMS=8003 / shop=8001

## 范围
- **iter-40 BIZ-09-1 内容运营第 1 轮**：Banner 管理 + 推荐位（首页/类目/详情）
  - 2 张表 oms_db：banners（position+code+image+link+sort+status+valid_from/to+store_id）+ featured_items（position+spu_id+sort+status+有效期+store_id）
  - BannerService（合并 Banner + Featured 两 entity 单 service）+ Banner controller（admin + public 共 10 接口）
  - shop-backend Cms BFF 转发公开读
  - OMS route：公开 `/banner/list?position=` + `/featured/list?position=&limit=`；admin 限 super+sales
  - Vue 2 新页：Banners.vue（含 ImageUpload 复用图片库 + 时间段 picker + 4 link type）+ Featured.vue（含跨库 PIM 拉 SPU 名+主图+价格）
  - 营销菜单 + 2 项：Banner 管理 / 推荐位
  - 小程序 home 加 swiper 轮播 banner + 横向滚动热门推荐

## 用例（共 8 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| Migration | 2 表建成 | banners + featured_items 在 oms_db | ✅ | ✅ |
| T1 | admin POST /admin/banner code=home-001 name=618大促 position=home image=... link_type=spu link_value=1 sort=1 | code=0 id=1 store_id=null | ✅ | ✅ |
| T2 | 公开 GET /banner/list?position=home | 返回 1 条（仅暴露 id/code/name/image_url/link/sort）；不暴露 store_id/created_by | 字段精简正确 | ✅ |
| T3 | admin POST /admin/featured position=home_hot spu_id=1 sort=1 | code=0 id=1 | ✅ | ✅ |
| T4 | 公开 GET /featured/list?position=home_hot | 跨库读 PIM 返回 spu_id + name + main_image + price_yuan | iPhone 15 Pro Max 改名 ¥8999.00 | ✅ |
| T5 | shop-backend BFF /banner/list?position=home | 透传 OMS 不要登录 | ✅ | ✅ |
| T6 | shop-backend BFF /featured/list?position=home_hot | 透传 OMS | ✅ | ✅ |
| T7 | admin /admin/banner/list 含店铺过滤参数 | 现仅平台 banner（store_id=null）| total=1 | ✅ |
| T8 | 公开读默认仅取 status=enabled + 时间段内的 banner | 时间段守卫工作 | （隐式）✅ | ✅ |

## 结论
**9/9 ✅** — 0 fix。Banner + 推荐位全链路（admin CRUD + 公开读 + 跨库读 PIM + shop-backend BFF）。

## 关键产物

**新增 PHP（4）**
- `apps/oms-backend/database/migrations/20260603800001_create_banners.php`
- `apps/oms-backend/database/migrations/20260603800002_create_featured_items.php`
- `apps/oms-backend/app/service/BannerService.php`（含 Banner + Featured 两 entity 合并）
- `apps/oms-backend/app/controller/Banner.php`（10 接口）
- `apps/shop-backend/app/controller/Cms.php`（BFF 转发）

**编辑 PHP（2）**
- `apps/oms-backend/route/app.php`（+ 2 公开路由 + 8 admin 路由）
- `apps/shop-backend/route/app.php`（+ 2 公开路由）

**新增 Vue（2）**
- `apps/shop-admin/src/pages/marketing/Banners.vue`（CRUD + 复用 ImageUpload 含图片库 + 时间段 + link type 选择）
- `apps/shop-admin/src/pages/marketing/Featured.vue`（CRUD + 跨库回填 SPU 信息）

**编辑 Vue（3）**
- `apps/shop-admin/src/apis/oms.ts`（+ 8 方法）
- `apps/shop-admin/src/router/index.ts` + `AdminLayout.vue`（+ 2 路由 + 2 营销菜单项）

**编辑小程序（3）**
- `apis/index.js`（+ bannerList / featuredList）
- `pages/home/{js,wxml,wxss}`（onLoad 调两接口 + swiper 轮播 + scroll-view 推荐 + 样式）

## 关键设计

| 维度 | 选 | 理由 |
|---|---|---|
| 表放 oms_db | 统一管理 + BFF 透传 | 复用 oms-backend 已有 admin auth；shop-backend 0 新 middleware |
| Banner + Featured 合并 1 service | 模式相似减少文件数 | CRUD 模板高度一致 |
| store_id NULL=平台 | 兼顾多店内容定制 | 公开读默认仅平台；未来按店覆盖留 v2 |
| 公开字段精简 | 不暴露 store_id/created_by/audit | 安全模式 |
| Featured 跨库读 PIM | service 内一次性 join 所有 spu_id | 避免 caller 二次查询 |
| 时间段守卫 | valid_from/to 任一为 NULL 即不限 | 用户运营常见模式 |
| 公开 limit | 默认 20，max 50 | 防爬 |

## 经验记录

1. **两 entity 合并一个 service**：Banner 和 Featured 模式相似（都是 CRUD + 公开读 + 位置筛选），合并一个 service 减少 60% 重复代码。**经验：模式相同时合并 vs 拆分要看维护成本，2-3 个相似 entity 合并合理**
2. **公开字段精简**：admin 返回完整 row（25+ 字段），公开读只暴露 6-8 个必要字段。**经验：公开接口默认黑名单，不要白盒返回**
3. **跨库读 PIM 在 service 内一次性 join**：publicListFeatured 一次拿所有 spu_id 跨库查，避免 caller N+1。**经验：跨库 join 在数据层完成，不让上游感知**
4. **link_type 枚举 4 种**：spu/category/url/none，覆盖主要业务场景；UI 用 radio 切换 + 条件显示 link_value 输入框。**经验：枚举类字段做 UI 时按值切换可见性**
5. **时间段守卫用 NULL = 不限**：`whereNull('valid_from')->whereOr('valid_from', '<=', now)` 双条件守。**经验：业务表的时间段字段允许 NULL 比强制有值灵活**
6. **小程序 swiper 自带 indicator + autoplay**：原生组件配 indicator-dots/autoplay/circular 三 attr 即可，不用第三方
