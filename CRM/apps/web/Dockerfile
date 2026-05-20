# CRM Web 多阶段 Dockerfile
# 构建上下文：项目根目录（不是 apps/web）

# ==== Stage 1: 构建 ====
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Vite 是静态打包，API 基址必须在 build 时确定
# 默认 /api/v1 走同源 nginx 反向代理，最适合生产
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm --filter @crm/web build


# ==== Stage 2: Nginx 静态服务 ====
FROM nginx:alpine

# 自定义 nginx 配置：SPA 路由 + API 反向代理
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# 静态资源
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html

EXPOSE 80

# 用 nginx 默认 CMD（前台运行）
