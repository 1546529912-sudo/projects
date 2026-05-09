# Mode Router

## 0. Run clarification first

Before routing, run `references/00-clarification-intake-rules.md` when the user's request is short, vague, or missing platform/goal/audience/core content. Do not force a platform mode when blocking information is missing.

Use this file to choose the correct user role mode and platform/product mode before designing.

## 1. Two-layer routing

Always route across two dimensions:

```text
User role mode
+ Platform / product mode
```

Example:

```text
Product Manager Mode + Enterprise Admin Mode
Designer Mode + Mobile App Mode
E-commerce Designer Mode + WeChat Mini Program Mode
Developer/Handoff Mode + Design System Mode
```

## 2. User role modes

### Beginner Mode

Use when the user is new, unsure, or asks broadly.

Triggers:

```text
我不太懂
新手
小白
帮我想想
不知道怎么做
给我几个方向
```

### Designer Mode

Use when the user asks for visual, interaction, component, layout, or high-fidelity design.

Triggers:

```text
设计师
UI
UX
高保真
视觉
交互
设计系统
风格
组件
```

### Product Manager Mode

Use when the user asks for product structure, process, page planning, PRD translation, review prototype, IA, permissions, or business rules.

Triggers:

```text
产品经理
需求
流程
页面清单
信息架构
评审
权限
业务规则
原型
```

### E-commerce Designer Mode

Use when the user asks for product-selling visuals, product pages, banners, campaigns, platform assets, or conversion.

Triggers:

```text
电商
主图
详情页
活动页
Banner
促销
转化
商品
卖点
淘宝
京东
抖音
小红书
```

### Developer / Handoff Mode

Use when the user asks for implementation-ready structure, code/design sync, tokens, components, or engineering handoff.

Triggers:

```text
开发
工程
handoff
代码
tokens
components
前端
VS Code
Cursor
Codex
Claude Code
```

## 3. Platform / product modes

### Enterprise Admin / SaaS Dashboard Mode

Use for:

```text
后台
管理端
管理系统
SaaS
Dashboard
控制台
列表页
详情页
配置页
审批
报表
权限
表格
CRUD
台账
工单
巡检
资产
排班
WBS
BIM
FM
IBMS
```

Reference:

```text
references/10-enterprise-admin-dashboard-rules.md
```

### Responsive Web / Landing Page Mode

Use for:

```text
官网
落地页
Landing Page
产品介绍页
营销页
企业官网
品牌页
专题页
H5
响应式网页
价格页
案例页
FAQ
```

Reference:

```text
references/11-responsive-web-landing-page-rules.md
```

### Mobile App Mode

Use for:

```text
App
iOS
Android
移动端
手机端
底部Tab
个人中心
Feed
发布
扫码
拍照
离线
权限弹窗
```

Reference:

```text
references/12-mobile-app-design-rules.md
```

### WeChat Mini Program Mode

Use for:

```text
微信小程序
小程序
微信授权
手机号授权
微信支付
tabBar
胶囊按钮
订阅消息
分享
报修小程序
商城小程序
会员小程序
```

Reference:

```text
references/13-wechat-mini-program-rules.md
```

### Data Visualization Big Screen Mode

Use for:

```text
大屏
可视化大屏
驾驶舱
指挥舱
监控中心
态势感知
智慧建筑大屏
园区大屏
能耗大屏
BIM大屏
1920x1080
4K
实时数据
告警
```

Reference:

```text
references/14-data-visualization-big-screen-rules.md
```

### E-commerce / Campaign Mode

Use for:

```text
商品详情
商品主图
电商首页
商品列表
活动页
大促
促销
优惠券
直播间贴片
商城
店铺装修
A/B测试
批量出图
```

Reference:

```text
references/15-ecommerce-campaign-rules.md
```

### Design System / Component Library Mode

Use for:

```text
设计系统
组件库
tokens
变量
Button
Input
Table
Card
状态矩阵
组件规范
多端组件
样式规范
```

Reference:

```text
references/16-design-system-component-library-rules.md
```

### Cross-platform Consistency Mode

Use when more than one platform is involved:

```text
Web + App
App + 小程序
后台 + 大屏
后台 + 小程序
多端
一套业务多端
跨端一致性
设计规范
端内职责
```

Reference:

```text
references/17-cross-platform-consistency-rules.md
```


### Presentation / Deck Mode

Use for:

```text
PPT
演示文稿
presentation
deck
slides
汇报
方案汇报
产品方案
商业提案
路演
pitch deck
培训课件
研究报告
项目汇报
述职
总结汇报
HTML deck
网页演示
PDF导出
```

Reference:

```text
references/18-presentation-deck-rules.md
```

## 4. Routing priority

When multiple modes match:

1. If multiple platforms are mentioned, activate Cross-platform Consistency Mode.
2. If the task is a presentation/deck/PPT/HTML slides request, activate Presentation / Deck Mode.
3. If the task is a design system, activate Design System Mode first.
4. If the user names a specific platform, prioritize that platform.
5. If the task is a management system or table-heavy workflow, activate Enterprise Admin Mode.
6. If the task is selling/conversion/product marketing, activate E-commerce/Campaign or Landing Page mode depending on platform.
7. If unclear, ask one clarifying question or proceed with the most likely mode and state the assumption.

## 5. Mode announcement

At the start of a non-trivial task, state selected modes concisely:

```text
Selected modes:
- Role: Product Manager
- Platform: Enterprise Admin / SaaS Dashboard
```

Do not over-explain mode routing unless the user asks.
