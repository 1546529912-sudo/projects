# reconcile-report-iteration-13.md · PIM → WMS SKU 主数据同步

## 【当前焦点】
PIM 6 处写操作（SKU 3 + SPU 4）+ WMS 新建 wms_products 表 + 1 个 consumer + UI 商品名展示 = 13 文件全量交付。

## 一、文件清单（13 文件，对照 [iteration-13-runbook §一](iteration-13-runbook.md#一文件清单共-13-文件3-wave)）

合计代码量：~600 行 PHP + ~30 行 Vue。

## 二、本轮主动避坑

| 风险 | 提前规避 |
|---|---|
| PIM publish 失败拖垮主流程 | 所有 publish 包 try/catch，失败仅 error_log（同 iter-11 Inbound::autoComplete 模式）|
| Race condition（事件先于 DB 写完成）| publishOne 在 INSERT/UPDATE 后调用，且只传 sku_code；handler 重查自己 DB，PIM 自查 PIM 不会 race |
| 消费组从 $ 起点丢消息 | XGROUP CREATE 0（从头消费），首次启动不丢 |
| 首次部署 wms_products 空 | 提供 `pim:replay-skus` 命令，一次性 replay 所有 SKU |
| WMS list 端点 N+1 | 只在 detail 端点 join（list 不展开 items），单次查询 |
| 商品名 UI "未同步" | 模板里 `v-if="row.spu_name"` 兜底显示"- 未同步 -"，开发期未跑 replay 时不会白屏 |
| 路由顺序 | 本 iter 无新路由，沿用 iter-11 规范 |

## 三、与历史 iter 对账

| iter | 业务流 | 流 | 方向 | 数据形态 |
|---|---|---|---|---|
| iter-9 | 支付 → WMS 拉单 | oms.order.paid | OMS → WMS | 事件式 |
| iter-9 | 出库 → OMS 发货 | wms.outbound.completed | WMS → OMS | 事件式 |
| iter-12 | 入库 → OMS 上架 | wms.inventory.changed | WMS → OMS | 增量 delta |
| **iter-13** | **PIM SKU 主数据同步** | **pim.sku.changed** | **PIM → WMS** | **全量 upsert / delete** ✨ |

至此事件总线四流齐备，OMS↔WMS↔PIM 三模块完全异步通信。

## 四、剩余非阻塞（M3+）

| 编号 | 事项 | 处理 |
|---|---|---|
| Q13-01 | 入库前强校验 SKU 是否在 wms_products 中 | M3：可选，加 inbound 创建时校验 |
| Q13-02 | wms_products 索引补充（按 spu_code 反查）| 已加 uniq(sku_code) + idx(spu_code) |
| Q13-03 | 入库/出库 创建对话框加 SKU select 下拉（基于 wms_products）| M3 UI 优化 |
| Q13-04 | 商品名变更后历史 inbound items 不会更新展示 | 设计如此：detail 实时 join，always 最新 |
| Q13-05 | 价格历史 / 详情 HTML 同步 | 不做（WMS 不需要）|

## 五、待用户运行验证

详见 [iteration-13-runbook §四](iteration-13-runbook.md#四待用户运行4-步)：4 步命令 + 6 步浏览器清单。

## 六、对账结论

✅ **代码全量交付**：13 个文件，3 Wave 全部按 runbook 完成。
⏳ **运行时验证**：等待用户执行 migrate + 双 restart + replay 回填 + 浏览器 6 步清单。
🔄 **预期返工**：可能 1-2 项小修；本轮已主动规避 race / consumer 起点 / N+1 / 路由顺序四类历史坑。

## 七、对账时间
2026-05-28

## 八、本对账使用的 skill
- `karpathy-guidelines`（PIM publish 不引入新框架；不引入 SKU select 组件；不做强校验）
