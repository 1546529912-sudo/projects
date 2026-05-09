# 开发分片 1 实施计划
## Slice 1 — 工程脚手架 + 登录权限

> 产出日期：2026-05-05
> 阶段：开发 Agent 实施前计划（待用户确认）
> 范围：模块一 P0 中"用户登录 / 登出" + "基础权限"两项基础能力，以及全项目工程骨架
> 后续：分片 2/3/4 在分片 1 通过后，按架构 spec 顺次进入

---

## 一、本片目标

1. 把整个 CRM 工程骨架搭好，分片 2/3/4 不再处理基础设施
2. 实现登录、登出、当前用户信息接口与登录页面
3. 后端权限基础设施就位（角色枚举、Guard、CustomerScopeService 占位、统一响应/异常）
4. 数据库 migration 落地架构 spec 中所有核心表，分片 2/3/4 不再加表
5. 前端整体壳层就位（侧边栏、顶栏、Linear Pro 视觉变量、路由保护）

不做：

- 客户/线索/联系人业务接口与页面（属于分片 2）
- 查重、状态流转、线索转化（属于分片 3）
- 客户详情完整 Tab 区（属于分片 4）
- 测试 Agent 验收（在 MODULE_COMPLETE 之后单独走）

---

## 二、关联 progress.md 进度项

本片完成后，建议勾选"开发完成"的功能项：

- 用户登录 / 登出（账号密码登录、会话管理、安全登出）
- 基础权限（销售员 / 主管 / 管理员三角色数据范围与操作权限，P0 硬编码；RBAC 配置后台见模块五）

不勾选：模块一 P0 其他 15 项功能，因为它们的页面或接口尚未实现。

---

## 三、工程结构（pnpm monorepo）

```txt
CRM/
├─ package.json                  # 根 workspace
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ .editorconfig
├─ .nvmrc                        # node 20
├─ .env.example                  # 共享环境变量样例
├─ .gitignore
├─ docker-compose.yml            # 本地 PostgreSQL + Redis
├─ apps/
│  ├─ api/                       # NestJS 后端
│  └─ web/                       # React + Vite 前端
└─ packages/
   └─ shared/                    # 跨端共享类型与 Zod schema
```

### 3.1 apps/api 目录

```txt
apps/api/
├─ package.json
├─ tsconfig.json
├─ nest-cli.json
├─ prisma/
│  ├─ schema.prisma              # 含架构 spec 中全部核心表
│  ├─ migrations/                # 由 prisma migrate 生成
│  └─ seed.ts                    # 部门/三角色用户种子
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ config/
│  │  ├─ app.config.ts
│  │  ├─ database.config.ts
│  │  └─ jwt.config.ts
│  ├─ common/
│  │  ├─ decorators/
│  │  │  ├─ current-user.decorator.ts
│  │  │  ├─ roles.decorator.ts
│  │  │  └─ public.decorator.ts
│  │  ├─ filters/
│  │  │  └─ all-exceptions.filter.ts
│  │  ├─ guards/
│  │  │  ├─ jwt-auth.guard.ts
│  │  │  └─ roles.guard.ts
│  │  ├─ interceptors/
│  │  │  └─ response.interceptor.ts
│  │  ├─ pipes/
│  │  │  └─ zod-validation.pipe.ts
│  │  └─ types/
│  │     ├─ api-response.ts
│  │     └─ error-codes.ts
│  ├─ modules/
│  │  ├─ auth/
│  │  │  ├─ auth.module.ts
│  │  │  ├─ auth.controller.ts
│  │  │  ├─ auth.service.ts
│  │  │  ├─ jwt.strategy.ts
│  │  │  ├─ token-blacklist.service.ts
│  │  │  └─ dto/
│  │  │     ├─ login.dto.ts
│  │  │     └─ login.response.ts
│  │  ├─ users/
│  │  │  ├─ users.module.ts
│  │  │  ├─ users.service.ts
│  │  │  └─ users.repository.ts
│  │  └─ permissions/
│  │     ├─ permissions.module.ts
│  │     └─ customer-scope.service.ts
│  ├─ infra/
│  │  ├─ prisma/
│  │  │  ├─ prisma.module.ts
│  │  │  └─ prisma.service.ts
│  │  └─ redis/
│  │     ├─ redis.module.ts
│  │     └─ redis.service.ts
│  └─ health/
│     └─ health.controller.ts
└─ test/                         # 仅占位，不写测试，留给测试 Agent
```

