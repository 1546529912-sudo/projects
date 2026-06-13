# Design System 文档索引

本目录包含完整的设计系统文档，覆盖视觉规范、交互规则、品牌体系和 AI 协作规范。

---

## 文件概览

### [global-design-system.md](./global-design-system.md)
**全局设计系统**

所有产品和界面的统一设计语言基础。

- **Design Tokens**：颜色（主色/中性色/语义色）、字体（Inter 家族）、间距（4px 基础网格）、圆角、阴影
- **网格系统**：6 档断点（xs~2xl），移动端 4列 / 平板 8列 / 桌面 12列
- **组件库**：Atoms（按钮/输入框/徽章）→ Molecules（卡片/Toast/弹窗）→ Organisms（导航/表格/表单）
- **可访问性**：WCAG AA 对比度、键盘操作、语义化 HTML、焦点样式
- **暗色模式**：完整 light/dark token 双映射方案

---

### [portfolio-design-system.md](./portfolio-design-system.md)
**作品集专属设计系统**

基于全局系统扩展，面向个人作品集网站的专项规范。

- **品牌色**：主调 Indigo `#6366F1` + 暖调 Amber `#F59E0B`，各版块配色独立定义
- **字体处理**：大标题负字距（-2px），章节用 `01 /` 编号前缀，正文限宽 68ch
- **布局模式**：Hero（全屏）/ 项目网格（2列 16:10）/ Case Study（正文 800px，全宽图 1200px）
- **项目卡片**：封面图 + 标签 + 标题 + 描述 + 年份角色，三态交互（hover 放大 + 阴影）
- **Case Study 结构**：8 段标准模板（Hero → Overview → Research → Define → Design → Solution → Impact → Reflection）
- **响应式**：标题字号、网格、内边距在三个断点的具体取值

---

### [ui-rules.md](../ui-rules.md)
**UI 设计规则**

界面设计的执行层规范，约束日常决策。

- **间距**：强制 4px 网格，相关元素小间距，不相关元素大间距
- **颜色**：主色只用于 1-2 个核心操作，禁纯黑文字，语义色不用于装饰
- **字体**：一页最多 2 种字重，正文最小 14px，行高 1.6-1.75
- **按钮**：层级（Primary 唯一 / Secondary / Ghost）+ 3 档尺寸 + 5 种状态
- **表单**：Label 必须在 Input 上方，错误内联显示，必填标 `*`
- **图标**：统一图标库（Lucide/Phosphor），3 档尺寸，单独使用需加 aria-label
- **空状态**：必须含插图 + 标题 + 描述，可选 CTA
- **加载/错误**：分场景规范（页面级 Skeleton / 按钮级 Spinner / 错误 Toast）

---

### [motion-rules.md](./motion-rules.md)
**动效规则**

动画设计的时间、曲线和触发机制规范。

- **时长标准**：6 档（0ms 即时 → 100ms 微交互 → 600ms 特殊动画），移动端缩短 20%
- **缓动曲线**：4 条标准曲线（ease-out 进入 / ease-in 离开 / ease-in-out 切换 / spring 弹性）
- **进出场**：标准 fadeInUp（translateY 16px + opacity），侧边 translateX，Modal 缩放
- **微交互**：Hover 150ms / Focus 即时 / 按钮点击 scale(0.97) / Toggle spring 弹性
- **列表错开**：每项 delay `index * 60ms`，最大封顶 400ms
- **滚动动效**：IntersectionObserver 触发，translateY 24px → 0，500ms
- **可访问性**：`prefers-reduced-motion` 全局降级为 0.01ms

---

### [prompt-rules.md](./prompt-rules.md)
**Prompt 编写规范**

规范 AI 生成场景下的 Prompt 结构，确保输出质量可控可复现。

- **基本结构**：角色设定 + 任务描述 + 约束条件 + 输出格式（+ 可选示例）
- **角色库**：5 类常用角色（UI 设计 / UX Writer / 前端工程师 / 产品经理 / 品牌策略）
- **任务描述**：一次一件事，动词开头，提供用户/场景/目标，禁用模糊词
- **约束分类**：内容约束（字数/禁词）/ 风格约束（语气/禁忌）/ 技术约束（平台/库/规范）
- **输出格式**：明确指定 Markdown / 表格 / JSON / 纯代码，不留给模型自由发挥
- **设计生成**：UI 组件 Prompt 模板（含状态/尺寸/token 约束）
- **文案生成**：产品文案 + 错误提示专项模板
- **迭代规则**：修正用 "保持 X，修改 Y" 句式，最多迭代 3 次

---

### [brand-system.md](./brand-system.md)
**品牌系统**

个人品牌的完整视觉和声音语言规范。

- **品牌核心**：定位（设计师 + AI产品人）、4 个关键词（专业/清晰/有温度/前瞻）
- **Logo 规范**：3 种类型（完整/图形/文字），最小尺寸、安全间距、6 条禁止用法
- **色彩体系**：主色 Indigo `#6366F1` + 辅助色 Amber/Slate/Emerald，70-20-10 配色比例
- **字体系统**：中文 PingFang SC / 英文 Inter / 代码 JetBrains Mono，9 档排版层级
- **Voice & Tone**：品牌个性对照表（是/不是），3 种场景语气（正式/内容/社交），5 条写作原则
- **图像风格**：摄影（高对比冷调）/ 插图（线性几何 1.5px 描边）/ 截图（深色 Mockup）
- **触点应用**：个人网站 / 简历 / LinkedIn / GitHub / 公众号 / 邮件签名 的差异化规范

---

## 使用说明

1. 新建设计时，先查 `global-design-system.md` 确认 token 使用
2. 作品集相关改动，参考 `portfolio-design-system.md` 的布局和组件规范
3. 具体组件细节（状态、尺寸、规则）查 `ui-rules.md`
4. 涉及动画效果，对照 `motion-rules.md` 选取时长和曲线
5. 使用 AI 生成设计/文案/代码时，按 `prompt-rules.md` 构建 Prompt
6. 品牌输出物（对外内容）遵守 `brand-system.md` 的声音和视觉规范
