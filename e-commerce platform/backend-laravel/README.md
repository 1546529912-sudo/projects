# Backend · Laravel 11

## 启动

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve  # http://127.0.0.1:8000
```

## 健康检查

```bash
curl http://127.0.0.1:8000/api/v1/health
```

## 测试

```bash
php artisan test
```

## 目录

- `app/Http/Controllers/Api/` — RESTful 接口
- `app/Models/` — Eloquent Model
- `app/Services/` — 业务服务
- `app/Modules/` — 业务模块（按 [module-deps.md](../outputs/architecture/module-deps.md) 划分，第一期暂用 Service）
- `routes/api.php` — 路由
- `database/migrations/` — 数据库 migration
- `tests/Feature/` — Feature 测试
- `tests/Unit/` — 单元测试

## 当前已实现

- ✅ GET /api/v1/health（健康检查）
- ✅ POST /api/v1/auth/sms/send（发送验证码）
- ✅ POST /api/v1/auth/register（手机号注册）
- ✅ POST /api/v1/auth/login（登录）
- ✅ POST /api/v1/auth/logout（登出）
- ✅ GET /api/v1/users/me（当前用户）
- ✅ Migration: users / categories / products

## 当前未实现（按 task-spec.md 后续迭代）

- 商品 / 购物车 / 订单 / 支付 / AI 等所有业务模块
- 详见 [outputs/product/task-spec.md](../outputs/product/task-spec.md)
