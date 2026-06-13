# shop-backend

商城前端 BFF（Backend for Frontend）。聚合 PIM / OMS 数据给小程序与 H5。

## 端口
- 容器内 80
- 宿主机映射 8001

## 关键接口
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /health | 健康检查 |
| GET | /api/v1/product/list | 商品列表（代理到 pim-backend）|

详细 API 见 [../../../outputs/architecture/api-list.md](../../outputs/architecture/api-list.md) §一。

## 本地开发
进入容器后：
```bash
composer install
php think migrate:run
./vendor/bin/phpunit
```

## 目录
```
app/
├── controller/  ← HTTP 入口
├── middleware/  ← 通用中间件（TraceId 等）
├── model/       ← ORM 模型（Phase 2+ 补全）
├── service/     ← 业务逻辑层（Phase 2+ 补全）
└── facade/      ← 调下游服务（PimClient/OmsClient，Phase 2+）
config/        ← 配置
route/         ← 路由声明
database/      ← migration + seed
public/        ← Web 入口（index.php）
tests/         ← PHPUnit
```
