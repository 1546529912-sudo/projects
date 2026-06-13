# design-system.md · 设计系统规范

## 【当前焦点】
本项目（电商商城 v1）的设计 token、组件规范、交互规则。
小程序与 Vue 后台分别约定。所有数值取自 [design-brief.md](../product/design-brief.md) §二的固化默认值。

## 本任务匹配到的 skill 清单
- `web-design-guidelines`（UI 规范审查方法论）

---

## 一、设计 token（小程序 + 后台共用）

### 1.1 颜色
| token | 值 | 用途 |
|---|---|---|
| `--color-primary` | `#FF385C` | 主按钮、品牌强调、价格红色 |
| `--color-primary-hover` | `#E31C5F` | 主按钮 hover/press（暗 10%）|
| `--color-text-primary` | `#222222` | 一级文本、商品名、标题 |
| `--color-text-secondary` | `#717171` | 二级文本、副标题、辅助信息 |
| `--color-text-disabled` | `#B0B0B0` | 不可点击状态文字 |
| `--color-text-inverse` | `#FFFFFF` | 在主色背景上的文字 |
| `--color-border` | `#DDDDDD` | 卡片边框、分割线 |
| `--color-border-strong` | `#999999` | 输入框聚焦边框 |
| `--color-bg-page` | `#F7F7F7` | 页面整体背景 |
| `--color-bg-card` | `#FFFFFF` | 卡片背景 |
| `--color-bg-mask` | `rgba(0,0,0,0.5)` | 弹层遮罩 |
| `--color-success` | `#008A05` | 成功提示 |
| `--color-warning` | `#FFB400` | 警告提示 |
| `--color-error` | `#C13515` | 错误提示、表单错误 |
| `--color-info` | `#2E7CF6` | 信息提示（链接色）|

### 1.2 字体
- **小程序**：系统字体（iOS PingFang SC / Android 思源黑体 / 鸿蒙 HarmonyOS Sans）
- **后台**：`-apple-system, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif`

### 1.3 字号
| token | 小程序 | 后台 | 用途 |
|---|---|---|---|
| `--fs-xs` | 10sp | 12px | 角标 / 极小辅助文字 |
| `--fs-sm` | 12sp | 12px | 二级文字 / 备注 |
| `--fs-base` | 14sp | 14px | 正文 / 列表项 |
| `--fs-md` | 16sp | 14px | 加粗正文 / 按钮 |
| `--fs-lg` | 18sp | 16px | 二级标题 |
| `--fs-xl` | 22sp | 18px | 一级标题 |
| `--fs-2xl` | 28sp | 24px | 大数字（价格 / 倒计时）|

### 1.4 字重
- normal: 400
- medium: 500（小程序商品名、按钮）
- semibold: 600（标题、价格）
- bold: 700（仅强调，不常用）

### 1.5 间距（4px 基准）
- xs: 4 / sm: 8 / md: 16 / lg: 24 / xl: 32 / 2xl: 48

### 1.6 圆角
- 小圆角：4px（按钮、输入框、Tag）
- 中圆角：8px（卡片、图片）
- 大圆角：12px（弹窗、底部抽屉、对话框）
- 圆形：50%（头像、角标）

### 1.7 阴影
| token | 值 | 用途 |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | 卡片轻投影 |
| `--shadow-md` | `0 2px 8px rgba(0,0,0,0.08)` | 浮起卡片、固定底栏 |
| `--shadow-lg` | `0 4px 16px rgba(0,0,0,0.12)` | 弹窗、modal |

### 1.8 动画时长
- fast: 150ms（按钮按压、tooltip）
- normal: 250ms（卡片 hover、tab 切换）
- slow: 400ms（页面进退、抽屉滑入）

---

## 二、组件规范

### 2.1 按钮（小程序 / 后台）
| 类型 | 背景 | 文字 | 边框 | 高度（小程序 / 后台）|
|---|---|---|---|---|
| 主按钮 primary | `#FF385C` | `#FFFFFF` | 无 | 44 / 36 |
| 次按钮 secondary | `#FFFFFF` | `#222222` | 1px `#222222` | 44 / 36 |
| 文字按钮 text | 透明 | `#FF385C` | 无 | 自适应 |
| 危险按钮 danger | `#C13515` | `#FFFFFF` | 无 | 44 / 36 |
| 禁用 disabled | `#F0F0F0` | `#B0B0B0` | 无 | 同对应 |

状态：
- 默认：上表所示
- hover/press：背景色变暗 10%（小程序仅 press）
- loading：左侧 spinner + 文字"加载中"，按钮置 disabled
- 禁用：不可点击 + 无 hover/press 反馈

