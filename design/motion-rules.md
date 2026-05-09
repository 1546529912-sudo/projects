# Motion Rules

## 核心原则

- **有意义** — 动效服务于功能，不是装饰
- **快速** — 界面动效不超过 400ms，响应动效不超过 150ms
- **自然** — 使用缓动曲线，避免线性运动
- **克制** — 同一时间只有一个主要动效

---

## 1. 时长标准

| 类型 | 时长 | 场景 |
|------|------|------|
| Instant | 0ms | 状态切换（颜色/边框） |
| Fast | 100ms | 微交互（hover、focus） |
| Normal | 200ms | 小组件出现/消失 |
| Medium | 300ms | 模态框、菜单、侧栏 |
| Slow | 400ms | 页面切换、大区域变换 |
| Very Slow | 500-600ms | 首屏动画、特殊强调 |

原则：移动端适当缩短 20%，避免感觉迟钝。

---

## 2. 缓动曲线

### 标准曲线
```
ease-out:    cubic-bezier(0, 0, 0.2, 1)   — 元素进入（快进慢出）
ease-in:     cubic-bezier(0.4, 0, 1, 1)   — 元素离开（慢进快出）
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1) — 状态切换
spring:      cubic-bezier(0.34, 1.56, 0.64, 1) — 弹性效果
```

### 使用场景
| 曲线 | 使用场景 |
|------|---------|
| ease-out | Drawer 展开、Modal 出现、元素滑入 |
| ease-in | Drawer 收起、Modal 关闭、元素滑出 |
| ease-in-out | Tab 切换、颜色过渡 |
| spring | 点赞、收藏、成功反馈 |

---

## 3. 进入 / 离开动效

### 标准进入（从下方）
```css
from: { opacity: 0, transform: translateY(16px) }
to:   { opacity: 1, transform: translateY(0) }
duration: 300ms, ease-out
```

### 标准离开
```css
from: { opacity: 1, transform: translateY(0) }
to:   { opacity: 0, transform: translateY(8px) }
duration: 200ms, ease-in
```

### 从侧面（Drawer / Sidebar）
```css
进入: translateX(100%) → translateX(0), 300ms, ease-out
离开: translateX(0) → translateX(100%), 250ms, ease-in
```

### 缩放（Modal / Popover）
```css
进入: scale(0.95) opacity(0) → scale(1) opacity(1), 200ms, ease-out
离开: scale(1) opacity(1) → scale(0.95) opacity(0), 150ms, ease-in
```

---

## 4. 微交互

### Hover
- 背景色：transition 150ms ease
- 阴影提升：transition 200ms ease
- 图标位移：translateX(4px)，200ms ease-out

### Focus
- outline 出现：0ms（即时）
- 颜色变化：150ms ease

### 按钮点击
- Active 缩放：scale(0.97)，100ms ease
- 恢复：scale(1)，150ms ease-out

### 开关 (Toggle)
- 滑块位移：200ms spring
- 背景色：150ms ease

---

## 5. 列表 / 网格动效

### Stagger（错开）
列表项依次出现，每项延迟 `index * 60ms`，最大延迟不超过 400ms。

```
item 0: delay 0ms
item 1: delay 60ms
item 2: delay 120ms
...
item 6+: delay 360ms (封顶)
```

### 列表增删
- 新增：fadeInDown，200ms
- 删除：fadeOut + height collapse，300ms

---

## 6. 页面切换

### SPA 路由切换
```
离开页面: fadeOut 150ms ease-in
进入页面: fadeInUp 300ms ease-out，delay 50ms
```

### Tab 切换
- 内容区：crossfade 200ms ease-in-out
- 指示条：translateX，200ms ease-in-out

---

## 7. 滚动动效

### 视口进入（Scroll Reveal）
```css
初始: opacity 0, translateY(24px)
进入: opacity 1, translateY(0)
触发: IntersectionObserver，threshold 0.1
时长: 500ms, ease-out
```

### 视差（Parallax）
- 仅用于 Hero 背景层
- 移动速度：主内容 1x，背景层 0.5x
- 移动端禁用视差

---

## 8. 加载动画

### Skeleton Pulse
```css
animation: pulse 1.5s ease-in-out infinite;
opacity: 0.5 → 1 → 0.5
```

### Spinner
- 尺寸：16px（小）/ 24px（中）/ 32px（大）
- 转速：0.7s per revolution
- 颜色：当前主色

---

## 9. 特殊动效

### 成功反馈
- Checkmark 描边动画：400ms，stroke-dashoffset
- 配合：scale(1.1) → scale(1)，spring

### 错误抖动
```css
animation: shake 300ms ease-in-out
keyframes: 0% 0px, 25% -6px, 50% 6px, 75% -3px, 100% 0px
```

### 数字变化
- 使用 counter 动画从旧值滚动到新值
- 时长：600ms，ease-out

---

## 10. 禁用动效

当用户系统开启「减少动画」时：
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## Update Log

| Date | Version | Change |
|------|---------|--------|
| 2026-05-06 | 1.0.0 | Initial |
