# iteration-30-auto-test.md · PIM P2 剩余三件套自动测试

> 主控跑 curl，手动测试见 [iteration-30-manual-test.md](iteration-30-manual-test.md)。

## 前置
- docker compose 4 后端全 Up
- `docker exec ecom-pim-backend php think migrate:run` → 2 migration 成功（attribute_templates / image_library）
- 端口：PIM=8002 / OMS=8003（登录借 OMS 颁 JWT）

## 范围
- **A** 批量导入/导出 SPU CSV（UTF-8 BOM + fputcsv + 按 code 幂等：存在则 update / 不存在则 create draft）
- **B** 属性模板（attribute_templates 表 + CRUD + ProductEdit"应用模板"自动填 attrs）
- **C** 图片库（image_library 表 + Upload.image 落盘后自动回纳 + list + 软删 + Vue 网格视图）

## 用例（共 8 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| A-T1 | `GET /admin/spu/export` | 流式 CSV + UTF-8 BOM + 含 5 列原 SPU | 509 bytes 文件，BOM + header + 5 行 | ✅ |
| A-T2 | 准备 csv 含 1 存在 code（SPU001 改名）+ 1 新 code（SPU-IMPORT-001） | csv 准备好 | OK | ✅ |
| A-T3 | `POST /admin/spu/import` form-data file | created=1, updated=1, errors=[] | `{"created":1,"updated":1,"errors":[],"total_processed":2}` | ✅ |
| A-T4 | 上传错误 header（缺 code 列）的 CSV | 400 "CSV header 缺少必填列: code" | 准确返回 400 | ✅ |
| B-T1 | `POST /admin/attribute-template` 建"服装类"（3 attrs：颜色 select / 尺码 select / 材质 text） | code=0；attrs 数组完整回放 | id=1 + 3 项 attrs 完整 | ✅ |
| B-T3 | `PUT /admin/spu/<id> {"attrs":[...]}` 给 SPU 加 attrs（颜色=红 / 尺码=M） | spus.attrs 持久化 | attrs JSON 写入 | ✅ |
| B-T4 | 再 GET SPU 详情 | attrs 完整回放（含 type / options / value / required）| 完整回放 | ✅ |
| B-T5 | 同 code 重复建模板 | 409 "code 已存在: clothing" | 准确返回 409 | ✅ |
| C-T1 | 上传一张测试图片 → 应自动回纳 image_library | upload 返回 url；image_library 表新增 1 行 | url=/uploads/260603/xxx.jpg + 落库 | ✅ |
| C-T2 | `GET /admin/image-library/list` | 列表含刚上传的图（含 uploader=admin / size_kb / mime） | 完整字段返回 | ✅ |
| C-T3 | warehouse 调 `GET /admin/image-library/list` | 403 | "权限不足，需要角色: super_admin/sales_ops" | ✅ |

## 结论
**11/11 ✅** — PIM iter-30 P2 三件套（CSV 批量 + 属性模板 + 图片库）全过。

## 关键产物
**新增 PHP（4）**
- `apps/pim-backend/database/migrations/20260603100001_create_attribute_templates.php`
- `apps/pim-backend/database/migrations/20260603100002_create_image_library.php`
- `apps/pim-backend/app/controller/AttributeTemplate.php`
- `apps/pim-backend/app/controller/ImageLibrary.php`

**编辑 PHP（3）**
- `apps/pim-backend/app/controller/Product.php`（+ exportCsv / importCsv + create/update 接 attrs 参数）
- `apps/pim-backend/app/controller/Upload.php`（落盘后回纳 image_library，失败不阻塞上传）
- `apps/pim-backend/route/app.php`（+ 9 条新路由）

**新增 Vue（2）**
- `apps/shop-admin/src/pages/pim/Templates.vue`（模板管理 CRUD + 动态属性表单）
- `apps/shop-admin/src/pages/pim/ImageLibrary.vue`（网格视图 + 复制 URL + 移除）

**编辑 Vue（4）**
- `apps/shop-admin/src/apis/pim.ts`（+ spuImport / 5 template + 2 imageLibrary 接口）
- `apps/shop-admin/src/pages/pim/Products.vue`（+ 导出/导入按钮 + 隐藏 file input + Blob 下载）
- `apps/shop-admin/src/pages/pim/ProductEdit.vue`（+ form.attrs + 应用模板下拉 + 动态属性输入 row）
- `apps/shop-admin/src/router/index.ts` + `AdminLayout.vue`（+ 2 路由 + 2 菜单项）

## 经验记录
1. **CSV 流式输出 + UTF-8 BOM**：复用 OMS iter-18 模板（`\xEF\xBB\xBF` + fputcsv），Excel 直接打开中文不乱码。`php://temp` + fwrite + stream_get_contents 即可，不写盘
2. **导入幂等：按 code update vs create**：CSV 行 code 已存在 → 仅 update name/base_price/main_images/selling_points（不动 status / category_id 防误改），不存在 → create draft（强制 status=draft，让用户走专门 publish 流程）
3. **属性模板用 JSON schema + spus.attrs JSON 字段**：v1 不建 spu_attributes 反范式表（强约束反而吃灵活），模板只是"骨架供应商"，ProductEdit"应用模板"把 attrs schema 推到 form.attrs，让用户填 value，保存写回 spus.attrs JSON
4. **应用模板的合并语义**：按 code 去重，已存在 code 跳过（不覆盖用户已填的 value），新 code 追加。ElMessage 提示"已新增 N 项 + M 项已存在跳过"
5. **图片库自动回纳 vs 单独入库**：选自动 — 改 Upload.image 在 move_uploaded_file 成功后 insert image_library。**失败不阻塞上传**（try/catch + error_log），保证 SPU 编辑流程稳定。代价：图床盘上文件软删后不真删，UI 改"移除"语义而非"删除"
6. **Vue 文件下载用 fetch+Blob 而非 axios**：http.ts 拦截器把 axios response 拆为 `res.data`，导致 .csv 文本被当 JSON 失败。改用 fetch + Authorization header 手动发，拿原始 Blob 生成 download link，单点绕过统一拦截器
