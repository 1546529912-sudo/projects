# iteration-13-runbook.md · PIM → WMS SKU 主数据同步

## 【目标】
WMS 持有 SKU 主数据本地副本（wms_products），通过 `pim.sku.changed` 事件从 PIM 异步同步。
入库 / 出库 UI 显示商品名（不再裸 SKU code）。

## 【非目标】
- 入库时强校验 SKU 必须存在（仍允许，仅 UI 提示）
- WMS 端 SKU 编辑（WMS 是 PIM 的 read replica）
- 价格历史 / 详情 HTML 同步（WMS 不需要）

## 一、文件清单（共 13 文件，3 Wave）

### Wave A · PIM 推送侧（5 文件）
| 类型 | 文件 |
|---|---|
| service 新 | `pim-backend/app/service/EventBus.php`（iter-9 OMS/WMS 同款，PIM 首次接入）|
| service 新 | `pim-backend/app/service/SkuChangedPublisher.php`（封装 SKU+SPU join + 推送）|
| controller 改 | `pim-backend/app/controller/Sku.php`（create/update/softDelete 各加 publishOne）|
| controller 改 | `pim-backend/app/controller/Product.php`（update/publish/offline 加 publishBySpu；softDelete 加 publishDelete）|
| command 新 | `pim-backend/app/command/ReplayAllSkus.php`（`pim:replay-skus` 回填）|
| config 新 | `pim-backend/config/console.php`（注册命令）|

### Wave B · WMS 订阅侧（6 文件）
| 类型 | 文件 |
|---|---|
| migration 新 | `wms-backend/database/migrations/20260528000003_create_wms_products.php` |
| service 新 | `wms-backend/app/service/handler/PimSkuChangedHandler.php`（upsert / delete）|
| command 新 | `wms-backend/app/command/ConsumePimEvents.php`（consume:pim）|
| config 改 | `wms-backend/config/console.php`（+1 命令）|
| supervisor 改 | `wms-backend/supervisor/consumer.conf`（+1 program:consume-pim）|
| controller 改 | `wms-backend/app/controller/Inbound.php`（detail() join wms_products 附加 spu_name/sku_name/main_image）|

### Wave C · Vue（1 文件）
| 类型 | 文件 |
|---|---|
| page 改 | `shop-admin/src/pages/wms/Inbound.vue`（detail dialog table 加"商品"列）|

### Wave D · 文档（3 文件）
- iteration-13-runbook.md（本文件）
- reconcile-report-iteration-13.md
- progress.md（追加 iter-13 块）

合计代码量：~600 行 PHP / ~30 行 Vue。

## 二、payload schema

```json
{
  "action": "upsert | delete",
  "sku_code": "SPU001-001",
  "spu_code": "SPU001",
  "spu_name": "经典款 T 恤",
  "sku_name": "红 / L",
  "main_image": "/uploads/.../xxx.jpg",
  "price": 9900,
  "is_active": true
}
```

`is_active` = SPU.status=published AND SKU.status=enabled（且都未软删）。

## 三、PIM 6 处 publish 触发点

| 触发 | 调用 | 备注 |
|---|---|---|
| Sku::create | `publishOne($skuCode)` | 新建 SKU 立即同步 |
| Sku::update | `publishOne($skuCode)` | 价格/状态变更 |
| Sku::softDelete | `publishOne($skuCode)` | 推 delete 事件 |
| Product::update | `publishBySpu($spuId)` | SPU 名/主图改变，遍历 child SKU 推 upsert |
| Product::publish | `publishBySpu($spuId)` | SPU 发布 → 所有 SKU is_active=true |
| Product::offline | `publishBySpu($spuId)` | SPU 下架 → 所有 SKU is_active=false |
| Product::softDelete | `publishDelete($skuCodes)` | SPU 软删（级联 SKU 软删）→ 推 delete |

所有 publish 都 try/catch 包裹，失败仅 error_log，**不阻塞主流程**。

## 四、待用户运行（4 步）

### 命令
```bash
cd /Users/linfeng/Desktop/project/e-com/sys/apps

# 1. WMS migrate 新表 wms_products
docker-compose exec wms-backend php think migrate:run
# 期望: 1 行 migrated（CreateWmsProducts）

# 2. WMS 重启拉起 consume:pim
docker-compose restart wms-backend

# 3. PIM 重启加载新代码（controller + service + command）
docker-compose restart pim-backend

# 4. PIM 跑一次回填，把现有 SKU 全推一遍
docker-compose exec pim-backend php think pim:replay-skus
# 期望: "[replay] published 5 / 5"
```

### 验证清单（6 步）
| # | 操作 | 期望 |
|---|---|---|
| 1 | 看 wms-backend 日志确认 consume-pim RUNNING | supervisord `entered RUNNING` |
| 2 | `SELECT COUNT(*) FROM wms_products` | 与 PIM SKU 数一致（5 行）|
| 3 | Vue WMS/入库管理 → 任意已完成入库单 → 详情 | 表格出现"商品"列，显示 spu_name + sku_name |
| 4 | Vue PIM/商品 → 编辑 SPU 名 + 保存 → WMS 再开同 SKU 详情 | spu_name 已更新 |
| 5 | Vue PIM/SPU → 下架 → `SELECT is_active FROM wms_products WHERE sku_code IN (...)` | is_active=0 |
| 6 | Vue PIM/SKU → 删除 | `SELECT * FROM wms_products WHERE sku_code=?` 返回空（delete 生效）|

## 五、主动避坑（吸取 iter-9/10/11 经验）

| 风险 | 提前规避 |
|---|---|
| PIM publish 失败拖垮主流程 | 所有 publish 包 try/catch，失败仅 error_log |
| SKU 更新事件先于 INSERT 完成 → handler 找不到行 | publishOne 在 INSERT/UPDATE **之后**调用，且仅传 sku_code，handler 重查 DB（不会 race PIM 自己）|
| 但 WMS consumer 启动早于 PIM 推送 | XGROUP CREATE 使用 0 起点（不是 $），不会丢消息 |
| 死信表缺失 | WMS 已有 dead_letter 表（iter-9 建）|
| WMS Inbound list 端点性能 | 仅 detail 端点 join（list 不显示 items），无 N+1 |
| 首次部署 wms_products 空 | 提供 `pim:replay-skus` 一次性回填 |

## 六、与 iter-12 对比

| 项 | iter-12（wms.inventory.changed）| iter-13（pim.sku.changed）|
|---|---|---|
| 方向 | WMS → OMS | PIM → WMS |
| 业务语义 | 入库 delta | SKU 主数据快照 |
| 数据形态 | 增量 +N | 全量 upsert / delete |
| 幂等键 | inventory_log 三元组 | UPSERT（INSERT or UPDATE）天然幂等 |
| 回填 | 不需要（增量） | 需要 `pim:replay-skus` 命令 |

## 七、时间
2026-05-28
