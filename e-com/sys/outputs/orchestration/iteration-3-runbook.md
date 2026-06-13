# iteration-3-runbook.md · Phase 1 运行时验证与修复

## 【当前焦点】
Phase 1 工程骨架代码（iteration-2）已交付。本轮目标：
1. 用户在本机实际执行 docker-compose / composer install / npm / 微信开发者工具
2. 修复运行时踩到的所有坑
3. 端到端联通真实跑通

## 本轮发现并修复的问题（9 项）

| # | 问题 | 根因 | 修复 | 影响文件 |
|---|---|---|---|---|
| 1 | docker-compose `version: "3.9"` 告警 | Compose v2 弃用 | 删除 version 行 | docker-compose.yml |
| 2 | composer install 拒绝 firebase/php-jwt 6.x | Composer 2 默认拒装含安全 advisory 的包 | 升级到 ^7.0 | shop-backend + wms-backend composer.json |
| 3 | `Call to undefined method think\Cache::store()` | `topthink/think-cache` 是 TP 5/6 老包，类名与 TP 8 内置 `think\Cache` 冲突且缺 store() 方法 | 4 后端去掉 think-cache 依赖 | 4 × composer.json |
| 4 | `/health` 404 "控制器不存在: app\controller\Index" | think-multi-app 把 `/health` 当 app 名拆走，回落到默认 app 的 Index 控制器 | 4 后端去掉 think-multi-app（MVP 不需要多应用） | 4 × composer.json |
| 5 | nginx 没把 URL path 传给 ThinkPHP，所有路由 404 | try_files 只传 query_string，TP 8 需要 `s=$uri` 参数 | nginx.conf 改 `try_files $uri $uri/ /index.php?s=$uri&$query_string` | nginx.conf（需 rebuild 镜像）|
| 6 | `Call to undefined method think\Console::setName()` | 我的 think 入口用了 TP 6 API | 4 后端简化为 `(new App())->console->run();` | 4 × think |
| 7 | `[InvalidArgumentException] There are no commands defined in the "migrate" namespace.` | TP 8 service:discover 不会被 composer install 自动触发 | 手动 `php think service:discover`；用户操作指南补充 | apps/README.md |
| 8 | `[think\exception\ErrorException] Unable to resolve NULL driver for [think\Log]` | think-orm + database `trigger_sql=true` 触发 log 写入，但 log 缺 default driver | 4 后端加 config/log.php | 4 × config/log.php（新增）|
| 9 | think-trace dev 包试图 inject 调试栏写 log 失败 | 同上 #8 但 trace 在 after-middleware；JSON API 不需要 trace | shop/pim 去掉 think-trace | shop/pim composer.json |
| 10 | oms/wms migrate `Undefined array key "deploy"` | think-migration 读 database.php 期望 `deploy` 字段，oms/wms 漏配 | oms/wms 补 `deploy/rw_separate/master_num/slave_no/prefix` 字段 | oms/wms config/database.php |
| 11 | oms orders 表 migration `Key column 'created_at' doesn't exist` | `addTimestamps()` 生成 `create_time/update_time`，但我用 `created_at` 做索引 | 改为显式 addColumn 加 `created_at`/`updated_at` datetime | oms migration |
| 12 | macOS Docker Desktop vendor 反复变坏（"Container interface not found"/"functions_include.php missing"）| Bind mount 同步 10k+ vendor 小文件不稳 | docker-compose 把 4 后端的 `vendor/` 和 `runtime/` 改为 named volume | docker-compose.yml + 8 个新 volume |
| 13 | 小程序 WXML 编译报错 `unexpected token .` | 小程序 mustache 不支持调用方法（`.toFixed(2)`）| Page JS 在 setData 前预格式化 `price_yuan` 字段 | home/list 的 index.js + index.wxml |

## 用户在本轮承担的工作
- 跑了 ~30 条 docker-compose / curl 命令
- 跑了 npm install + npm run dev
- 用微信开发者工具加载小程序 + 多次重编译
- 截图 vue 后台 + 小程序首页
- 协助诊断 lsof 端口占用（一个孤儿 vite 进程占了 5173）

## 本环境承担的工作
- 13 项代码/配置修复
- 编辑 ~15 个文件
- 推断 ThinkPHP 8 / docker for mac / 小程序 wxml 等多个生态特有坑

## 升级与阻塞
（本轮无升级到用户决策的事项；所有问题均由主控+开发 Agent 推断修复）

## 对账触发
本 runbook 完成后立即生成 [reconcile-report-iteration-3.md](reconcile-report-iteration-3.md)。
