# reconcile-report-iteration-20.md · 评价 + 收藏 + 地址簿

## 【当前焦点】
用户侧 UGC + UX 三件套：
- 评价 / 商品评论（含图片，复用 iter-15 上传）
- 收藏（SPU 维度）
- 地址簿（替换 last_address_snapshot 单点）

## 一、文件清单（详见 [runbook §一](iteration-20-runbook.md#一文件清单共-25-文件6-wave)）
~25 个文件，3 migrations + 7 shop-backend + 3 oms admin + Vue 4 + 小程序 10。

## 二、关键设计决策（详 [runbook §三](iteration-20-runbook.md#三关键设计决策)）
| 主题 | 决策 |
|---|---|
| 三表归属 | 全放 shop_db |
| 评价图片 | 复用 iter-15 `/uploads/` |
| 一单一评 | DB UNIQUE 兜底 |
| SPU 详情聚合 | shop-backend BFF 内一次性合并 |
| 默认地址 | 单 endpoint + tx UPDATE 全 0 再单条置 1 |
| 后台菜单 | 评价审核放"营销"父级 |

## 三、本轮主动避坑（详 [runbook §五](iteration-20-runbook.md#五避坑清单)）
11 项：评价/收藏/地址各自并发约束 + 跨用户改 + 跨库读 + 图片路径 + 评分范围 + 兼容老地址字段等。

## 四、与历史 iter 对账

| iter | 关联 |
|---|---|
| iter-7 | 详情页基础 |
| iter-15 | 图片上传机制，本 iter 评价直接复用 |
| iter-17 | RBAC，评价审核走 super_admin + sales_ops |
| iter-19 | 营销菜单父级，本 iter 加"评价审核"到同组 |
| **iter-20** | **UGC + UX 三件套** |

## 五、剩余非阻塞（M3+）
详 [runbook §七](iteration-20-runbook.md#七剩余非阻塞m3)：Q20-01 ~ Q20-08。

## 六、待用户运行验证
- auto-test 我跑（curl）→ `outputs/testing/iteration-20-auto-test.md`
- manual-test 用户跑（UI）→ `outputs/testing/iteration-20-manual-test.md`

## 七、对账结论
✅ runbook 定稿，进入 6 Wave 落地。

## 八、对账时间
2026-06-01

## 九、本对账使用的 skill
- `karpathy-guidelines`（不引入 富文本 / 多维度评分 / Redis 评分缓存；复用 iter-15 上传不新建 endpoint；不引入跨库写）
- `.agents/testing/SKILL.md`（auto + manual 拆分硬约束）