### 3.2 apps/web 目录

```txt
apps/web/
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ tailwind.config.ts
├─ postcss.config.cjs
├─ index.html
├─ src/
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ router.tsx
│  │  └─ providers.tsx           # QueryClient、Toast、AuthProvider
│  ├─ shared/
│  │  ├─ api/
│  │  │  ├─ http.ts              # axios + 拦截器 + 401 处理
│  │  │  └─ types.ts             # ApiResponse / Pagination
│  │  ├─ components/
│  │  │  ├─ layout/
│  │  │  │  ├─ AppLayout.tsx
│  │  │  │  ├─ Sidebar.tsx
│  │  │  │  └─ TopBar.tsx
│  │  │  ├─ ui/                  # shadcn 组件（button/input/dialog/...）
│  │  │  └─ feedback/
│  │  │     ├─ EmptyState.tsx
│  │  │     └─ Loading.tsx
│  │  ├─ hooks/
│  │  │  └─ useAuth.ts
│  │  ├─ lib/
│  │  │  ├─ cn.ts                # className 合并
│  │  │  └─ guards.tsx           # ProtectedRoute / RoleRoute
│  │  └─ styles/
│  │     ├─ tokens.css           # Linear Pro CSS 变量（来自 design spec）
│  │     └─ globals.css
│  ├─ features/
│  │  └─ auth/
│  │     ├─ pages/LoginPage.tsx
│  │     ├─ api/auth.api.ts
│  │     ├─ schemas/login.schema.ts
│  │     └─ store/auth.store.ts
│  └─ pages/
│     └─ HomePage.tsx            # 登录后默认页占位（"欢迎"，分片 2 替换）
└─ public/
   └─ favicon.svg
```

### 3.3 packages/shared

```txt
packages/shared/
├─ package.json
├─ tsconfig.json
└─ src/
   ├─ index.ts
   ├─ enums.ts                   # UserRole, CustomerStatus, LeadStatus 等
   ├─ api-response.ts            # ApiResponse / Pagination 类型
   ├─ error-codes.ts             # 与后端 common/types/error-codes 对应
   └─ schemas/
      └─ login.schema.ts         # Zod schema, 前后端共用
```

---

## 四、关键依赖

### 后端（apps/api）

- `@nestjs/core`、`@nestjs/common`、`@nestjs/platform-express`
- `@nestjs/config`、`@nestjs/jwt`、`@nestjs/passport`、`passport-jwt`
- `@prisma/client`、`prisma`
- `class-validator`、`class-transformer`（保留）+ `zod`、`nestjs-zod`
- `bcryptjs`、`ioredis`、`bullmq`（先装好，分片 2/3 用）
- `helmet`、`cookie-parser`、`compression`、`pino`、`nestjs-pino`

### 前端（apps/web）

- `react`、`react-dom`、`react-router-dom`
- `@tanstack/react-query`、`@tanstack/react-table`
- `zustand`
- `react-hook-form`、`zod`、`@hookform/resolvers`
- `axios`
- `tailwindcss`、`@tailwindcss/forms`、`tailwindcss-animate`、`clsx`、`tailwind-merge`、`lucide-react`
- `class-variance-authority`、`@radix-ui/react-*`（shadcn 依赖）
- `recharts`（先装好，分片 2 起用）

### 共享

- `typescript`、`tsup` 或 `tsc -b`
- `eslint`、`prettier`、`@typescript-eslint/*`、`eslint-plugin-react`、`eslint-plugin-import`

---

## 五、环境变量（`.env.example`）

