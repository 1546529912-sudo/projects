# iteration-71-auto-test.md · PIM / 导出 5 项

## 范围
- Q28-01 xlsx 多 sheet：format='xlsx' 接 export-tasks（实际写 csv，phpspreadsheet 落地留 M3+）
- Q28-02 异步导出 + 任务表：新 export_tasks 表 + ExportTaskService（create / list / detail / run）+ 4 endpoint；run() 流式写 CSV 50000 行 + progress 5→99→100
- Q30-01 spu_attributes 反范式：新 spu_attributes 表（unique spu_id+attr_key + idx key+value）；Product.create/update 增 syncSpuAttributes 同步
- Q30-02 异步导入 + 任务表：新 import_tasks 表 + PIM Admin importTaskCreate/List/Detail；total_rows 入库时统计；progress_pct 计算
- Q31-01 image_library.used_count 维护字段：新 endpoint `POST /admin/image-library/recount` super_admin 触发全量重算（扫 spus.main_images + detail_html）

## 文件
- 1 新 migration（OMS export_tasks + import_tasks）
- 1 新 migration（PIM spu_attributes）
- 1 新 PHP（OMS ExportTaskService 完整 task lifecycle + 4 scope CSV dump）
- 1 编辑 PHP（OMS Admin 加 4 export task endpoint）
- 1 编辑 PHP（OMS route +4）
- 1 编辑 PHP（PIM Product.create + update 加 syncSpuAttributes）
- 1 编辑 PHP（PIM Admin 加 3 import task endpoint + imageLibraryRecount）
- 1 编辑 PHP（PIM route +4）

## 收口
**Q28-01(stub) / Q28-02 / Q30-01 / Q30-02 / Q31-01** ✅
**Q28-01 xlsx 落地** 留 M3+（需 phpspreadsheet 依赖 + 多 sheet 工作簿）
