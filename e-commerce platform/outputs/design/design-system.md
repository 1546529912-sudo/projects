# Design System · 视觉规范（设计 Agent 产物 1/N）

> 基于 `DESIGN.md`（Airbnb 设计系统）裁剪适配中研复材 B2B 工业品场景。
> 开发 Agent 必须严格按本规范实现，不得自创色值/字号/间距。

## 【当前焦点】

- 当前迭代：iteration-1
- 当前状态：已生成，待用户随 Phase 0 一起确认
- 强约束：所有颜色/字体/间距/圆角必须用本文件的 token，不允许 hard code

## 1. 设计原则

| 原则 | 落地 |
|------|------|
| 单品牌色强调 | 整个产品只有一个强调色 `#ff385c`，其他都是中性灰阶 |
| 白底大留白 | 页面底色统一 `#ffffff`，信息靠卡片组织 |
| 柔和圆角 | 按钮 8px / 卡片 14px / 搜索栏 pill / 头像 full，无硬角 |
| 一层阴影 | 只有 hover-float 一个阴影 token，不堆多层级 |
| 摄影驱动 | 商品卡片 photo-first，技术规格让位详情页 |

## 2. 颜色 Token

### 品牌色（v2 工业克莱因蓝 IKB）

```css
--color-primary:           #002fa7;  /* International Klein Blue */
--color-primary-active:    #001f70;  /* 按下/hover 深一档 */
--color-primary-disabled:  #b5c1ed;  /* 禁用淡蓝 */
--color-primary-tint:      #e8edfa;  /* 单选/卡片 hover 浅蓝底 */
```

> v1 历史值：`#ff385c`（Airbnb Rausch 红）。已在 iteration-6 改为工业克莱因蓝，与中研复材"工业制造业 B2B"的专业感更一致。

### 中性灰阶

```css
--color-ink:           #222222;  /* 标题、正文主色 */
--color-body:          #3f3f3f;  /* 正文次色（长文用） */
--color-muted:         #6a6a6a;  /* 辅助文字 */
--color-muted-soft:    #929292;  /* 禁用文字 */
--color-hairline:      #dddddd;  /* 分割线 */
--color-hairline-soft: #ebebeb;  /* 轻分割线 */
--color-border-strong: #c1c1c1;  /* 强边框 */
```

### 表面

```css
--color-canvas:         #ffffff;
--color-surface-soft:   #f7f7f7;
--color-surface-strong: #f2f2f2;
```

### 语义色

```css
--color-success: #27AE60;  /* 库存充足、支付成功、订单完成 */
--color-warning: #F39C12;  /* 低库存、待付款提醒 */
--color-error:   #c13515;  /* 表单校验失败、支付失败（区别于品牌红） */
--color-info:    #428bff;  /* 链接、信息提示 */
```

### 阴影

```css
--shadow-hover-float:
  rgba(0,0,0,0.02) 0 0 0 1px,
  rgba(0,0,0,0.04) 0 2px 6px 0,
  rgba(0,0,0,0.1)  0 4px 8px 0;
```

## 3. 字体 Token

### 字体栈

```css
--font-display:
  Inter, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC',
  -apple-system, system-ui, sans-serif;

--font-mono:
  'JetBrains Mono', Menlo, Consolas, monospace;
```

### 字号 / 字重 / 行高

| Token | 字号 | 字重 | 行高 | 用途 |
|-------|------|------|------|------|
| `--text-display-xl` | 28px | 700 | 1.43 | 首页 h1 |
| `--text-display-lg` | 22px | 500 | 1.18 | 商品详情 h1 |
| `--text-display-md` | 21px | 700 | 1.43 | 详情页区块标题 |
| `--text-display-sm` | 20px | 600 | 1.20 | 子区块标题 |
| `--text-title-md` | 16px | 600 | 1.25 | 卡片标题 |
| `--text-title-sm` | 16px | 500 | 1.25 | 列头 |
| `--text-body-md` | 16px | 400 | 1.5 | 正文 |
| `--text-body-sm` | 14px | 400 | 1.43 | 卡片元信息、价格 |
| `--text-caption` | 14px | 500 | 1.29 | 搜索字段 label |
| `--text-caption-sm` | 13px | 400 | 1.23 | 法务文字、版权 |
| `--text-badge` | 11px | 600 | 1.18 | 徽章 |
| `--text-button-md` | 16px | 500 | 1.25 | 主按钮 |
| `--text-button-sm` | 14px | 500 | 1.29 | 小按钮 |
| `--text-rating-display` | 64px | 700 | 1.1 | 商品详情评分（唯一字号高光时刻）|

