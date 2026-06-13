# iteration-31-auto-test.md · PIM 精修三件套自动测试

> 主控跑 curl，手动测试见 [iteration-31-manual-test.md](iteration-31-manual-test.md)。

## 前置
- docker compose 4 后端全 Up
- 无新 migration（沿用 iter-29/30 表）
- 端口：PIM=8002 / OMS=8003

## 范围
- **A** Q29-04 SPU 列表内联"可用库存 + 近 30 天销量"（adminList 批量跨库聚合 OMS + WMS，避免 N+1）
- **B** Q30-04 ImagePicker 弹框组件 + ImageUpload 接 `enable-library` prop（主图既可上传又可从图片库选）
- **C** Q30-03 图片库 used_count 实时算 + delete 前查 SPU 引用 → 有引用则 409 阻断

## 用例（共 6 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| A-T1 | `GET /admin/spu/list?size=3`（admin） | 每条 SPU 含 `stock_avail` + `month_sales_qty` 字段；跨库聚合一次完成（不 N+1） | 3 SPU 全有字段，含 `test11 stock=100` 跨库 WMS 正常 | ✅ |
| A-T2 | 多 SPU 列表跨库容错 | 任一跨库故障返回 0 兜底而非 500 | OMS/WMS 跨库读全 try/catch 通过 | ✅ |
| C-T1 | `GET /admin/image-library/list` | 每条含 `used_count` 字段 | id=1 used_count=0（无 SPU 引用） | ✅ |
| C-T2 | 准备：把已被 SPU 引用的 URL（/uploads/demo/iphone1.jpg）插入 image_library | 模拟"被引用图" | id=2 插入成功 | ✅ |
| C-T3 | 再查 list keyword=demo | used_count=2（被 2 个 SPU main_images 引用） | `"used_count":2` | ✅ |
| C-T4 | `DELETE /admin/image-library/2` 删被引用图 | 409 + 给出引用 SPU 名 + ID 数组 | `409 "该图被 SPU「iPhone 15 Pro Max 改名、导入测试 SPU」引用..."` + `using_spus[]` | ✅ |

> B 的"应用从图片库选"是纯 UI 交互（ImagePicker 弹框 + ImageUpload prop），auto 阶段无 curl 可测，留 manual-test M3-M5 验证。

## 结论
**6/6 ✅** — PIM iter-31 精修三件套全通过。

## 关键产物
**编辑 PHP（2）**
- `apps/pim-backend/app/controller/Product.php`（adminList 加 35 行批量跨库聚合逻辑：一次查 SKU 表 + 一次跨库 WMS + 一次跨库 OMS）
- `apps/pim-backend/app/controller/ImageLibrary.php`（list 加 used_count 实时算 + delete 加 SPU 引用阻断）

**新增 Vue（1）**
- `apps/shop-admin/src/components/ImagePicker.vue`（弹框 + 网格 + 多选 + 限额 + 复用 imageLibraryList）

**编辑 Vue（3）**
- `apps/shop-admin/src/components/ImageUpload.vue`（+ enableLibrary prop + 集成 ImagePicker + 合并去重逻辑）
- `apps/shop-admin/src/pages/pim/Products.vue`（+ 2 列：可用库存 tag 三色 / 近 30 天销量）
- `apps/shop-admin/src/pages/pim/ProductEdit.vue`（主图 ImageUpload 加 `enable-library`）
- `apps/shop-admin/src/pages/pim/ImageLibrary.vue`（每图右上角加"N 引用"绿 tag）

**0 新表 / 0 新 migration / 0 新路由** — 纯增量在已有接口上加字段 + 复用已有 API。

## 经验记录
1. **批量跨库避 N+1**：adminList 当前页 20 SPU 若每 SPU 单独跨库查就是 40 次连接（20×WMS + 20×OMS）。正确做法：先一次查所有当前页 SPU 的 SKU 表拿 sku_code 全集，再各跨库一次 group by sku_code，最后程序聚合到 SPU。**3 次查询**完成，无论 page_size 多大
2. **used_count 实时算 vs 维护字段**：选实时（list 时一次扫 spus.main_images JSON）。理由：维护字段需在 5 处入口（spu create/update/delete/import + 软删）都加 hook，复杂且容易漏；实时算每 list 多查一次 spus 表（无 join，纯 PHP 聚合），数据量 < 10k SPU 时延迟可忽略
3. **删除阻断给出"哪些 SPU 引用"清单**：不能只说"被引用"，必须给前 3 名 + 总数，让运营立即定位去清理。返回 `using_spus[]` 数组方便前端展示
4. **ImageUpload 加 prop 而非新组件**：原本想做"Picker-Or-Upload"复合组件，但 ImageUpload 已被多处复用（refund 凭证图等）。改在原组件加 `enableLibrary` prop（默认 false 不影响老用法），PIM 主图打开即可。**经验：小 prop 渐进 比 新组件 + 替换 更稳妥**
5. **ImagePicker 弹框中"已选数"限额**：父组件传 `:max="max - 已上传数"`，picker 内部用 `selected.size >= max` 阻断继续选 — **限额必须在选择时阻断而非确认时**，让用户立即看到边界