### 2.2 输入框
- 高度：小程序 44sp / 后台 36px
- 圆角 4px
- 默认边框 `#DDDDDD`；聚焦 `#222222`；错误 `#C13515` 1.5px
- 内边距 12px
- placeholder 颜色 `#B0B0B0`
- 字段下方错误提示：`#C13515` 12sp，紧贴下边距 4px

### 2.3 卡片
- 背景 `#FFFFFF`
- 圆角 8px
- 边框：可选（无边框 + 阴影 sm，或 1px `#DDDDDD` 无阴影）
- 内边距 16px
- 卡片间距 12px

### 2.4 商品卡片（详见 [airbnb-components-map.md](airbnb-components-map.md) #1）
- 主图比例 4:5（小程序）/ 1:1（后台 thumbnail）
- 字段（自上而下）：图片 → 名称 2 行省略 → 价格行 → 销量
- 名称：`--fs-base` `medium` `--color-text-primary`
- 价格：`--fs-md` `semibold` `--color-primary`，前缀 `¥`
- 销量：`--fs-sm` `--color-text-secondary`，"销量 N"

### 2.5 Tab
- 高度：小程序 44sp / 后台 40px
- 文字：未选 `--color-text-secondary`，选中 `--color-text-primary` `semibold`
- 选中下划线：2px `#FF385C`，宽度 = 文字宽度
- 切换动效：250ms

### 2.6 Toast
- 位置：顶部居中（小程序）/ 右上角（后台）
- 背景 `rgba(0,0,0,0.75)` + 文字白色（小程序）；白底 + 主色边（后台 Element Plus 默认）
- 2s 自动消失
- 类型：info / success / warning / error，对应图标 + 颜色

### 2.7 弹窗 / 底部抽屉
- 遮罩 `rgba(0,0,0,0.5)`
- 内容圆角 12px
- 顶部标题栏 + 关闭按钮（右上角 X）
- 底部按钮区：取消（次按钮）+ 确认（主按钮）

### 2.8 加载态
- 列表/详情：**骨架屏**（灰色矩形占位，250ms shimmer 动画）
- 按钮/弹窗：**spinner**（小程序系统 loading，后台 Element Plus loading）
- **禁止**：转圈遮挡整页（除提交订单等少数场景）

### 2.9 空态
- 居中图标（120 × 120）+ 文案（`--fs-base` `--color-text-secondary`）+ 引导按钮（可选）
- 标准文案库：
  - 列表空："暂无内容"
  - 购物车空："购物车空空如也" + "去逛逛"按钮
  - 订单空："还没有订单哦" + "去逛逛"按钮
  - 搜索无果："没有找到相关商品" + "清除筛选"按钮

### 2.10 错误态
- 居中图标（120 × 120）+ 错误文案 + "重试"按钮
- 标准文案：
  - 网络错误："网络异常，请检查连接"
  - 服务错误："服务暂时不可用，请稍后再试"
  - 404："页面不存在" + "回到首页"

---

## 三、布局规范

### 3.1 小程序
- 全局背景 `--color-bg-page` (#F7F7F7)
- 页面卡片间距 12px
- 卡片内边距 16px
- 安全区适配（iPhone 刘海 + Home Indicator）
- 底部固定栏：高度 56sp + 安全区，内置 z-index: 100

### 3.2 后台（Vue + Element Plus）
- 整体：左侧导航 200px + 顶栏 60px + 主内容区
- 主内容区最大宽 1280，居中
- 表格：行高 48px，斑马纹关闭，hover 高亮
- 表单：label 左对齐宽 100px，控件最大宽 320px

---

## 四、可访问性

- 颜色对比度 ≥ 4.5:1（正文）/ 3:1（大字号）→ 工具：WebAIM 检查
- 可点击元素 ≥ 44 × 44sp（小程序）/ 32 × 32px（后台）
- 表单 label 与 input 关联（for/id）
- 状态变化提供视觉 + 文字双重提示（不仅靠颜色）

---

## 五、与 Element Plus 集成（后台专用）

- 主题色覆盖：通过 SCSS 变量覆盖 Element Plus 的 `$--color-primary: #FF385C`
- 字体覆盖：全局 body font-family
- 组件按需引入（vite plugin 或 unplugin-vue-components）
- 禁用 Element 默认动画在 hover/press 上覆盖本规范定义的 250ms

---

## 六、变更管理

- 本文件版本：v1.0（2026-05-24）
- 任何 token 修改须同步更新本表 + design-brief + 通知开发 Agent
- 新增组件须先在本表登记规范再使用
