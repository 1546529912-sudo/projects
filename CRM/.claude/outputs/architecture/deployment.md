# CRM 部署架构（Docker Compose 方案）

> **本文档定位：** 给架构师和未来维护者看的部署架构产物。
> 给运维同事看的部署手册见项目根目录 `DEPLOY.md`。

**版本：** v1.0  
**日期：** 2026-05-20  
**状态：** 本地验证通过（4 容器全部 running，登录/接口实测正常）

---

## 1. 部署目标与边界

| 维度 | 说明 |
|---|---|
| 部署类型 | **演示部署**（含 DEMO 数据，目的是给客户/同事展示系统功能）|
| 部署对象 | 单服务器（不做集群、不做多区可用） |
| 用户规模 | < 50 并发，无 SLA 要求 |
| 数据敏感度 | 演示数据，可随时重置 |
| 运维能力假设 | 运维同事只熟 PHP / 宝塔，**不懂 Node/PostgreSQL/Nginx 内部** |

---

## 2. 为什么选 Docker Compose（决策记录）

### 候选方案对比

| 方案 | 优点 | 否决原因 |
|---|---|---|
| **A. 改 MySQL + 宝塔原生部署** | 运维熟 MySQL | 项目已有 29 个 PG migration + Timestamptz / Json 类型，迁移成本 2-4h 且需要全量回归测试 |
| **B. 保持 PG + 宝塔命令行部署** | 不动代码 | 运维不会用 psql，长期维护成本高 |
| **✅ C. Docker Compose 部署** | 不动代码 + 环境一致性 + 运维门槛低 | 选定方案 |

### 选 C 的关键理由
1. 项目根目录**已有 `docker-compose.yml`** 跑 PG/Redis，Docker 路线走了一半
2. 运维只需学 3 个命令（up / down / logs），不需要理解 Node 生态
3. 同一份配置在开发机、测试服、生产服都能跑（消除"在我机器上是好的"）
4. 演示场景下容器化的最大价值：**一键重置回干净的演示状态**

---

## 3. 容器拓扑

```
                              ┌────────────────────────┐
                              │     用户浏览器          │
                              └───────────┬────────────┘
                                          │ HTTP/HTTPS
                                          │ 端口 80/443
                                          ▼
                              ┌────────────────────────┐
                              │   宝塔自带 Nginx       │
                              │   (反向代理 → 8080)    │
                              └───────────┬────────────┘
                                          │
                                          │ HTTP 8080
                                          ▼
   ╔══════════════════════════════════════════════════════════════════╗
   ║                       Docker Network (crm_default)               ║
   ║                                                                  ║
   ║   ┌──────────────────┐                                           ║
   ║   │  crm-web         │       /api/v1/* → http://api:3001        ║
   ║   │  (nginx:alpine)  │ ─────────────────────────────────┐       ║
   ║   │  对外: 8080      │       /* → 静态文件              │       ║
   ║   │  端口映射         │                                 │       ║
   ║   └──────────────────┘                                 │       ║
   ║                                                         ▼       ║
   ║                                              ┌──────────────────┐║
   ║                                              │  crm-api         │║
   ║                                              │  (Node 20 +      │║
   ║                                              │   NestJS + Prisma)│║
   ║                                              │  内部端口: 3001   │║
   ║                                              └────┬─────────┬───┘║
   ║                                                   │         │   ║
   ║                                            DATABASE_URL   REDIS_URL
   ║                                                   │         │   ║
   ║                                      ┌────────────▼─┐  ┌────▼────────┐
   ║                                      │ crm-postgres │  │ crm-redis   │
   ║                                      │ (15-alpine)  │  │ (7-alpine)  │
   ║                                      │ 仅容器内访问  │  │ 仅容器内访问 │
   ║                                      └──────────────┘  └─────────────┘
   ║                                                                  ║
   ╚══════════════════════════════════════════════════════════════════╝

   Volumes（数据持久化）:
   ┌─────────────────────────┬──────────────────────────────────────┐
   │ crm-postgres-data       │ PostgreSQL 全部数据                   │
   │ crm-redis-data          │ Redis AOF 持久化                      │
   │ crm-api-uploads         │ 用户上传的合同、附件                  │
   └─────────────────────────┴──────────────────────────────────────┘
```