```env
# 后端
NODE_ENV=development
API_PORT=3001
DATABASE_URL=postgresql://crm:crm@localhost:5432/crm
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me
JWT_EXPIRES_IN=8h
PASSWORD_SALT_ROUNDS=10
LOGIN_MAX_FAILED=5

# 前端
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

---

## 六、登录与权限实现要点

### 6.1 登录流程

1. 入参 `account`（手机号或邮箱）+ `password`
2. 后端按 `phone` 或 `email` 查找用户
3. 命中后 `bcrypt.compare` 校验
4. 失败：`failed_login_count + 1`；累计 ≥ 5 时 `status = locked` + `locked_at = now()`
5. 锁定状态登录直接返回 `code = 10003`
6. 成功：清零 `failed_login_count`，更新 `last_login_at`，签发 JWT（payload: `{ sub, role, departmentId }`）
7. 统一错误提示：`账号或密码不正确`，不暴露具体字段错误

### 6.2 登出流程

- `POST /api/v1/auth/logout`
- 后端将当前 token 加入 Redis 黑名单（key 含 jti，TTL 与 token 剩余有效期一致）
- 前端清空本地 `auth.store` 与 axios header

### 6.3 鉴权 Guard 行为

- `JwtAuthGuard` 全局启用，`@Public()` 装饰器跳过
- 校验顺序：JWT 有效 → 不在黑名单 → 用户未禁用 → 注入 `req.user`
- `RolesGuard` 配合 `@Roles('admin' | 'manager' | 'sales')` 控制功能权限
- 数据范围：`CustomerScopeService.buildWhere(currentUser)` 占位实现，分片 2 起接入业务

### 6.4 响应与错误码

- 全局 `ResponseInterceptor` 包装为 `{ code: 0, message: 'success', data }`
- 全局 `AllExceptionsFilter` 把业务异常和未知异常映射为 spec 中的 code
- 错误码常量集中放 `common/types/error-codes.ts` 与 `packages/shared/error-codes.ts`

### 6.5 前端登录页

- 路径：`/login`
- 风格：Linear Pro，使用 `tokens.css` 中的 CSS 变量，禁止写死颜色
- 字段：账号、密码、登录按钮（深黑主动作色 `--action-primary`）
- 错误：toast 显示后端 `message`
- 锁定：弹出 Dialog，提示"账号已锁定，请联系管理员"
- 登录成功：写入 `auth.store`，跳转 `/`

### 6.6 路由保护

- `ProtectedRoute`：未登录跳 `/login`
- `RoleRoute`：基于角色控制页面访问，本片仅占位
- 默认 `/` 渲染 `HomePage`，显示当前用户信息和角色，分片 2 替换为客户列表

---

## 七、Prisma schema 落地策略

- 本片直接落 spec 第四章全部表，包含 `opportunities` / `orders` / `follow_up_records` 占位
- 索引和 CHECK 约束按 spec 写入
- `pg_trgm` 扩展通过 `CREATE EXTENSION IF NOT EXISTS pg_trgm` 在初始 migration 中开启
- 不在本片插入业务数据，仅 seed：
  - 1 个部门
  - 3 个用户（管理员 / 主管 / 销售员），密码统一 `Crm@2026`

---

## 八、本片不实现的清单

- 客户、联系人、线索、商机、订单的业务接口
- 查重、状态流转、线索转化逻辑
- 业务事件 / 审计日志的真实写入（仅留接口）
- 任何客户管理相关页面与组件
- AI 链路、第三方集成、通知发送
- CI / 镜像 / K8s 部署脚本（首版用 docker-compose 起本地依赖即可）

---

## 九、验收点（开发自检清单）

- 启动 `pnpm docker:up` + `pnpm dev` 后：
  - 后端 `http://localhost:3001/api/v1/health` 返回 `{ code: 0 }`
  - 前端 `http://localhost:5173/login` 渲染登录页
- 登录成功 → 跳到 `/` → 显示当前用户名与角色
- 错误密码连续 5 次 → 第 6 次返回 `code = 10003`
- 登出后再请求 `/auth/me` → 401 + `code = 10001`
- 三种角色用户均能登录，但 `/` 上仅显示自身信息
- 前端无写死色值，全部走 `tokens.css`

---

## 十、风险与待确认

1. 是否允许使用 pnpm（团队若用 npm/yarn 需调整脚手架）
2. 是否同意密码默认 `Crm@2026`（生产环境必须强制修改）
3. 是否同意首版仅手机号或邮箱二选一登录，验证码、SSO、找回密码均推后
4. 是否同意所有核心表本片一次性落 migration（避免后续频繁 alter table）

---

## 完成信号

实施完成后输出：

```
MODULE_COMPLETE: slice-1-scaffold-and-auth
关联进度项：
  - 用户登录 / 登出
  - 基础权限
建议勾选：开发完成
对应实现证据：
  - apps/api 启动日志、prisma migrate 输出
  - apps/web 登录页截图与控制台日志
  - .env.example 与 docker-compose 启动结果
未完成或需确认的功能项：模块一 P0 其余 15 项（属于分片 2/3/4）
```

本计划等待用户确认后开始落地。
