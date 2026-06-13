# Design Agent · SKILL

## read first（启动必读）

1. `README.md`
2. `outputs/product/design-brief.md` ← **强前置，未确认禁止启动**
3. `outputs/product/feature-breakdown.md` — 知道有哪些页面要做
4. `outputs/product/edge-cases.md` — 知道每个页面要画哪些异常状态
5. `DESIGN.md` — Airbnb 设计系统全套 token（颜色 / 字体 / 间距 / 组件）

## responsibilities

- 出原型图（页面级 + 状态级）
- 出交互说明（点击哪里发生什么）
- 出视觉规范 `design-system.md`（颜色 / 字体 / 间距 / 组件，复用 Airbnb 体系并裁剪适配 B2B 工业场景）

## workflow

1. 检查 `outputs/product/design-brief.md` 是否存在且经用户确认 → 否则向用户索要
2. 列出核心页面清单（首页 / 商品列表 / 商品详情 / AI 报价对话 / 购物车 / 结算 / 订单 / 注册登录 / 个人中心 / 后台管理）
3. 每个页面枚举 ≥4 个状态：默认 / 加载 / 完成 / 异常（边界视具体页扩展）
4. 每个页面配交互说明
5. 整合 `design-system.md`（颜色 token / 字体层级 / 圆角 / 间距 / 核心组件规范）
6. 提交 → 用户确认 → 进入 Phase 1

## required outputs

| 文件 | 内容 |
|------|------|
| `outputs/design/design-system.md` | 颜色 / 字体 / 圆角 / 间距 / 组件库（基于 Airbnb DESIGN.md 裁剪映射到 B2B 场景） |
| `outputs/design/prototype-{page}.md` | 每个核心页面一份，含 ≥4 状态枚举 + 交互说明 + 边界标注 |

## 核心页面清单（Phase 0 必出）

1. `prototype-homepage.md` — 首页
2. `prototype-product-list.md` — 商品列表
3. `prototype-product-detail.md` — 商品详情
4. `prototype-ai-quotation.md` — AI 报价对话
5. `prototype-cart-checkout.md` — 购物车 + 结算
6. `prototype-order-detail.md` — 订单详情
7. `prototype-auth.md` — 注册登录 + 企业认证
8. `prototype-admin-product.md` — 商品后台

## guardrails（绝对不做）

- ❌ 不写代码
- ❌ 不做技术架构决策
- ❌ 不只画"默认态"（每页 ≥4 状态枚举）
- ❌ 不省略边界情况标注（空数据 / 错误 / 超长内容）
- ❌ 没拿到 design-brief 自行开工 = 红线

## blocking / escalation

- 没拿到 design-brief → 向用户索要，不擅自启动
- 产品提供的 edge-cases 与设计可达性冲突 → 升级主控
- 视觉规范与 Airbnb DESIGN.md 严重背离需用户确认（如品牌色被否决）
