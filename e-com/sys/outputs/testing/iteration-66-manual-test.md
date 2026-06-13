# iteration-66-manual-test.md · 1 项

1. 跑 `php think migrate:run` 看 RenameTimestampsToCreatedAt 通过
2. 验证 DB `DESC spus` / `DESC skus` / `DESC brands` / `DESC categories` 列名为 `created_at / updated_at`
3. PIM 后台进 "SKU 生命周期分析" / "趋势"，确认数据正常出（这两个 endpoint 内部已改 created_at）
4. 验证已有 SPU 记录的 created_at 时间没丢
