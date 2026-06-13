# iteration-15-runbook.md · 退货凭证图片上传 + 后台操作 audit log

## 【目标】
- A. 小程序申请退款时上传 1-5 张凭证图，OMS 落库，Vue admin 详情可预览
- B. OMS 6 处 admin 写操作（强制取消 / 异常恢复 / 库存调整 / 退款 approve/reject/confirm）自动写 admin_audit_log，Vue admin 提供查询页

## 【非目标】
- 售后客服 IM
- 凭证 OCR / AI 风控
- audit_log 异步归档（一定时间后落冷存储）

## 一、文件清单（共 15 文件，A+B+C 三 Wave）

### Wave A · 退货凭证图片（7 文件）
| 类型 | 文件 |
|---|---|
| controller 新 | `shop-backend/app/controller/Upload.php`（用户态上传，原生 $_FILES，路径 `uploads/refund-evid/{ymd}`）|
| route 改 | `shop-backend/route/app.php`（+1 路由 `POST /api/v1/upload/image` 在 auth group 内）|
| migration 新 | `oms-backend/database/migrations/20260528000006_add_evidence_to_refund_orders.php`（ALTER 加 evidence_images JSON 列）|
| service 改 | `oms-backend/app/service/RefundService.php`（apply 新参数 evidenceImages，最多 5 张 + 清洗）|
| controller 改 | `oms-backend/app/controller/Refund.php`（apply 透传 evidence_images）|
| controller 改 | `shop-backend/app/controller/Refund.php`（apply 透传）|
| util 改 | `shop-miniprogram/utils/request.js`（+ uploadFile，含 token / trace 头）|
| api 改 | `shop-miniprogram/apis/index.js`（+ uploadImage）|
| page 改 | `shop-miniprogram/pages/refund-apply/{index.js, .wxml, .wxss}`（图片选择 + 上传 + 删除 + 已上传缩略图网格）|
| page 改 | `shop-miniprogram/pages/my-refunds/{index.js, .wxml, .wxss}`（详情卡片显示凭证缩略图）|
| page 改 | `shop-admin/src/pages/oms/Refunds.vue`（详情对话框 el-image 预览凭证图）|
| config 改 | `shop-admin/vite.config.ts`（`/uploads/refund-evid` → 8001，longest-prefix 放 `/uploads` → 8002 之前）|

### Wave B · 后台 audit log（5 文件）
| 类型 | 文件 |
|---|---|
| migration 新 | `oms-backend/database/migrations/20260528000007_create_admin_audit_log.php`（operator / action / target / before / after / reason / ip / trace_id）|
| service 新 | `oms-backend/app/service/AuditService.php`（静态 log()，失败仅 error_log 不阻塞主流程）|
| controller 改 | `oms-backend/app/controller/Admin.php`（cancelOrder/recoverOrder/adjustInventory 注入 log + 加 `GET /admin/audit-log`）|
| controller 改 | `oms-backend/app/controller/Refund.php`（approve/reject/confirm 注入 log）|
| route 改 | `oms-backend/route/app.php`（+1 路由 `GET /admin/audit-log`）|
| api 改 | `shop-admin/src/apis/oms.ts`（+ auditLog）|
| page 新 | `shop-admin/src/pages/oms/AuditLog.vue`（列表 + 4 维度筛选 + JSON before/after 展示）|
| router 改 | `shop-admin/src/router/index.ts`（+ /oms/audit-log）|
| layout 改 | `shop-admin/src/components/AdminLayout.vue`（OMS 子菜单 +"操作日志"）|

### Wave C · 文档（3 文件）
- iteration-15-runbook.md（本文件）
- reconcile-report-iteration-15.md
- progress.md 追加 iter-15 块

合计代码量：~700 行 PHP + ~300 行 Vue + ~200 行小程序。

## 二、关键设计决策

### A.1 上传路径前缀隔离
- PIM 上传：`/uploads/{ymd}/file.jpg`（iter-10）
- shop-backend 退货凭证：`/uploads/refund-evid/{ymd}/file.jpg`（iter-15 新增）
- vite 代理用 longest-prefix 路由分流：`/uploads/refund-evid` → 8001，`/uploads` → 8002

### A.2 复用 PIM 原生 $_FILES 模式
直接抄 iter-10 fix-5 解决方案：避开 TP `Request::file()` 在容器内 tmp 文件二次读取的 bug。

### A.3 5 张上限 + 清洗
RefundService::apply 内 `array_filter + array_slice(..., 5)` 兜底，前端就算绕过校验也不会写超量。

### B.1 静态 log() 而非依赖注入
AuditService 用 `public static log()`，调用方一行：
```php
AuditService::log('refund.approve', 'refund', $refundNo, $before, $after, $reason);
```
不需要传 Request、不需要 DI 容器，工程上最低噪音。Request 通过 `\think\facade\Request::instance()` 获取，IP + trace_id 自动抓取。

