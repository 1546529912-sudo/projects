# reconcile-report-iteration-14.md · 售后退款 + reserved 库存态启用

## 【当前焦点】
退款全链路代码全量交付 + reserved 库存态启用，复用 iter-12 事件流（payload 加 refund_no 字段），不增加新 stream / consumer。

## 一、文件清单（16 文件，对照 [iteration-14-runbook §一](iteration-14-runbook.md#一文件清单共-16-文件5-wave)）

合计代码量：~1200 行 PHP / ~500 行 Vue + 小程序。

## 二、状态机 + 库存动作

| 状态 | 转移 | 库存动作 |
|---|---|---|
| pending_approve | → approved / rejected | – |
| approved | → received_back / refunded | return_refund 时 reserve(+N) |
| received_back | → refunded | receiveBack(reserved-N, available+N) |
| refunded | (终态) | refund_only 时 unlock(locked-N, available+N) |
| rejected | (终态) | – |

## 三、本轮主动避坑

| 风险 | 规避 |
|---|---|
| inventory_log.related_order 限长 32 | 用 refund_no（约 18 字符）+ sku_code + change_type 三元组幂等 |
| OMS 不存在的 SKU reserve 时报错 | reserveBatch 兜底 INSERT 0 行后 reserved=N |
| 退款数量超出可退配额 | validateItemsQty 综合 order_items - 历史 refund_items（pending/approved/received_back/refunded 都算占用）|
| markReceivedBack 重复投递（WMS 重推事件）| 状态机早期返回（received_back/refunded 跳过）|
| 路由顺序 | refund/<no> 参数路由放 refund plain 之前（iter-10 fix-2 教训）|
| WMS 退货 inbound 缺 refund_no | controller 强校验：source_type=return 必须 refund_no |
| 旧 inbound_orders 行 refund_no 缺失 | migration 加 nullable，旧行 NULL 兼容 iter-12 流 |
| Vue admin 显示 refund.status 五值 | 复用 iter-7 StatusTag 组件（自动着色）|

## 四、与历史 iter 对账

| iter | 主题 | 事件流变化 |
|---|---|---|
| iter-9 | 异步事件总线引入 | 新建 oms.order.paid / wms.outbound.completed |
| iter-12 | 入库 → OMS available +N | 新建 wms.inventory.changed |
| iter-13 | PIM → WMS 主数据同步 | 新建 pim.sku.changed（第 4 条流）|
| **iter-14** | **售后退款 + reserved** | **复用 wms.inventory.changed，payload 加可选 refund_no 字段** ✨ |

**关键设计**：iter-14 不增加新 stream / 新 consumer，纯字段扩展。OMS handler 内分叉处理（refund_no 存在 → markReceivedBack；不存在 → 原 iter-12 路径）。

## 五、与 iter-12 兼容性

| 场景 | iter-12 行为 | iter-14 后行为 |
|---|---|---|
| 采购入库（无 refund_no）| available += delta | 完全一致（handler 内 refund_no 缺失 → 走原路径）|
| 退货入库（refund_no 存在）| (无此场景，会跑成普通 available +=N 重复计入) | 走 RefundService::markReceivedBack 路径，单独处理 |

旧的 wms.inventory.changed 事件 payload 完全兼容（多一个可选字段不破坏 schema）。

## 六、剩余非阻塞（M3+）

| 编号 | 事项 |
|---|---|
| Q14-01 | 真实微信退款 v3 接入 |
| Q14-02 | 用户上传退货凭证图片 |
| Q14-03 | 客服 / 运营备注 audit log |
| Q14-04 | 多 SKU 部分退款金额按比例自动计算 |
| Q14-05 | 退款超时（X 天未发起退货物流自动关闭）|

## 七、待用户运行验证

详见 [iteration-14-runbook §五-六](iteration-14-runbook.md#五待用户运行5-步)：5 步命令 + 8 步浏览器/小程序清单。

## 八、对账结论

✅ **代码全量交付**：16 个文件，5 Wave 全部按 runbook 完成。
⏳ **运行时验证**：等待用户执行 2 次 migrate + 4 后端 restart + 浏览器/小程序 8 步清单。
🔄 **预期返工**：可能 1-2 项小修；本轮已主动规避三元组键长 / 配额校验 / 重复投递 / 路由顺序四类历史坑。

## 九、对账时间
2026-05-28

## 十、本对账使用的 skill
- `karpathy-guidelines`（不引入新 stream / 不引入退款 SDK / 不做无依据的强校验）
