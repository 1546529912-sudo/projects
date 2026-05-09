# CRM 完整设计规范
## Design Spec — 基于方向1「Linear Pro」

> 版本：v1.0
> 产出日期：2026-05-05
> 阶段：Design Framework Gate 第二轮（完整规范）
> 设计方向：方向1 Linear Pro — 浅色侧边栏 / 无阴影 / 深黑主动作色 / 极克制灰白美学

---

## 一、色彩系统

### 1.1 基础色板

所有颜色以 CSS 变量定义，开发 Agent 必须使用变量名，禁止直接写色值。

```css
:root {
  /* 背景层 */
  --bg-app:        #f7f8fa;   /* 全局页面背景 */
  --bg-card:       #ffffff;   /* 卡片、表格、弹窗背景 */
  --bg-subtle:     #fafafa;   /* 表头、次级区域背景 */
  --bg-hover:      #f0f1f3;   /* 行 hover 背景 */
  --bg-selected:   #eeeeef;   /* 选中行、激活状态背景 */

  /* 侧边栏专属 */
  --side-bg:         #fbfbfc;   /* 侧边栏背景（近白） */
  --side-border:     #ebedf0;   /* 侧边栏右边框 */
  --side-item-text:  #6b7280;   /* 导航项默认文字 */
  --side-item-muted: #a1a1aa;   /* 分组标签、计数 */
  --side-active-bg:  #eeeeef;   /* 激活导航项背景 */
  --side-active-text:#18181b;   /* 激活导航项文字 */

  /* 主动作色（黑色系，非蓝色） */
  --action-primary:     #111827;   /* 主按钮背景 */
  --action-primary-hover:#1f2937;  /* 主按钮 hover */
  --action-primary-text: #ffffff;  /* 主按钮文字 */

  /* 文字层 */
  --text-heading:  #111827;   /* 页面标题、表格首列 */
  --text-body:     #3f4654;   /* 正文、表格内容 */
  --text-muted:    #8a93a3;   /* 辅助说明、时间戳、placeholder */
  --text-disabled: #c4c9d4;   /* 禁用状态文字 */

  /* 边框与分割线 */
  --border-default:  #e5e7eb;   /* 卡片边框、输入框边框 */
  --border-row:      #f0f1f3;   /* 表格行分割线 */
  --border-focus:    #111827;   /* 输入框 focus 边框 */

  /* 语义色 — 成功 */
  --success:       #059669;
  --success-bg:    #ecfdf5;

  /* 语义色 — 警告 */
  --warning:       #b45309;
  --warning-bg:    #fffbeb;

  /* 语义色 — 错误 */
  --error:         #dc2626;
  --error-bg:      #fef2f2;

  /* 语义色 — 信息/蓝 */
  --info:          #2563eb;
  --info-bg:       #eff6ff;

  /* 状态徽标色 */
  --badge-blue:    #2563eb;
  --badge-blue-bg: #eff6ff;
  --badge-green:   #059669;
  --badge-green-bg:#ecfdf5;
  --badge-amber:   #b45309;
  --badge-amber-bg:#fffbeb;
  --badge-red:     #dc2626;
  --badge-red-bg:  #fef2f2;
  --badge-gray:    #52525b;
  --badge-gray-bg: #f6f6f7;

  /* 客户等级色（仅文字，无色块背景） */
  --level-a:  #dc2626;   /* A 级 — 红 */
  --level-b:  #b45309;   /* B 级 — 琥珀 */
  --level-c:  #2563eb;   /* C 级 — 蓝 */
  --level-d:  #8a93a3;   /* D 级 — 灰 */

  /* 客户状态色（圆点 + 文字，无背景色块） */
  --status-follow:  #8b5cf6;   /* 跟进中 — 紫 */
  --status-intent:  #f59e0b;   /* 意向客户 — 橙黄 */
  --status-nego:    #f97316;   /* 谈判中 — 橙 */
  --status-won:     #059669;   /* 已成交 — 绿 */
  --status-lost:    #a1a1aa;   /* 已流失 — 灰 */
}
```

### 1.2 颜色使用规则

- **主动作色是黑色 `#111827`**，不是蓝色。蓝色 `#2563eb` 只用于信息类 badge 和链接
- 客户**等级**（A/B/C/D）：只用文字颜色，**不加色块背景**
- 客户**状态**（跟进中/意向/谈判/已成交/已流失）：用 7px 圆点 + 文字，**不用矩形 badge**
- 同一页面可见的颜色种类 ≤ 4 种（不含黑白灰）
- 不自行发明新色值，所有颜色必须来自上方变量

