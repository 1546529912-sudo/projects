本项目技术栈：后端 PHP 8 + ThinkPHP 8 + MySQL 8 + Redis 7；移动端原生微信小程序；商家后台 Vue 3 + Element Plus；容器 docker-compose。项目档位：中型集合。

# tech-stack.md · 技术栈选型与依据

## 【当前焦点】
本文件第一行已按 [项目初始化-prompt-v2.md](../../../项目初始化-prompt-v2.md) §2.4 模板固化。本文档进一步给出每个技术的选型理由、版本号、关键依赖、本地开发与生产差异。

## 本任务匹配到的 skill 清单
- 架构 Agent 当前无强匹配 skill；参考 `karpathy-guidelines` 通用编码规范

---

## 一、后端：PHP 8 + ThinkPHP 8

### 版本
- PHP **8.2**（生产环境推荐 LTS）
- ThinkPHP **8.0**（Topthink/think 8.x）
- Composer 2.x 包管理

### 选型理由
1. 用户已固化技术栈，不再讨论
2. ThinkPHP 8 提供：路由 / ORM / 中间件 / 队列 / 命令行 / 单元测试 一站式
3. 与团队既有 PHP 技能匹配
4. 4 个子系统独立工程，避免单体大泥球

### 关键 Composer 依赖（每个 PHP 工程通用）
| 包 | 版本 | 用途 |
|---|---|---|
| topthink/framework | ^8.0 | 核心框架 |
| topthink/think-orm | ^3.0 | 数据库 ORM |
| topthink/think-multi-app | ^1.0 | 多应用模式（按 module 拆分）|
| topthink/think-cache | ^1.0 | 缓存抽象 |
| topthink/think-queue | ^3.0 | 队列（Redis 后端）|
| firebase/php-jwt | ^6.0 | JWT 签发与解析 |
| ezyang/htmlpurifier | ^4.0 | 富文本 XSS 过滤（PIM 用）|
| topthink/think-trace | ^1.0 | 链路 trace（仅 dev）|
| phpunit/phpunit | ^10.0 | 单元测试（dev）|

### 项目档位说明
**中型集合**（已固化）：
- 4 个独立 ThinkPHP 工程，各自部署
- 工程之间通过 HTTP API + Redis Stream 通信
- 不引入服务网格 / 注册中心 / 配置中心
- 不引入微服务框架（Spring Cloud 类）

---

## 二、数据库：MySQL 8 + Redis 7

### MySQL 8
- **版本**：8.0.34+（charset utf8mb4）
- **部署**：单实例，4 个 database（shop_db / pim_db / oms_db / wms_db）
- **账号**：root/root（开发环境）
- **端口**：3306
- **本地通过 docker-compose 启动**
- 生产部署不在本期范围（推迟决策）

### Redis 7
- **版本**：7.2+
- **用途**：
  - 缓存（商品详情 / 库存 / 类目）
  - 队列（ThinkPHP queue 后端）
  - 分布式锁（库存锁定防超卖）
  - 验证码存储（TTL 5min）
  - 限流（手机号/IP 频率限制）
  - **跨系统事件总线**（Redis Stream，4 个系统订阅）
- **端口**：6379
- **本地通过 docker-compose 启动**

### Redis Stream 用法约定
- Stream key 格式：`{系统}.{实体}.{动作}` 如 `pim.product.changed`
- Consumer Group 格式：`{消费系统}-consumer` 如 `oms-consumer`
- 至少消费 3 次重试 + 失败入 `dead_letter` 表
- 事件 payload：JSON 含 `event_id` / `timestamp` / `traceId` / `data`

---

## 三、移动端：原生微信小程序

### 选型
- **原生 wxml / wxss / js**（不使用 uni-app / Taro / Mpx）
- 微信开发者工具最新稳定版
- 基础库目标 ≥ 2.30

### 关键能力
| 能力 | 实现 |
|---|---|
| 路由 | wx.navigateTo / switchTab |
| 网络 | wx.request 封装 `apis/index.js` 统一拦截 token |
| 存储 | wx.setStorageSync `token` / `user_info` / `cart_local` |
| 支付 | wx.requestPayment（MVP 占位 AppID + APP_DEBUG mock）|
| 上传 | wx.uploadFile（图片提交至 PIM 上传接口）|
| 性能 | 分包加载 + 图片懒加载 |

### 目录结构
```
shop-miniprogram/
├── app.js / app.json / app.wxss
├── pages/
│   ├── home/
│   ├── login/
│   ├── category/
│   ├── list/
│   ├── product/
│   ├── cart/
│   ├── checkout/
│   ├── pay/
│   ├── pay-result/
│   ├── order-list/
│   └── order-detail/
├── components/      ← 公共组件（商品卡片、空态、loading）
├── apis/            ← 后端接口封装
├── utils/           ← 工具函数
└── styles/          ← design-system 全局变量
```

