# iteration-52-auto-test.md · 阈值后台可配 KV（Q43-01 + Q48-03 + Q49-01 + Q50-02）

## 范围
- 新表 system_configs KV（17 条 seed，5 category）
- SystemConfigService（OMS 主，PIM 跨库只读）
- 4 阈值类一锅端：① 退款 sales 一审金额 ② 换货数量 ③ SKU 5 阶段 4 阈值 ④ BI-04 9 预警 ratio ⑤ 提现上下限
- OMS Admin.configList / configUpdate（仅 super）
- Vue Settings 页（按 category 分组 + edit/dirty/save）

## 用例（10 项全 PASS）

| # | 步骤 | 实际 | PASS |
|---|---|---|---|
| T1 | 列表全 17 条 5 category | count=17 cats={alert:9,refund:1,exchange:1,sku_lifecycle:4,withdrawal:2} | ✅ |
| T2 | 按 category=alert 过滤 | 9 项 | ✅ |
| T3 | 修改 alert.order_surge_critical 2.0→1.8 | changed=1 | ✅ |
| T4 | alerts endpoint 即时 reload | summary 正常 | ✅ |
| T5 | 改不存在 key 跳过 | changed=0 | ✅ |
| T6 | warehouse 调 config → 403 | code:403 msg:仅 super_admin | ✅ |
| T7 | 提现 ¥5 (<下限 10) → 400 | "单笔提现下限 ¥10" | ✅ |
| T8 | 改下限到 1 元再申请 ¥5 → 200 | status:pending no:WD\* | ✅ |
| T9 | 还原默认值 | changed=2 | ✅ |
| T10 | PIM 跨库读到 OMS configs（lifecycle 工作）| code:0 kpi 正常 | ✅ |

## 文件清单
- 1 migration（system_configs + 17 seed）
- 1 service OMS SystemConfigService（cache + setBatch + listByCategory + reload）
- 1 service PIM SystemConfigService（跨库只读包装）
- 1 编辑 PHP（OMS Admin +2 endpoint configList/configUpdate）
- 1 编辑 PHP（OMS route +2）
- 4 编辑 service（RefundService / ExchangeService / Admin.alertSummary 9 阈值 / WithdrawalService 上下限 / PIM lifecycleStage 4 阈值）
- 1 编辑 ts（apis/oms.ts +2）
- 1 新 Vue（SystemConfig.vue：按 category 分组 + dirty 标记 + 一次批量保存）
- 1 编辑 ts（router +1）
- 1 编辑 Vue（AdminLayout 系统管理 +"⚙️ 系统参数"）

## 总结
**10/10 ✅ + 0 fix**

阈值集中后台可配 = 4 个高优中 Q 一锅端
