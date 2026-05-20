# CRM API 多阶段 Dockerfile
# 构建上下文：项目根目录（不是 apps/api）
# 用法（运维不需要手动跑，docker compose 会自动调用）：
#   docker build -f apps/api/Dockerfile -t crm-api .

# ==== Stage 1: 构建 ====
FROM node:20-alpine AS builder

# Prisma 在 alpine 上需要 openssl
RUN apk add --no-cache openssl

# 启用 pnpm（与 package.json 中 packageManager 字段一致）
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /repo

# 先复制 manifest，最大化利用 Docker 层缓存
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

# 复制源码
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# 生成 Prisma client，再 nest build 编译到 dist
RUN pnpm --filter @crm/api exec prisma generate
RUN pnpm --filter @crm/api build


# ==== Stage 2: 运行时 ====
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl tini

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /repo

ENV NODE_ENV=production \
    API_PORT=3001

# 从 builder 复制完整工程（含 node_modules、dist、prisma 等）
# 体积换稳定：pnpm workspace 的软链接结构原样保留，避免 prune 出错
COPY --from=builder /repo /repo

# 删除生产不需要的 web 应用源码以减小镜像
RUN rm -rf apps/web

# 上传目录（运行时会被 volume 挂载覆盖，首次启动需要存在）
RUN mkdir -p /repo/apps/api/uploads

WORKDIR /repo/apps/api

EXPOSE 3001

# tini 处理 PID 1 信号，docker stop 时优雅退出
ENTRYPOINT ["/sbin/tini", "--"]

# 启动前应用待执行的迁移到生产库，再启动 API
# 使用 migrate deploy（生产专用），不是 migrate dev
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
