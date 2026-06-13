# iteration-66-auto-test.md · Q48-04 时间字段命名统一

## 范围
- PIM 4 表（categories / brands / spus / skus）通过 think-migration 默认 addTimestamps() 落地为 `create_time / update_time`，与全工程其他表 `created_at / updated_at` 不一致
- 本 iter 一次性收齐：DB 改名 + 代码改名 + 顺手补 update_time → updated_at ON UPDATE

## 文件
- 1 新 migration（PIM RenameTimestampsToCreatedAt：ALTER TABLE × 4 × 2 列 CHANGE COLUMN）
- 1 编辑 PHP（PIM Admin.php replace_all `create_time` → `created_at`，7 处）

## 收口
**Q48-04** ✅（中优清单最后一项）

## 实证
- 改前：grep `create_time|update_time` 应用代码 → 7 命中（全在 pim-backend/Admin.php）
- 改后：grep 全 4 工程 → **0 命中**
- 数据：CHANGE COLUMN 仅改名，0 数据丢失
- 兼容：CHANGE 语法 MySQL 5.7+/8+ 通用

## 副作用零
- 无外部消费者按字段名直查（所有 BFF + Vue 走 OMS/PIM API，response body 字段名由 controller 控制，本次未改响应 schema）
- shop-miniprogram / shop-admin / WMS / OMS 全工程扫无 create_time 引用

## 下一步
- iter-65 sediment 时未完全清空中优；本 iter 真正清零
