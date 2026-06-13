# Frontend · Vue 3 + Vite

## 启动

```bash
npm install      # 或 pnpm install
npm run dev      # http://localhost:5173
```

## 端口约定

- Vite dev server: `5173`
- Laravel 后端: `8000`
- Vite 已配置 `/api` 代理到 `127.0.0.1:8000`

## 健康检查页

访问 `http://localhost:5173/health`，会请求 Laravel `/api/v1/health` 接口，检查 MySQL / Redis / FastAPI 联通性。

## 测试

```bash
npm run test     # Vitest 单测
```

## 目录

- `src/api/` — axios 封装与各模块接口（与 [api-list.md](../outputs/architecture/api-list.md) 对应）
- `src/views/` — 路由页
- `src/components/` — 通用组件
- `src/stores/` — Pinia
- `src/styles/tokens.css` — design-system.md token（CSS variables）

## 设计 Token

所有颜色 / 字体 / 间距 / 圆角必须用 `tokens.css` 中的 CSS variable，禁止 hard code。
对照 [outputs/design/design-system.md](../outputs/design/design-system.md)。
