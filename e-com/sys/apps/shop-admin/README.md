# shop-admin

商家后台。Vue 3 + Vite + Element Plus 单页应用。

## 端口
本地开发 5173

## 启动
```bash
cd apps/shop-admin
npm install
npm run dev
# 访问 http://localhost:5173
```

## 端到端联通验证
1. 确保 `pim-backend` 已通过 docker-compose 起来（http://localhost:8002）
2. `npm run dev` 启动后访问 http://localhost:5173
3. Vite 已配置代理：`/api/v1/*` 和 `/health` → pim-backend:8002
4. 登录页用 `admin / admin123`（MVP 固定，无后端校验）
5. 登录后进入"商品管理"页：
   - 顶栏 tag 显示 pim-backend 健康状态
   - 表格列出 spus 表 seed 数据中的 3 个 SPU

## 主题
Element Plus 主色已覆盖为 `#FF385C`（与小程序、design-system 一致）。

## 目录
```
src/
├── main.ts                  ← 入口
├── App.vue                  ← 根（仅 router-view）
├── router/index.ts          ← 路由（login / products）
├── apis/index.ts            ← Axios 封装
├── styles/element.scss      ← Element Plus 主题覆盖
└── pages/
    ├── Login.vue
    └── products/Index.vue
```

## MVP 阶段
- 登录走前端固定账密，**没有后端登录接口**（Phase 2+ 实现）
- 商品列表仅查 pim-backend，不支持 CRUD（Phase 2+ 实现）