---

## 4. 关键设计决策

### 4.1 为什么 Web 容器内置 Nginx 而不是单独起 Nginx 容器

**决策：** 把 nginx 配置放进 `apps/web/Dockerfile`，构建出来的镜像直接包含静态文件 + nginx 配置 + API 反向代理规则。

**理由：**
- 一个容器一个职责 = 简单
- 镜像本身就是部署单位，包含完整的"前端响应能力"
- 修改前端代码 / nginx 配置 → 重新 build → 重启 web 容器，互不影响 api

### 4.2 为什么对外端口选 8080 而不是 80

**理由：** 服务器通常装了宝塔，宝塔自带 nginx 占用 80。Docker 容器不应该和宝塔的 nginx 抢端口。让宝塔 nginx 反向代理到容器的 8080，运维可以在宝塔图形界面里：
- 配置域名
- 申请 HTTPS（一键 Let's Encrypt）
- 管理多个站点
- 看访问日志

### 4.3 为什么 API 不暴露端口到宿主机

**理由：** 攻击面最小化。外网无法直接访问 API，必须经过 web 容器的 nginx，可以在 nginx 层加 WAF / 限流 / IP 白名单。

### 4.4 为什么 PostgreSQL `POSTGRES_PASSWORD` 不能后期改

**坑位说明（已踩，记录避免再踩）：**

PostgreSQL Docker 镜像的 `POSTGRES_PASSWORD` 环境变量**只在首次创建数据目录时生效**。一旦 volume 存在，再改 env 也不会修改实际密码。

**部署流程必须保证：**
1. 先填好 `.env.production`（含强密码）
2. 再 `up -d`（首次启动时 volume 还不存在，会用 env 的密码初始化）

如果顺序反了，需要 `down -v` 销毁 volume 再来一遍。

**DEPLOY.md 已专门用整章篇幅强调这一点。**

### 4.5 为什么用 `${VAR:?msg}` 强制校验

`docker-compose.prod.yml` 里：
```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD 必须在 .env.production 中设置}
JWT_SECRET: ${JWT_SECRET:?JWT_SECRET 必须在 .env.production 中设置，至少 32 位随机字符串}
```

**优点：** 没设强制变量，启动直接拒绝，比"启动了但用空密码"更安全。

**代价：** 每个 docker compose 命令都必须带 `--env-file`，否则插值失败。已通过 `pnpm prod:*` scripts 包装解决。

### 4.6 为什么 seed 不集成进容器启动命令

API 容器的 `CMD` 是：
```
npx prisma migrate deploy && node dist/main.js
```

**只跑 migrate（建表），不跑 seed（插数据）。** 理由：
- migrate 是幂等的，多次运行无副作用
- seed 含 DEMO 数据，**每次跑会重置演示数据**（wipeDemoDataset 会清旧的）
- 自动跑 seed 会在每次重启时清掉用户对 DEMO 数据的修改，反而干扰演示

**正确流程：** 部署后手动跑一次 `pnpm prod:seed`，之后只在"演示数据被改乱想恢复初始状态"时再跑。

### 4.7 镜像体积 vs 构建复杂度的取舍

**当前方案：** API 运行时镜像直接 `COPY --from=builder /repo /repo`，体积约 600-800 MB（含 dev 依赖）。

**没用 `pnpm prune --prod` 或 `pnpm deploy` 精简的原因：**
- pnpm workspace 的 symlink 结构在跨阶段 COPY 时容易破坏
- 演示部署对镜像体积不敏感
- 优先保证启动稳定 > 镜像大小

如果未来要做真正的生产部署、需要 CI/CD 高频构建，可以重构为：
```
Stage 1: builder（装全依赖 + 构建）
Stage 2: deployer（pnpm --filter @crm/api deploy --prod /deploy）
Stage 3: runner（只 COPY /deploy 和 dist + prisma）
```

---

## 5. 文件清单（本次新增/修改）