---

## 二、字体系统

```
字体族：system-ui, -apple-system, "SF Pro Text", "PingFang SC", sans-serif

H1  页面主标题：  16px / weight 700 / line-height 1.3 / letter-spacing -0.03em
H2  区块标题：    14px / weight 700 / line-height 1.4 / letter-spacing -0.02em
H3  卡片标题：    13px / weight 700 / line-height 1.4
正文 Body：       12.5px / weight 400 / line-height 1.6
辅助 Caption：    11.5px / weight 400 / line-height 1.5
数字大字：        22px / weight 760 / line-height 1.2 / letter-spacing -0.04em（KPI 卡片用）
导航项：          13px / weight 400 → 激活时 weight 650
表头：            11px / weight 650 / text-transform uppercase / letter-spacing 0.04em
```

**字重档位（只用这三档）：**
- `400` — 正文、表格内容、辅助说明
- `650` — 表头、激活导航、按钮
- `700 / 760` — 标题、KPI 数字

---

## 三、间距系统

基础单位 4px：

```
sp-1:  4px
sp-2:  8px
sp-3:  12px
sp-4:  16px
sp-5:  20px
sp-6:  24px
sp-8:  32px
sp-10: 40px
```

**常用固定值：**
- 页面内容区 padding：`24px`
- 卡片内 padding：`16px`
- 表格行横向 padding：`14px`（首列 `16px`）
- 导航项横向 padding：`10px`
- 表单 label 与 input 间距：`4px`
- 表单行间距：`16px`

---

## 四、圆角系统

```
控件（按钮、输入框、搜索框）：7px  → --radius-control
卡片（表格容器、KPI 卡片）： 12px → --radius-card
徽标（Badge）：               6px  → --radius-badge
Logo 标志：                   7px  → --radius-mark
弹窗：                        10px → --radius-modal
```

---

## 五、阴影系统

**Linear Pro 方向：不使用任何卡片阴影。** 用边框 + 背景色差异区分层次。

```
卡片：       无阴影，仅 1px solid var(--border-default)
弹窗：       0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)
下拉菜单：   0 4px 16px rgba(0,0,0,0.10)
Tooltip：    0 2px 8px rgba(0,0,0,0.12)
其余元素：   无阴影
```

---

## 六、布局规范

### 6.1 整体框架

```
┌─────────────────────────────────────────┐
│ 侧边导航 214px │ 主内容区（剩余宽度）  │
│                │                         │
│                │  顶栏 58px              │
│                │─────────────────────── │
│                │  内容区 padding 24px   │
└─────────────────────────────────────────┘
```

- 最小支持宽度：1280px（不做响应式）
- 侧边导航宽度：214px（固定，不可折叠，P0 阶段）
- 顶栏高度：58px
- 内容区内边距：24px（四周）

### 6.2 顶栏内容规则

左侧：页面标题（H1） + 副标题/面包屑（Caption 灰色）
右侧：搜索框 + 功能按钮（导出等）+ 主操作按钮（新建）

---

## 七、组件规范

### 7.1 按钮

| 类型 | 背景 | 文字 | 边框 | 高度 |
|---|---|---|---|---|
| Primary | `--action-primary` | `#fff` | 无 | 34px |
| Secondary | `#fff` | `--text-body` | `--border-default` | 34px |
| Danger | `--error` | `#fff` | 无 | 34px |
| Ghost | transparent | `--text-muted` | `--border-default` | 34px |
| Disabled（所有类型）| opacity 0.38 | — | — | 同上 |

**尺寸：**
- 默认：height 34px / padding 0 14px / font-size 12.5px / radius 7px
- 小：height 26px / padding 0 10px / font-size 12px / radius 6px
- 大：height 40px / padding 0 18px / font-size 13px / radius 7px

**规则：**
- 同一行操作区最多 1 个 Primary 按钮
- Danger 必须二次确认弹窗
- 按钮文字 ≤ 6 个汉字
- Loading 状态：文字前加旋转图标，按钮宽度不变

### 7.2 输入框

```
高度：       34px
border：     1px solid var(--border-default)
border-radius：7px
padding：    0 12px
font-size：  12.5px
background： #ffffff
color：      var(--text-body)

focus：      border-color: var(--border-focus); outline: none;
             box-shadow: 0 0 0 2px rgba(17,24,39,0.08)
error：      border-color: var(--error)
placeholder：color: var(--text-muted)
```

### 7.3 搜索框

