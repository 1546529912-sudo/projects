# iteration-51-manual-test.md · 手动测试清单（用户执行）

> auto-test [iteration-51-auto-test.md](iteration-51-auto-test.md) 已 PASS（8/8 ✅，0 fix）。

## 前置
- 微信开发者工具或真机打开小程序

## 用例（共 5 项）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| M1 | 首页 → 点击 banner（link_type=spu）| 直接跳商品详情页（不再 toast）| 实测填写 | ☐ |
| M2 | 首页 → 点击热门推荐第一项 | 直接跳商品详情页 | 实测填写 | ☐ |
| M3 | 首页 → 点击专题入口（如"618 大促"）→ topic-detail 页 → 点击任一商品卡 | 跳商品详情页 | 实测填写 | ☐ |
| M4 | banner link_type=category | 跳列表页 `?category=N` | 实测填写 | ☐ |
| M5 | 已下架 SPU 对应的 banner/featured/topic 项点击（无 sku_code） | toast "商品已下架" | 实测填写 | ☐ |

## 测试时间
（用户填）：_________________________