---

## 四、商家后台：Vue 3 + Element Plus

### 版本
- Vue **3.4+**（Composition API + `<script setup>`）
- Element Plus **2.5+**
- Vite **5.x** 构建
- Pinia 状态管理
- Vue Router 4
- Axios 1.x

### 关键依赖
| 包 | 版本 | 用途 |
|---|---|---|
| vue | ^3.4 | 核心 |
| element-plus | ^2.5 | 组件库 |
| vue-router | ^4.2 | 路由 |
| pinia | ^2.1 | 状态管理 |
| axios | ^1.6 | HTTP |
| @vueuse/core | ^10 | 工具 hooks |
| unplugin-vue-components | ^0.26 | Element Plus 按需引入 |
| vitest | ^1.0 | 单元测试 |
| typescript | ^5.3 | 类型 |

### 主题定制
- 在 `src/styles/element/index.scss` 覆盖 Element Plus SASS 变量：
  ```scss
  $colors: (
    'primary': ('base': #FF385C)
  );
  ```
- 全局字体 / 字号按 [design-system.md](../design/design-system.md) 同步

### 目录结构
```
shop-admin/
├── src/
│   ├── App.vue / main.ts
│   ├── pages/
│   │   ├── Login.vue
│   │   └── products/Index.vue
│   ├── components/
│   ├── apis/
│   ├── stores/        ← Pinia
│   ├── router/
│   ├── styles/
│   └── utils/
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 五、容器化：docker-compose

### 文件结构
```
apps/
├── docker-compose.yml
├── shop-backend/...
├── pim-backend/...
├── oms-backend/...
└── wms-backend/...
```

### 服务清单
| 服务 | 镜像 | 端口映射 | depends_on |
|---|---|---|---|
| mysql | mysql:8.0 | 3306:3306 | - |
| redis | redis:7-alpine | 6379:6379 | - |
| shop-backend | php:8.2-fpm + 自定义 | 8001:80 | mysql, redis |
| pim-backend | 同上 | 8002:80 | mysql, redis |
| oms-backend | 同上 | 8003:80 | mysql, redis |
| wms-backend | 同上 | 8004:80 | mysql, redis |

Vue 后台不入 docker（前端 `npm run dev` 本地起 5173）。
小程序不入 docker（微信开发者工具本地）。

### 启动命令
```bash
cd apps/
docker-compose up -d           # 启 mysql + redis + 4 PHP
# 各 PHP 服务通过容器内 php think run 或 nginx + php-fpm
```

---

## 六、本地开发 vs 生产差异

| 维度 | 本地开发 | 生产（未来）|
|---|---|---|
| MySQL | root/root | 强密码 + 子账号 + 主从 |
| Redis | 无密码 | requirepass + ACL |
| 微信 AppID | 占位符 + APP_DEBUG=true mock | 真实 AppID + 商户号 |
| 图片存储 | 本地 `public/uploads/` | 阿里云 OSS / 腾讯云 COS（推迟）|
| HTTPS | 无 | 必须 |
| 日志 | 文件 + 终端 | 集中日志（ELK 推迟）|
| 监控 | 无 | APM（推迟）|
| 部署 | docker-compose up | K8s / 云厂商容器服务（推迟）|

## 七、跨系统通信约定

| 通信类型 | 实现 | 用途 |
|---|---|---|
| 同步 RPC | HTTP（统一 `/api/v1/` 前缀）| 强一致：下单 / 库存查询 |
| 异步事件 | Redis Stream | 最终一致：商品变更 / 库存变更 / 状态机推送 |
| 幂等保证 | Idempotency-Key header / event_id | 所有写接口必须 |
| trace | 自定义 X-Trace-Id header + 落日志 | 跨服务调用追踪 |

## 八、不引入的技术（明确列出）

- ❌ Kubernetes / 服务网格 / 服务注册中心
- ❌ 微服务框架（Spring Cloud / Dubbo / gRPC）
- ❌ NoSQL（除 Redis）
- ❌ ElasticSearch（M2 搜索功能时再考虑）
- ❌ 消息队列（RabbitMQ / Kafka）—— Redis Stream 已够 MVP
- ❌ 链路追踪系统（Jaeger / Zipkin）—— 仅打日志
- ❌ APM（New Relic / Datadog）
- ❌ CDN —— 图片本地

## 九、版本固化时间
2026-05-24，与 Phase 0 启动同步。后续版本升级走主控审批。