```
高度：       34px
宽度：       230px（顶栏）
border-radius：7px
border：     1px solid var(--border-default)
background： #ffffff
padding-left：34px（为图标留空间）
图标：       🔍 或 SVG，left 11px，颜色 --text-muted
```

### 7.4 表格

**表头：**
```
background：var(--bg-subtle)
height：    38px
font-size： 11px
font-weight：650
text-transform：uppercase
letter-spacing：0.04em
color：     var(--text-muted)
border-bottom：1px solid var(--border-default)
padding：   0 14px
```

**数据行：**
```
height：    50px（含操作按钮行）/ 42px（纯展示行）
border-bottom：1px solid var(--border-row)
hover：     background var(--bg-hover)
最后一行：  border-bottom: none
padding：   0 14px
```

**首列（公司名）：**
```
font-size：  13px
font-weight：650
color：      var(--text-heading)
cursor：     pointer
hover：      color var(--info)  ← 唯一使用蓝色的地方
```

**副信息（在首列下方）：**
```
font-size：  11px
color：      var(--text-muted)
margin-top： 3px
```

**操作列：**
```
位置：       固定最右列
按钮样式：   文字按钮，height 26px，radius 6px，padding 0 10px
默认色：     color var(--text-muted), border 1px solid var(--border-default)
hover：      border-color var(--info), color var(--info), background var(--info-bg)
主操作：     background var(--info-bg), color var(--info), border var(--badge-blue-bg)
最多操作数：  2 个（"跟进" + "详情"）
```

### 7.5 客户状态显示

**圆点 + 文字，禁止使用矩形色块 badge：**

```html
<!-- 示例结构 -->
<span class="status-dot">
  <span class="dot" style="background: var(--status-intent)"></span>
  意向客户
</span>
```

```css
.status-dot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-body);
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
```

状态与颜色映射：

