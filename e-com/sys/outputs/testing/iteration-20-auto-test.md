# iteration-20-auto-test.md · 主控 curl 测试

> **结果（2026-06-01）**：27/27 全过 ✅
> 测试范围：地址簿 / 收藏 / 评价（含 admin 审核 + 跨库读 + BFF 聚合 + 下单地址覆盖）
> 边界遵循 [`.agents/testing/SKILL.md`](../../.agents/testing/SKILL.md) §可做（自动）：仅 curl + DB 查询，不点 UI。

## 前置
- 4 后端 + mysql + redis 全 up
- 跑过 shop-backend migrations（3 张表：addresses / favorites / reviews）
- OMS 配置加 shop 副连接
- 已恢复 OMS coupons + user_coupons（iter-19 残留，本 iter 不影响）

## 一、地址簿

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T3 | GET /address/list（空） | `data: []` | `{"code":0,"msg":"ok","data":[]}` | ✅ |
| T4 | POST /address（首条） | is_default 自动 1 | `id=1, is_default=1` | ✅ |
| T5 | POST /address（非法手机号） | code=400 | `手机号格式不对` | ✅ |
| T6 | POST /address（第二条） | is_default=0 | `id=2, is_default=0` | ✅ |
| T7 | POST /address/2/default | 第二条 is_default=1 | `id=2 is_default=1` | ✅ |
| T7b | GET /address/list 后顺序 | 默认排前面 + 时间倒序 | `[(2,1), (1,0)]` | ✅ |
| T8 | DELETE /address/1 | 删除成功 | `data:{id:1}` | ✅ |

## 二、收藏

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T9 | GET /favorite/check/1（未收藏） | favored=false | `{spu_id:1, favored:false}` | ✅ |
| T10 | POST /favorite/1 | favored=true | `{spu_id:1, favored:true}` | ✅ |
| T11 | POST /favorite/1（再次，幂等） | 仍 favored=true，不报错 | `{spu_id:1, favored:true}` | ✅ |
| T12 | GET /favorite/list（加完 SPU 2 后） | 含 SPU 信息（名/主图/价格） | 含 iPhone 15 Pro / HUAWEI Mate 60 Pro | ✅ |
| T13 | DELETE /favorite/1 | favored=false | `{spu_id:1, favored:false}` | ✅ |

## 三、评价（含校验链）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T14 | POST /review（completed 单 + 5星 + 图） | spu_id 自动从 sku_snapshot 取到 | `id:1, spu_id:1, rating:5, images: [...]` | ✅ |
| T15 | 同单同 SKU 二次评价 | 400「该商品已评价过」（UNIQUE 兜底） | 正确拦截 | ✅ |
| T16 | 提交不存在的订单 | 400「订单不存在」 | 正确拦截 | ✅ |
| T17 | 提交 pending_pay 订单 | 400「订单未完成，不可评价」 | 正确拦截 | ✅ |
| T18 | rating=7（越界） | 400「评分必须 1-5」 | 正确拦截 | ✅ |
| T19 | GET /review/my | 含 images 数组解码 | 正确 | ✅ |
| T20 | GET /review/by-spu/1 | 含 list + aggregate{count, avg_rating} | `count:1, avg_rating:5` | ✅ |

## 四、SPU 详情 BFF 聚合（shop-backend）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T21 | GET /product/SPU001-002 | 含 review_count + rating_avg + reviews | `review_count:1, rating_avg:5, reviews:[...]` | ✅ |

## 五、Admin 审核（OMS → shop_db 副连接读 + RBAC）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T22 | sales 角色 GET /admin/review/list | 跨库读 shop_db.reviews 成功 | 正常返回 1 条 | ✅ |
| T23 | warehouse 角色 GET /admin/review/list | 403 | `403 权限不足，需要角色: super_admin/sales_ops` | ✅ |
| T24 | sales POST /admin/review/1/hide | 软切 status=hidden | `status:hidden` | ✅ |
| T25 | SPU 详情 review_count 应变 0 | hidden 不计入聚合 | `review_count:0, rating_avg:0` | ✅ |
| T26 | sales POST /admin/review/1/restore + 再查 | 重新计入 | `review_count:1, rating_avg:5` | ✅ |

## 六、下单地址改造（兼容老的 last_address_snapshot）

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T27 | POST /order/submit body 带 address | OMS 落库地址 = 传入地址（不再读 users.last_address_snapshot） | `address: {name:测试收件人, province:广东, city:深圳市, district:南山区, detail:科技园 X 栋}` | ✅ |

## 七、健康检查 + PIM 新接口

| # | 步骤 | 期望 | 实际 | PASS |
|---|---|---|---|---|
| T1 | GET /health | shop-backend 起来 + db/redis ok | `{db:ok, redis:ok}` | ✅ |
| T2 | POST /api/v1/spu/batch | 返回 SPU 简略（id/name/main_image/price/default_sku_code） | 返回 SPU 1+2 详情 | ✅ |

## 八、本轮开发期 bug
- 无（auto-test 一次跑通；地址 payload 兼容 + spu_id 从 sku_snapshot 取 + 跨库读 + UNIQUE 兜底全部一遍过）

## 八-bis、manual-test 抓到的 bug
- **iter20-fix-1**：checkout/index.js `onShow` 无条件调 `loadDefaultAddress()`，导致用户从 address-list 选地址回来后，刚选的被覆盖回默认地址。修复：`if (!this.data.address) this.loadDefaultAddress()`。用户 M14 步骤一次抓到。

## 九、需用户手动验证
- 详见 [iteration-20-manual-test.md](iteration-20-manual-test.md)
