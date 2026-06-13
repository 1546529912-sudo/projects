# oms-backend

订单管理（OMS）。订单四态库存的"主"数据源，订单状态机的"大脑"。

## 端口
宿主机映射 8003

## 关键接口
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /health | 健康检查 |
| (Phase 2+) | /api/v1/order/* | 订单 CRUD |
| (Phase 2+) | /api/v1/inventory/* | 库存四态 |

完整 API 见 [../../../outputs/architecture/api-list.md](../../outputs/architecture/api-list.md) §三。

## MVP 阶段
本期仅交付骨架 + /health + orders 表 migration。其余在 Phase 2+ 实现。