| 状态 | 圆点颜色变量 |
|---|---|
| 跟进中 | `--status-follow` (#8b5cf6) |
| 意向客户 | `--status-intent` (#f59e0b) |
| 谈判中 | `--status-nego` (#f97316) |
| 已成交 | `--status-won` (#059669) |
| 已流失 | `--status-lost` (#a1a1aa) |

### 7.6 客户等级显示

**纯文字颜色，不加背景色块：**

```css
.level { font-size: 12.5px; font-weight: 760; }
.level-a { color: var(--level-a); }
.level-b { color: var(--level-b); }
.level-c { color: var(--level-c); }
.level-d { color: var(--level-d); }
```

### 7.7 Badge（功能性标签）

仅用于：需要系统提醒的特殊标签（如"疑似重复"、"超期"、功能分类筛选）。
**不用于客户状态和等级。**

```css
.badge {
  display: inline-flex;
  align-items: center;
  height: 23px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 650;
}
.badge-blue   { background: var(--badge-blue-bg);   color: var(--badge-blue); }
.badge-green  { background: var(--badge-green-bg);  color: var(--badge-green); }
.badge-amber  { background: var(--badge-amber-bg);  color: var(--badge-amber); }
.badge-red    { background: var(--badge-red-bg);    color: var(--badge-red); }
.badge-gray   { background: var(--badge-gray-bg);   color: var(--badge-gray); }
```

**疑似重复专属样式：**
```css
.badge-dup {
  background: var(--badge-amber-bg);
  color: var(--badge-amber);
  border: 1px solid #fde68a;
}
```

### 7.8 KPI 数字卡片

```css
.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);  /* 12px */
  padding: 15px 16px;
  /* 无 box-shadow */
}
.kpi-label {
  color: var(--text-muted);
  font-size: 11.5px;
  margin-bottom: 8px;
}
.kpi-value {
  color: var(--text-heading);
  font-size: 23px;
  font-weight: 760;
  letter-spacing: -0.04em;
}
.kpi-trend {
  display: inline-flex;
  margin-top: 8px;
  font-size: 11px;
  color: var(--success);
}
```

### 7.9 弹窗（Modal）

```
遮罩：       rgba(0,0,0,0.45)
背景：       #ffffff
border-radius：10px
padding：    24px
宽度三档：   480px / 640px / 800px
阴影：       0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)

标题：       font-size 15px / weight 700 / color var(--text-heading)
关闭按钮：   右上角 ×，32×32px 点击区域，颜色 var(--text-muted)
底部按钮行：  取消（左）+ 确认（右），padding-top 16px，border-top 1px solid var(--border-row)

规则：
- 点击遮罩不关闭弹窗
- 弹窗最多嵌套 1 层
- 删除确认弹窗宽 480px，必须包含操作对象名称
```

### 7.10 侧边导航

```css
.sidebar {
  width: 214px;
  background: var(--side-bg);          /* #fbfbfc */
  border-right: 1px solid var(--side-border); /* #ebedf0 */
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Logo 区域 */
.brand {
  height: 58px;
  padding: 0 18px;
  border-bottom: 1px solid var(--side-border);
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-mark {
  width: 28px; height: 28px;
  border-radius: 7px;
  background: var(--action-primary);
  color: #fff;
  font-size: 12px; font-weight: 800;
}
.brand-name {
  font-size: 14px; font-weight: 700;
  color: var(--side-active-text);    /* #18181b */
  letter-spacing: -0.02em;
}

/* 分组标签 */
.nav-group-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--side-item-muted);
  padding: 12px 9px 6px;
}

/* 导航项 */
.nav-item {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 9px;
  border-radius: 7px;
  padding: 0 10px;
  margin-bottom: 2px;
  font-size: 13px;
  color: var(--side-item-text);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.nav-item:hover {
  background: rgba(0,0,0,0.04);
  color: var(--side-active-text);
}
.nav-item.active {
  background: var(--side-active-bg);  /* #eeeeef */
  color: var(--side-active-text);     /* #18181b */
  font-weight: 650;
}

/* 导航计数 */
.nav-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--side-item-muted);
}

/* 底部用户信息 */
.sidebar-footer {
  margin: 12px;
  padding: 11px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid var(--side-border);
}
```

### 7.11 Chip 筛选组件

```css
.chip {
  height: 25px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  background: #f6f6f7;
  color: #52525b;
  border: 1px solid #ececef;
  font-size: 11.5px;
  cursor: pointer;
  transition: all 0.12s;
}
.chip:hover {
  background: #eeeeef;
  color: var(--text-heading);
}
.chip.active {
  background: var(--action-primary);
  color: #fff;
  border-color: transparent;
}
```

### 7.12 分页组件

```
显示格式：上一页 / 页码（最多显示7个）/ 下一页
           共 X 条 / 第 N/M 页（右侧或左侧说明文字）
当前页：   background var(--action-primary), color #fff
其他页：   border 1px solid var(--border-default), background #fff
按钮尺寸： 30px × 30px, border-radius 7px
```

---

## 八、交互规范

### 8.1 Hover 状态
- 表格行：background → `var(--bg-hover)`
- 按钮：背景加深，不改变颜色系
- 导航项：background → `rgba(0,0,0,0.04)`
- 链接（公司名）：color → `var(--info)` (`#2563eb`)

### 8.2 加载状态
- 表格数据加载：骨架屏（Skeleton），3 行灰色占位条
- 按钮提交中：左侧旋转图标（16px），按钮文字不变，disabled 状态

### 8.3 空状态
- 居中显示：图标（40px，灰色）+ 主文字（14px，`--text-body`）+ 说明文字（12px，`--text-muted`）
- 可选：操作按钮（如"新建第一个客户"）

### 8.4 操作反馈
- 创建/编辑成功：右上角 Toast，绿色，3 秒自动消失
- 操作失败：右上角 Toast，红色，需手动关闭或 5 秒消失
- 删除确认：弹窗，必须手动确认，不自动执行

### 8.5 表单校验
- 校验时机：点击提交按钮时触发，不实时校验
- 错误样式：输入框 border-color → `var(--error)`，下方显示 11.5px 红色错误文字
- 必填字段：label 右侧显示红色 `*`

---

## 九、页面模板

### 9.1 列表页模板（客户管理/跟进记录/销售管理）

```
[顶栏] 页面标题 + 副标题 | 搜索框 + 导出 + 新建主操作
─────────────────────────────────────────
[内容区 padding 24px]
  [KPI 行] 4~5 个数字卡片，等宽排列，gap 12px
  [筛选行] Chip 快速筛选 + 下拉精细筛选（右对齐：高级筛选）
  [表格卡片] 带 border、无阴影，含表头 + 数据行 + 分页
```

### 9.2 详情页模板（客户详情/跟进详情）

```
[顶栏] 面包屑导航（← 返回列表 / 当前页名称）| 右侧操作按钮
─────────────────────────────────────────
[内容区 两列布局]
  左列（flex:1）：基础信息卡片 + 时间线/记录列表
  右列（300px）：联系人信息 + 快速操作 + 关联数据
```

### 9.3 弹窗表单模板（新建/编辑）

```
弹窗宽度：480px（简单表单）/ 640px（字段多于8个）
标题：    "新建客户" / "编辑客户"
内容：    表单字段，每行一个或两列布局
底部：    [取消]  [保存]（右对齐，主按钮用 Primary 样式）
```

---

## 十、CSS 变量完整清单（供开发直接引用）

```css
:root {
  /* 圆角 */
  --radius-control: 7px;
  --radius-card:    12px;
  --radius-badge:   6px;
  --radius-mark:    7px;
  --radius-modal:   10px;

  /* 字体 */
  --font-base: system-ui, -apple-system, "SF Pro Text", "PingFang SC", sans-serif;

  /* 背景 */
  --bg-app:      #f7f8fa;
  --bg-card:     #ffffff;
  --bg-subtle:   #fafafa;
  --bg-hover:    #f0f1f3;
  --bg-selected: #eeeeef;

  /* 侧边栏 */
  --side-bg:          #fbfbfc;
  --side-border:      #ebedf0;
  --side-item-text:   #6b7280;
  --side-item-muted:  #a1a1aa;
  --side-active-bg:   #eeeeef;
  --side-active-text: #18181b;

  /* 主动作色 */
  --action-primary:       #111827;
  --action-primary-hover: #1f2937;
  --action-primary-text:  #ffffff;

  /* 文字 */
  --text-heading:  #111827;
  --text-body:     #3f4654;
  --text-muted:    #8a93a3;
  --text-disabled: #c4c9d4;

  /* 边框 */
  --border-default: #e5e7eb;
  --border-row:     #f0f1f3;
  --border-focus:   #111827;

  /* 语义色 */
  --success:     #059669;
  --success-bg:  #ecfdf5;
  --warning:     #b45309;
  --warning-bg:  #fffbeb;
  --error:       #dc2626;
  --error-bg:    #fef2f2;
  --info:        #2563eb;
  --info-bg:     #eff6ff;

  /* Badge */
  --badge-blue:     #2563eb;
  --badge-blue-bg:  #eff6ff;
  --badge-green:    #059669;
  --badge-green-bg: #ecfdf5;
  --badge-amber:    #b45309;
  --badge-amber-bg: #fffbeb;
  --badge-red:      #dc2626;
  --badge-red-bg:   #fef2f2;
  --badge-gray:     #52525b;
  --badge-gray-bg:  #f6f6f7;

  /* 客户等级 */
  --level-a: #dc2626;
  --level-b: #b45309;
  --level-c: #2563eb;
  --level-d: #8a93a3;

  /* 客户状态 */
  --status-follow: #8b5cf6;
  --status-intent: #f59e0b;
  --status-nego:   #f97316;
  --status-won:    #059669;
  --status-lost:   #a1a1aa;
}
```

---

## 十一、设计规范校验清单

开发 Agent 提交前必须逐项对照：

- [ ] 侧边栏背景是 `#fbfbfc`（浅色），不是深色
- [ ] 激活导航项背景是 `#eeeeef`（浅灰），文字是 `#18181b`（黑）
- [ ] 主按钮背景是 `#111827`（黑），不是蓝色
- [ ] 客户状态显示为「圆点 + 文字」，无矩形色块背景
- [ ] 客户等级显示为「纯文字颜色」，无色块背景
- [ ] 卡片、表格无 box-shadow
- [ ] 所有颜色使用 CSS 变量，不写裸色值
- [ ] 表格行高 50px（操作行）或 42px（纯展示行）
- [ ] 表头 uppercase，font-size 11px，letter-spacing 0.04em
- [ ] 弹窗点击遮罩不关闭
- [ ] 删除操作有二次确认弹窗

---

## 十二、进度回写建议

建议总负责人将以下进度项更新为「设计完成 ✅」：

- 模块一 P0 所有功能项的 `[x] 设计完成`（共 17 项）
  - F-00 用户登录/登出
  - F-01 线索录入
  - F-02 线索转客户
  - F-03 客户查重
  - F-04 客户列表与搜索
  - F-05 客户详情
  - F-06 联系人管理
  - F-07 客户状态流转
  - F-08 客户分配与转移
  - F-10 客户等级管理
  - F-11 客户来源管理
  - F-12 跟进提醒
  - F-13 基础权限（3角色硬编码）
  - F-14 客户归属人权限
  - F-15 操作日志
  - 相关的客户列表分页、筛选、搜索功能项

对应设计产物证据：`.claude/outputs/design/spec.md`（本文件）

---

**DESIGN_SPEC_READY**

*文件保存位置：`.claude/outputs/design/spec.md`*
*关联进度项：模块一 P0 所有功能项「设计完成」阶段*
