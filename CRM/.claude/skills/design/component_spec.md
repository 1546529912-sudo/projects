# 组件规范方法 — CRM项目

## 适用场景
设计Agent输出组件规范，开发Agent按规范实现组件时使用。

---

## 规范原则

1. **一致性**：同一种组件在整个系统中外观和行为完全一致
2. **最小化**：只规范必要的视觉属性，不过度设计
3. **可测试**：每个规范条目必须可以被测试Agent检验

---

## 间距系统（Spacing）

使用4px为基础单位的间距系统：

```
spacing-1:  4px    极小间距（图标与文字之间）
spacing-2:  8px    小间距（列表项内部padding）
spacing-3:  12px   中小间距（标签内padding）
spacing-4:  16px   标准间距（卡片内padding、表单行间距）
spacing-5:  20px   中间距
spacing-6:  24px   大间距（模块间距、弹窗padding）
spacing-8:  32px   页面级间距（页面顶部padding）
spacing-10: 40px   超大间距（首屏留白）
```

---

## 字体规范（Typography）

```
字体族：system-ui, -apple-system, 'PingFang SC', sans-serif

标题H1：  24px / font-weight 600 / line-height 1.3  （页面主标题）
标题H2：  20px / font-weight 600 / line-height 1.4  （模块标题）
标题H3：  16px / font-weight 600 / line-height 1.4  （卡片标题）
正文：    14px / font-weight 400 / line-height 1.6  （表格内容、表单）
辅助文字：12px / font-weight 400 / line-height 1.5  （提示、说明）
数据大字：28px / font-weight 700 / line-height 1.2  （报表核心指标）
```

---

## 组件规范

### 1. 按钮（Button）

**尺寸规格：**
```
大按钮（lg）：  height 40px / padding 0 16px / font-size 14px
默认按钮：      height 32px / padding 0 12px / font-size 14px
小按钮（sm）：  height 24px / padding 0 8px  / font-size 12px
```

**圆角：** 6px（统一，所有按钮）

**状态：** 默认 / hover（背景加深10%）/ active（背景加深20%）/ disabled（opacity 0.4，cursor not-allowed）/ loading（spinner替换文字左侧）

**规则：**
- 同一区域最多出现1个主要按钮
- 危险操作（删除）必须有二次确认弹窗
- 按钮文字不超过6个字

---

### 2. 输入框（Input）

```
高度：       32px
border：     1px solid Gray-300
border-radius：6px
padding：    0 12px
focus状态：  border-color Primary-500，box-shadow 0 0 0 2px Primary-100
error状态：  border-color Error主色，提示文字显示在输入框下方
placeholder：Gray-400
```

**规则：**
- 必填字段在label右侧显示红色 * 号
- 错误提示在输入框正下方，12px红色文字
- 不使用placeholder代替label

---

### 3. 表格（Table）

```
表头：       背景 Gray-50 / 文字 Gray-700 / font-weight 500 / 高度 44px
普通行高：   48px（有操作按钮时）/ 40px（纯展示）
列间距：     padding 0 16px
边框：       1px solid Gray-200，只有水平分割线，无竖线
斑马纹：     不使用（用hover高亮替代）
空状态：     居中显示图标+文字"暂无数据"
加载状态：   骨架屏（skeleton），不用loading spinner覆盖整表
```

**操作列规则：**
- 操作按钮使用文字链接样式（text button）
- 危险操作（删除）显示为红色
- 操作列固定在最右侧，最多3个操作

**分页规则：**
- 默认每页20条
- 显示：上一页 / 页码 / 下一页 / 每页条数选择 / 共X条

---

### 4. 表单（Form）

```
布局：       垂直布局（label在上，input在下）
label：      12px Gray-700，margin-bottom 4px
行间距：     spacing-4（16px）
表单组间距：spacing-6（24px）
宽度：       输入框宽度跟随容器，最大宽度400px（单列）
```

**弹窗表单规范：**
- 弹窗宽度：480px（标准）/ 640px（复杂表单）
- 底部按钮：取消（左）+ 确认（右），固定在弹窗底部
- 必填校验：点击确认时触发，不实时校验

---

### 5. 弹窗（Modal）

```
遮罩：       rgba(0,0,0,0.45)
弹窗背景：   White
圆角：       8px
padding：    24px
标题：       H3字号，Gray-900
关闭按钮：   右上角 ×，点击区域 32×32px
宽度：       480px / 640px / 800px（三档）
```

**规则：**
- 弹窗最多嵌套1层（禁止弹窗内再弹弹窗）
- 点击遮罩不关闭弹窗（防止误操作）
- 删除确认弹窗：标题"确认删除"，说明文字，取消+删除按钮

---

### 6. 标签/状态Badge

```
padding：    2px 8px
border-radius：4px
font-size：  12px
font-weight：500
```

各状态用语义色规范中的颜色，参见 color_system.md。

---

### 7. 侧边导航（Sidebar）

```
宽度：       220px（展开）/ 64px（收起）
背景：       Gray-900（深色侧边栏）
菜单项高度： 44px
激活状态：   Primary-600背景，White文字
hover状态：  Gray-700背景
图标尺寸：   20px
```

**一级菜单：**
- 客户管理、跟进记录、销售管理、数据报表、系统设置

---

### 8. 页面布局

```
顶部导航高度：  56px
侧边栏宽度：    220px
内容区padding：24px
页面最大宽度：  不限（全宽布局）
```

---

## 响应式规范
当前版本仅支持桌面端，最小支持宽度 1280px，不做移动适配。

---

## 交付物检查清单
设计Agent输出组件规范时，必须包含：
- [ ] 所有组件的尺寸数值
- [ ] 所有状态（normal/hover/active/disabled/error）
- [ ] 颜色引用色彩规范中的变量名，不自定义新颜色
- [ ] 开发Agent可以不看设计稿直接按规范写代码
