# iteration-53-auto-test.md · BI 联动运营（Q46-02 + Q48-01）

## 范围
- Q46-02 RFM 分群一键发券：复用 iter-46 RFM 算法 → 找 segment 用户 → 批量发券（user_coupons + claimed_count++）
- Q48-01 SKU 淘汰阶段一键下架：复用 iter-48 阶段判定 → 找"淘汰"状态 published SPU → status='offline' + spu_status_log

## 用例（5 项全 PASS）

| # | 实际 | PASS |
|---|---|---|
| T1 | RFM 重要价值 → target=1 granted=1 | ✅ |
| T2 | SKU 淘汰下架（当前无淘汰）→ offlined=0 | ✅ |
| T3 | sales 调发券 → 403 仅 super_admin | ✅ |
| T4 | 非"淘汰"阶段批量下架 → 400 | ✅ |
| T5 | (fix-1) user_coupons 表无 expire_at 字段 → 移除该字段后 granted 正常 | ✅ |

## 文件
- 1 编辑 PHP OMS Admin.rfmGrantCoupon + 路由
- 1 编辑 PHP PIM Admin.skuLifecycleBatchOffline + 路由
- 2 编辑 ts apis (rfmGrantCoupon / skuLifecycleBatchOffline)
- 2 编辑 Vue (Bi/Rfm.vue +"🎁 一键发券" / Bi/SkuLifecycle.vue +"📦 一键下架")

**5/5 ✅ + 1 fix（user_coupons 字段错误，已修）**