| 文件 | 用途 | 类型 |
|---|---|---|
| `apps/api/Dockerfile` | API 镜像构建定义 | 新增 |
| `apps/web/Dockerfile` | Web 镜像构建定义 | 新增 |
| `apps/web/nginx.conf` | Web 容器内 nginx 配置 | 新增 |
| `.dockerignore` | 排除非必要文件加速构建 | 新增 |
| `docker-compose.prod.yml` | 生产编排（4 服务 + 3 volume）| 新增 |
| `.env.production.example` | 生产环境变量模板 | 新增 |
| `.gitignore` | 加白名单 `!.env.production.example` | 修改 |
| `package.json` | 加 7 个 `prod:*` scripts | 修改 |
| `DEPLOY.md` | 运维部署手册 | 新增 |
| `docker-compose.yml` | 开发环境（PG+Redis）| **未动**，保持原样 |

---

## 6. 安全考虑

| 项 | 当前状态 | 备注 |
|---|---|---|
| 数据库不暴露端口 | ✅ | 仅容器内访问 |
| Redis 不暴露端口 | ✅ | 仅容器内访问 |
| API 不直接暴露 | ✅ | 经 nginx 转发 |
| 默认密码强制更换 | ⚠️ | `.env.production.example` 提示了但未强制 |
| JWT_SECRET 32 位以上 | ✅ | `${VAR:?}` 校验 + 模板示例用 `openssl rand -hex 32` |
| 演示账号密码可重置 | ⚠️ | 默认密码 `Crm@2026` 写在代码里，演示完应改 |
| HTTPS | 由宝塔 Let's Encrypt 提供 | 见 DEPLOY.md §9 |
| 容器 root 用户运行 | ⚠️ | 当前以 root 跑，生产可优化为非 root |

**演示场景下风险可接受。** 如未来转为真正生产，需补：
- 容器以非 root 用户运行
- 数据库密码、JWT secret 用 secret manager 而非 .env
- 镜像扫描（trivy / snyk）

---

## 7. 验证结果（本地）

| 验证项 | 命令 | 结果 |
|---|---|---|
| 镜像构建 | `pnpm prod:up` | ✅ 93 秒构建成功 |
| 4 容器启动 | `docker ps` | ✅ 全部 running，0 restart |
| PostgreSQL healthy | `docker ps` | ✅ healthy |
| Redis healthy | `docker ps` | ✅ healthy |
| 29 个 migration 应用 | `docker logs crm-api` | ✅ `Nest application successfully started` |
| 前端可访问 | `curl http://localhost:8080/` | ✅ HTTP 200, 3ms |
| API 健康检查 | `curl /api/v1/health` | ✅ `{"code":0,"data":{"status":"ok"}}` |
| 参数校验生效 | `curl POST /auth/login {}` | ✅ HTTP 400, 中文错误响应 |
| Seed 用户创建 | `npx prisma db seed` | ✅ 3 个账号 + DEMO 数据成功 |
| 登录接口实测 | `curl POST /auth/login` | ✅ 返回 accessToken |

---

## 8. 已知问题 / 待改进

| # | 问题 | 严重度 | 备注 |
|---|---|---|---|
| 1 | `docker compose` 命令必须带 `--env-file` | 低 | 已通过 `pnpm prod:*` 包装解决 |
| 2 | API 容器以 root 用户运行 | 中 | 演示可接受；生产应改 non-root |
| 3 | 默认演示账号密码硬编码 | 中 | 演示完应在系统设置里改 |
| 4 | 没有容器健康检查 endpoint 配置在 compose | 低 | api/web 没有 healthcheck 字段，未来可加 |
| 5 | Prisma 6.19 提示 7.x 升级 | 低 | 不影响功能，独立任务跟进 |
| 6 | 镜像未做精简（含 dev 依赖）| 低 | 演示场景体积不敏感 |

---

## 9. 给 progress.md 的回写建议

```
- [x] 部署架构设计 — Docker Compose 方案，本地验证通过
      产物：
        - apps/api/Dockerfile
        - apps/web/Dockerfile
        - apps/web/nginx.conf
        - docker-compose.prod.yml
        - .env.production.example
        - DEPLOY.md
        - .claude/outputs/architecture/deployment.md
      验证证据：本地 4 容器全部 running，登录/API 实测通过
```
