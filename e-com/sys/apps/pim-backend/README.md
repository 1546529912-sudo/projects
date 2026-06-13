# pim-backend

商品信息管理（PIM）。商品基础数据的"主"数据源。

## 端口
- 容器内 80
- 宿主机映射 8002

## 关键接口
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /health | 健康检查 |
| GET | /api/v1/product/list | 商品列表（从 spus 表读）|
| GET | /api/v1/product/:sku | SKU 详情 |

完整 API 见 [../../../outputs/architecture/api-list.md](../../outputs/architecture/api-list.md) §二。

## Seed 数据
默认 3 个类目 / 3 个品牌 / 3 个 SPU / 5 个 SKU。运行：
```bash
php think migrate:run
php think seed:run
```

## 数据库表
本期建 4 张表：categories / brands / spus / skus（见 [../../../outputs/architecture/data-schema.md](../../outputs/architecture/data-schema.md) §二）
