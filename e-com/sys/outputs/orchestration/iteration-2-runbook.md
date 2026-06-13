# iteration-2-runbook.md · Phase 1 调度记录

## 【当前焦点】
Phase 0 用户确认通过（2026-05-24）。本轮目标：生成完整工程骨架。

## 本轮交付范围（按 v2 prompt §6.2-6.4）

### 工程目录
```
apps/
├── shop-backend/        ThinkPHP 8 + /health + Product 代理
├── pim-backend/         ThinkPHP 8 + /health + Product list (DB) + 1 seed
├── oms-backend/         ThinkPHP 8 + /health
├── wms-backend/         ThinkPHP 8 + /health
├── shop-miniprogram/    原生小程序：首页 + 商品列表
├── shop-admin/          Vue 3 + Element Plus：登录页 + 商品列表
├── docker-compose.yml   MySQL + Redis + 4 PHP
├── Dockerfile.php       4 PHP 工程共享
├── nginx.conf
├── php.ini
└── .env.example
```

### 端到端联通链路
```
小程序首页
  ↓ GET http://localhost:8001/api/v1/product/list
shop-backend
  ↓ GET http://pim-backend/api/v1/product/list (容器内 DNS)
pim-backend
  ↓ SELECT FROM pim_db.spus
MySQL (pim_db, seed 数据)
  → 返回 SPU 列表
shop-backend
  → 转发给小程序
小程序首页
  → 展示商品卡片
```

## 本轮参与角色
- ✅ 主控：调度 + 对账
- ✅ 开发 Agent：4 后端 + 2 前端骨架代码

## 本轮已扫 skill 清单
- `karpathy-guidelines`（编码规范）——骨架代码遵循"小步、可验证、不过度抽象"
- `prototype-html` / `animal-island-ui-style`——本轮不调起（小程序非 React）

## 本环境限制
1. 无法执行 `composer install` / `npm install` / `docker-compose up`
2. 无法验证微信开发者工具加载小程序
3. 无法验证浏览器加载 Vue 后台
4. **所有验证步骤交给用户手动执行**，主控对账只校验文件存在与代码语法

## 用户启动步骤（生成完成后）
按 [apps/README.md](../../apps/README.md) §快速启动 执行：
```bash
cd apps/
cp .env.example .env
docker-compose up -d              # 启 MySQL + Redis + 4 PHP
docker-compose exec shop-backend composer install   # 4 个后端各跑一次
docker-compose exec shop-backend php think migrate:run
# 重复对 pim/oms/wms-backend
curl http://localhost:8001/health  # 期望 200
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
curl http://localhost:8001/api/v1/product/list  # 应返回 pim 的 seed 数据
# 启 Vue 后台
cd shop-admin && npm install && npm run dev      # http://localhost:5173
# 启小程序
# 用微信开发者工具打开 apps/shop-miniprogram/
```

## 升级与阻塞
（本轮无）

## 对账触发
本 runbook 完成后立即生成 [reconcile-report-iteration-2.md](reconcile-report-iteration-2.md)。
