# wms-backend

仓储管理（WMS）。仓内单据 + 实物库存 的"主"数据源。

## 端口
宿主机映射 8004

## 关键接口
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /health | 健康检查 |
| (Phase 2+) | /api/v1/picking-order | 接 OMS 拣货单 |
| (Phase 2+) | /api/v1/outbound/* | 出库 |
| (Phase 2+) | /api/v1/inventory | 实物库存 |

完整 API 见 [../../../outputs/architecture/api-list.md](../../outputs/architecture/api-list.md) §四。

## MVP 阶段
本期仅交付骨架 + /health + products 表 migration。其余在 Phase 2+ 实现。
