# iteration-51-auto-test.md · 小程序跳转修复（Q40-01 + Q41-01）

> 主控自动跑，用户无需操作。

## 范围
- **Q40-01** banner.link_type=spu 时小程序跳真详情（之前仅 toast"请在 link_value 配 SKU code"占位）
- **Q40-01** featured 推荐位点击跳详情（之前 toast"跳 SPU#X"）
- **Q41-01** 营销专题 topic-detail items 点击跳详情（之前 toast"查看 SPU#X"）
- 实现：后端 3 处 service 跨库 PIM 回填 first sku_code，前端 wxml/js 用 sku 直接 wx.navigateTo

## 实现要点
- BannerService.publicListBanners — link_type=spu 时跨库 PIM.skus 拿首 SKU 写入 `link_sku` 字段
- BannerService.publicListFeatured — 每项跨库填 `sku_code`
- MarketingTopicService.publicListTopicByCode — 每 item 跨库填 `sku_code`
- 私有 helper `fetchFirstSkuCodes(spuIds)` 在两个 service 各 1 份（重复 2 次未抽公共，符合"3 次再抽"约定）
- 跨库失败 try/catch 降级 — sku_code 留空字符串，前端 toast "商品已下架"

## 前置
- shop-backend BFF 透传 OMS 公开接口（已有自 iter-40/41）

## 用例（共 8 项，全 PASS）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | OMS `/banner/list?position=home` | item.link_sku 自动填（link_type=spu 时）| home-001 link_type:spu link_value:1 link_sku:SPU001-001 ✅ | ✅ |
| T2 | OMS `/featured/list?position=home_hot` | 每 item 含 sku_code | spu:1 name:iPhone... sku_code:SPU001-001 ✅ | ✅ |
| T3 | OMS `/topic/618-2026`（专题详情）| items 各含 sku_code | spu:1 sku_code:SPU001-001 / spu:2 sku_code:SPU002-001 ✅ | ✅ |
| T4 | shop-backend BFF banner 透传 | link_sku 透传不丢 | code:0 link_sku:SPU001-001 ✅ | ✅ |
| T5 | shop-backend BFF featured 透传 | sku_code 透传 | sku_code:SPU001-001 ✅ | ✅ |
| T6 | shop-backend BFF topic 透传 | items 含 sku_code | sku_code:SPU001-001 / SPU002-001 ✅ | ✅ |
| T7 | unknown position 不崩 | 空 list | unknown position list_count:0 ✅ | ✅ |
| T8 | SPU001-001 真能拉详情 | code:0 sku.spu_name 含 iPhone | code:0 sku.spu_name:iPhone 15 Pro Max ✅ | ✅ |

## 文件清单（~6 个）
- 1 编辑 PHP（BannerService：私有 helper fetchFirstSkuCodes + publicListBanners 写 link_sku + publicListFeatured 写 sku_code）
- 1 编辑 PHP（MarketingTopicService：私有 helper fetchFirstSkuCodes + publicListTopicByCode item 写 sku_code）
- 2 编辑小程序 home（index.js 重写 onBannerTap+onFeaturedTap 用 sku 跳详情 / index.wxml 加 data-sku）
- 2 编辑小程序 topic-detail（index.js 重写 onItemTap / index.wxml 加 data-sku）

## 总结
**8/8 ✅ + 0 fix**

- 后端 0 新接口 0 新表，纯增量字段
- 跨库 try/catch 弱依赖降级
- 跨库 helper 重复 2 次符合 iter-41 经验"3 次后再抽公共"
- 小程序 banner→详情 / featured→详情 / topic-item→详情 三处真链路通

ⓘ iter-52 候选：**配置类后台可配**（Q43-01 退款阈值 / Q48-03 SKU 阶段判定 / Q49-01 预警阈值 / Q50-02 提现上下限）— 中优先级集中收
