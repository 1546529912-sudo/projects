# apps · 工程骨架

电商商城 v1 的 7 个工程入口。

## 工程清单

| 工程 | 端口 | 入口 | 用途 |
|---|---|---|---|
| [shop-backend](shop-backend/) | 8001 | http://localhost:8001/health | 商城后端（BFF）|
| [pim-backend](pim-backend/) | 8002 | http://localhost:8002/health | PIM 商品中心 |
| [oms-backend](oms-backend/) | 8003 | http://localhost:8003/health | OMS 订单中心 |
| [wms-backend](wms-backend/) | 8004 | http://localhost:8004/health | WMS 仓储中心 |
| [shop-miniprogram](shop-miniprogram/) | — | 微信开发者工具加载 | C 端小程序 |
| [shop-admin](shop-admin/) | 5173 | http://localhost:5173 | 商家后台（Vue 3）|

## 快速启动

### 1. 启基础设施 + 4 个 PHP 后端
```bash
cd apps/
cp .env.example .env
docker-compose up -d --build
```

### 2. 安装 PHP 依赖 + 跑 migration（4 个后端各一次）
```bash
docker-compose exec shop-backend composer install
docker-compose exec shop-backend php think service:discover
docker-compose exec shop-backend php think migrate:run    # iteration-2 users + iteration-4 cart/sms_log
docker-compose exec shop-backend php think seed:run

docker-compose exec pim-backend composer install
docker-compose exec pim-backend php think service:discover
docker-compose exec pim-backend php think migrate:run
docker-compose exec pim-backend php think seed:run

docker-compose exec oms-backend composer install
docker-compose exec oms-backend php think service:discover
docker-compose exec oms-backend php think migrate:run     # iteration-2 orders + iteration-4 order_items/order_status_log/inventory_status/inventory_log/picking_orders
docker-compose exec oms-backend php think seed:run --seeder=SeedInventory

docker-compose exec wms-backend composer install
docker-compose exec wms-backend php think service:discover
docker-compose exec wms-backend php think migrate:run
```

### 2.5 iteration-4 新增接口生效（如果是从 iteration-3 升级）
```bash
# 路由 + Controller 变更后需重启 PHP 容器
docker-compose restart shop-backend pim-backend oms-backend
```

### 3. 验证 /health（4 个端点都应返回 200）
```bash
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
```

### 4. 验证端到端联通链路（Phase 1）
```bash
curl http://localhost:8001/api/v1/product/list
# 期望：shop-backend 转发到 pim-backend，返回 seed 数据中的 SPU 列表
```

### 4.5 验证 Phase 2 购买闭环（iteration-4）
```bash
# 1. 短信（dev 模式返回明文）
curl -X POST http://localhost:8001/api/v1/sms/code \
  -H 'Content-Type: application/json' -d '{"phone":"13800138000"}'

# 2. 登录得 token
TOKEN=$(curl -s -X POST http://localhost:8001/api/v1/user/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"13800138000","code":"123456"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['token'])")
echo $TOKEN

# 3. 加购
curl -X POST http://localhost:8001/api/v1/cart/add \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"sku_code":"SPU001-001","qty":1}'

# 4. 看购物车
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/cart/list

# 5. 下单
ORDER=$(curl -s -X POST http://localhost:8001/api/v1/order/submit \
  -H "Authorization: Bearer $TOKEN" -H 'Idempotency-Key: o-test-1' \
  -H 'Content-Type: application/json' -d '{}' | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['order']['order_no'])")
echo $ORDER

# 6. 模拟支付
curl -X POST http://localhost:8001/api/v1/payment/callback/mock \
  -H 'Content-Type: application/json' -d "{\"order_no\":\"$ORDER\"}"

# 7. 查订单（期望 status=paid，locked +1）
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/v1/order/$ORDER
curl http://localhost:8003/api/v1/inventory/SPU001-001
```

### 5. 启 Vue 后台
```bash
cd shop-admin/
npm install
npm run dev
# 访问 http://localhost:5173
# 登录页 → 商品列表（调通 pim-backend /health 即骨架就绪）
```

### 6. 启小程序
- 用微信开发者工具打开 `apps/shop-miniprogram/`
- AppID 填占位（`wx_PLACEHOLDER_APPID`），勾选"不校验合法域名"
- 首页应展示来自 `shop-backend → pim-backend` 的商品列表

## 停止
```bash
cd apps/
docker-compose down              # 停服务，保留数据
docker-compose down -v           # 停服务 + 删数据卷
```

## 跑测试
```bash
docker-compose exec shop-backend ./vendor/bin/phpunit
docker-compose exec pim-backend ./vendor/bin/phpunit
# 同 oms / wms
```

## 端到端联通链路（架构图）
```
小程序首页 (apps/shop-miniprogram/pages/home)
  │ wx.request GET http://localhost:8001/api/v1/product/list
  ▼
shop-backend (apps/shop-backend/app/controller/Product.php)
  │ HTTP GET http://pim-backend/api/v1/product/list
  ▼
pim-backend (apps/pim-backend/app/controller/Product.php)
  │ SELECT * FROM spus WHERE status='published'
  ▼
MySQL pim_db.spus (seed 数据中至少 3 条)
  │
  ▼ 沿原路径返回
小程序展示商品卡片
```

## 常见问题

**Q：composer install 慢**
A：本地配置中国镜像 `docker-compose exec shop-backend composer config -g repo.packagist composer https://mirrors.aliyun.com/composer/`

**Q：MySQL 容器起不来**
A：可能端口 3306 已被占用，修改 `.env` 中 `MYSQL_PORT_HOST`

**Q：小程序提示"不在合法域名内"**
A：开发模式勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"