## 4. 间距 Token

```css
--space-xxs: 2px;
--space-xs:  4px;
--space-sm:  8px;
--space-md:  12px;
--space-base: 16px;
--space-lg:  24px;
--space-xl:  32px;
--space-xxl: 48px;
--space-section: 64px;
```

- 基础单位 4px
- 主要章节 vertical padding: 64px
- 卡片内 padding: 24px（host-card/reservation-card），16px（product-card meta）
- 卡片间 gutter: 16px
- 列间 gutter: 24px

## 5. 圆角 Token

```css
--radius-xs:   4px;
--radius-sm:   8px;     /* 按钮 / 输入框 */
--radius-md:   14px;    /* 卡片 / 图片 */
--radius-lg:   20px;
--radius-xl:   32px;    /* 大徽章 */
--radius-full: 9999px;  /* 搜索栏 / 圆形按钮 / 头像 */
```

## 6. 核心组件规范

### Button

| 类型 | 背景 | 文字 | 高度 | padding | radius |
|------|------|------|------|---------|--------|
| primary | `#ff385c` | `#fff` | 48px | 14×24 | 8px |
| primary-active | `#e00b41` | `#fff` | 48px | 14×24 | 8px |
| primary-disabled | `#ffd1da` | `#fff` | 48px | 14×24 | 8px |
| secondary | `#fff` | `#222` | 48px | 13×23 (含 1px ink 边框) | 8px |
| tertiary-text | transparent | `#222` (hover 下划线) | inline | 0 | 0 |
| pill-rausch | `#ff385c` | `#fff` | 36px | 10×20 | full |

### Input

- 背景 `#fff`
- 1px hairline 边框（默认）
- focus 时边框变 2px ink（`#222`），无 glow
- 圆角 8px
- 高度 56px
- padding 14×12

### Card

- 背景 `#fff`
- 圆角 14px
- 默认无阴影
- hover-float 时应用 `--shadow-hover-float`
- 内边距：24px（host-card / reservation-card）；16px（product-card 文字区）

### Search Bar

- 形状：pill (`radius: full`)
- 背景：`#fff`
- 高度：64px
- 内部分段（型号 / 材料 / 规格），用 1px hairline 竖线分隔
- 右端圆形 Rausch orb 触发搜索（48×48）

### Top Nav

- 高度 80px
- 背景 `#fff`
- 1px bottom hairline
- 左侧 logo + 中间分类入口 + 右侧用户操作

### AI Drawer（右侧抽屉，**用户已确认**）

- 触发：右下角悬浮圆形按钮（直径 56px，品牌红，icon 白色）
- 抽屉宽度：400px（桌面） / 100vw（移动）
- 从右侧滑入动画 240ms ease-out
- 顶部 header：AI 头像 + "AI 助手" 名称 + 关闭按钮（X）
- 中部消息流：用户消息靠右浅灰底，AI 消息靠左白底+1px hairline
- 底部输入区：textarea + 发送按钮
- 抽屉打开时主页面变暗 10%（不阻挡滚动）
- 已采集参数卡片置顶 sticky

## 7. 响应式断点

```css
--bp-mobile: 744px;
--bp-tablet: 1128px;
--bp-desktop: 1440px;
```

| 断点 | 行为 |
|------|------|
| < 744 | 第一期不支持，仅占位提示"请用 PC 访问" |
| 744-1128 | 商品卡 2 列，侧边栏抽屉化 |
| 1128-1440 | 主设计尺寸（4 列卡片，完整侧栏） |
| > 1440 | 内容区最大 1280px 居中 |

## 8. 图标

- 风格：线性图标（lineweight 2px），尺寸 16/20/24/32
- 库选型：Lucide（与 Airbnb 视觉接近，免费可商用）
- 业务图标（材料类型、产品形态）需自定义 SVG，放 `frontend/src/assets/icons/business/`

## 9. 动效

- 默认过渡：`ease-out 200ms`
- 抽屉/弹窗：`ease-out 240ms`
- hover：`ease 150ms`
- 不要弹性/抖动动画（B2B 工业场景不合适）

## 10. 与开发的接口

- CSS variable 定义在 `frontend/src/styles/tokens.css`
- Tailwind 配置（如启用）需 import 这些 token
- Element Plus 主题色覆盖通过 `--el-color-primary: var(--color-primary)`
- 任何 PR 不允许 hard code 颜色 / 间距 / 字号，必须用 token（CI lint 校验）
