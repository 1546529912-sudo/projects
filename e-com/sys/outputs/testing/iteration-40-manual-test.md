# iteration-40-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-40-auto-test.md](iteration-40-auto-test.md) 已 PASS（9/9 ✅）。

## 前置
- Vue dev server 跑（HMR 接管）
- 营销子菜单新增 2 项：**Banner 管理** / **推荐位**

## 用例（共 8 项）

### A · Vue Banner 管理

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | admin/admin123 → 营销 / Banner 管理 | 列表显示 auto-test 留的 home-001 行，含位置 tag/缩略图/链接 tag/排序/状态/有效期 | 实测填写 | ☐ |
| M2 | 点"新建 Banner" → code=home-002 / 名称=新品上市 / 位置=首页轮播 / 上传图（可从图片库选 iter-30）→ link_type=spu link_value=2 → 保存 | 列表新增 1 行 | 实测填写 | ☐ |
| M3 | 编辑 home-002 → 改状态为"停用" → 保存 → 公开接口 `curl /api/v1/banner/list?position=home` 应只剩 home-001 | 状态过滤生效 | 实测填写 | ☐ |

### B · Vue 推荐位

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M4 | 营销 / 推荐位 | 列表显示 home_hot SPU#1 一行；SPU 列含主图 + 名称（跨库 PIM 跟随展示）| 实测填写 | ☐ |
| M5 | 新增推荐 → 位置=首页新品 / SPU ID=2 / 排序=1 → 保存 | 列表新增 1 行 home_new SPU#2 | 实测填写 | ☐ |

### C · 小程序首页

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M6 | 重新进入小程序首页 | 顶部新增 swiper 轮播（auto-test 留的 home-001 图）+ 下方"🔥 热门推荐"横向滚动卡片（含图+名+价）| 实测填写 | ☐ |
| M7 | 把 home-001 banner 状态改"停用" → 下拉刷新首页 | 轮播消失，显示占位 "电商商城" 文案 | 实测填写 | ☐ |

### D · RBAC

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M8 | warehouse/wh123 登录看营销菜单 | 完全不显示（仅 super_admin/sales_ops 可见营销）| 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