### B.2 失败不阻塞业务
AuditService::log 内 try/catch 包，DB 写失败仅 error_log。审计日志缺失比业务回滚代价小。

### B.3 before / after 用 JSON
不存储完整对象（太大），仅记录关心字段，例如：
- `order.force_cancel`: `{status: paid} → {status: cancelled}`
- `inventory.adjust`: `{available: 50, buffer_qty: 0} → {available: 100, buffer_qty: 0}`

## 三、6 处 audit 注入点

| 控制器 | 方法 | action | before | after |
|---|---|---|---|---|
| Admin | cancelOrder | order.force_cancel | {status} | {status: cancelled} |
| Admin | recoverOrder | order.recover | {status: exception} | {status: $to} |
| Admin | adjustInventory | inventory.adjust | {available, buffer_qty} | {available, buffer_qty} |
| Refund | approve | refund.approve | {status} | {status: approved} |
| Refund | reject | refund.reject | {status} | {status: rejected} |
| Refund | confirm | refund.confirm | {status} | {status: refunded} |

## 四、待用户运行（4 步）

```bash
cd /Users/linfeng/Desktop/project/e-com/sys/apps

# 1. OMS migrate（refund_orders 加 evidence_images + 建 admin_audit_log）
docker-compose exec oms-backend php think migrate:run
# 期望: 2 行 migrated

# 2. 4 后端重启加载新代码
docker-compose restart shop-backend oms-backend

# 3. Vue admin: vite.config.ts 改了 proxy，需要重启 dev server
# 在 shop-admin 终端 Ctrl+C 然后:
# cd shop-admin && npm run dev

# 4. 微信开发者工具：重新编译加载新页（refund-apply 上传 UI + my-refunds 缩略图）
```

## 五、验证清单（5 步）

| # | 操作 | 期望 |
|---|---|---|
| 1 | 小程序 → 已 paid 订单 → 申请退款 → 选 2 张图 → 上传成功（缩略图显示）→ 提交 | refund_orders.evidence_images 写入 JSON 数组 |
| 2 | 小程序 → 我的退款 → 该单显示缩略图 | 图片正常加载（shop-backend nginx 直出）|
| 3 | Vue admin → OMS / 退款审批 → 详情对话框 | 凭证图片显示 + el-image 点击可放大预览 |
| 4 | Vue admin → 该单点"通过" → OMS / 操作日志 | 新增一条 action=refund.approve 的日志，before/after JSON 显示 |
| 5 | Vue admin → 操作日志 → 按 action / operator / target 筛选 | 列表正确过滤 |

## 六、本轮主动避坑

| 风险 | 规避 |
|---|---|
| `/uploads` 同路径不能代理到两个不同后端 | shop-backend 强制子目录 `refund-evid/`，vite 用 longest-prefix |
| 用户绕过前端校验上传 6 张 | RefundService::apply 内 array_slice(..., 5) 服务端兜底 |
| 用户上传非图片文件 | Upload controller 强校验 ext + size |
| AuditService::log 失败拖垮主流程 | try/catch 包，失败仅 error_log |
| `Request::instance()` 在某些非 HTTP 环境失败（如 consumer 进程触发）| 当前仅 admin controller 调用，HTTP 环境一定有 |
| migrate 顺序：先加 evidence_images 才能 INSERT 带这列 | 单 docker-compose exec 命令 phinx 按文件名顺序跑 |
| 旧的 refund_orders 行无 evidence_images 列 | migration 加 nullable，向后兼容 |

## 七、与 iter-10 / iter-14 对账

| 项 | iter-10 PIM Upload | **iter-15 shop-backend Upload** |
|---|---|---|
| 角色 | 后台运营上传 SPU 主图 | 用户态上传退货凭证 |
| 路径 | `/uploads/{ymd}` | `/uploads/refund-evid/{ymd}` |
| 认证 | 后台 token | 用户 JWT（auth middleware）|
| 关联资源 | SPU.main_images | refund_orders.evidence_images |

| 项 | iter-14 退款 | **iter-15 退款增强** |
|---|---|---|
| 申请字段 | order_no / type / items / reason / amount | + evidence_images[] |
| 详情显示 | 状态 + 金额 + 时间 + 拒绝原因 | + 凭证图片（小程序 / Vue admin 都显示）|
| 操作可追溯 | 仅 refund.status 自身 | + admin_audit_log 完整 before/after |

## 八、剩余非阻塞（M3+）

| 编号 | 事项 |
|---|---|
| Q15-01 | 凭证图 OCR / AI 真伪识别 |
| Q15-02 | 大图 CDN / OSS 落盘 |
| Q15-03 | audit log 自动归档 + 冷存储 |
| Q15-04 | 多语言 action 名（前端 i18n）|
| Q15-05 | 凭证图客服批注 |

## 九、时间
2026-05-28
