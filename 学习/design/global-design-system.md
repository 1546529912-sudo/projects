# Global Design System

## Overview

全局设计系统是所有产品和界面的统一设计语言基础，确保一致性、可扩展性和可维护性。

---

## 1. Design Tokens

### Colors

#### Primary Palette
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary-50` | `#F0F4FF` | Light backgrounds |
| `--color-primary-100` | `#D6E0FF` | Hover states |
| `--color-primary-500` | `#3B5BDB` | Primary actions |
| `--color-primary-600` | `#3451C7` | Pressed states |
| `--color-primary-900` | `#1E3A8A` | Dark text on light |

#### Neutral Palette
| Token | Value | Usage |
|-------|-------|-------|
| `--color-neutral-0` | `#FFFFFF` | Backgrounds |
| `--color-neutral-50` | `#F8F9FA` | Surface |
| `--color-neutral-100` | `#F1F3F5` | Subtle background |
| `--color-neutral-300` | `#DEE2E6` | Borders |
| `--color-neutral-500` | `#ADB5BD` | Placeholder text |
| `--color-neutral-700` | `#495057` | Secondary text |
| `--color-neutral-900` | `#212529` | Primary text |

#### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#2F9E44` | Success states |
| `--color-warning` | `#E67700` | Warning states |
| `--color-error` | `#C92A2A` | Error states |
| `--color-info` | `#1971C2` | Info states |

---

### Typography

#### Font Family
```
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
--font-mono: 'JetBrains Mono', 'Fira Code', monospace
--font-display: 'Inter Display', var(--font-sans)
```

#### Type Scale
| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `--text-xs` | 12px | 16px | 400 | Captions, labels |
| `--text-sm` | 14px | 20px | 400 | Body small |
| `--text-base` | 16px | 24px | 400 | Body |
| `--text-lg` | 18px | 28px | 400 | Body large |
| `--text-xl` | 20px | 28px | 500 | Subheading |
| `--text-2xl` | 24px | 32px | 600 | Heading 4 |
| `--text-3xl` | 30px | 36px | 600 | Heading 3 |
| `--text-4xl` | 36px | 40px | 700 | Heading 2 |
| `--text-5xl` | 48px | 52px | 700 | Heading 1 |
| `--text-6xl` | 60px | 64px | 800 | Display |

---

### Spacing

基于 4px 基础单位的间距系统。

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Micro spacing |
| `--space-2` | 8px | Tight spacing |
| `--space-3` | 12px | Small spacing |
| `--space-4` | 16px | Base spacing |
| `--space-5` | 20px | Medium spacing |
| `--space-6` | 24px | Large spacing |
| `--space-8` | 32px | XL spacing |
| `--space-10` | 40px | 2XL spacing |
| `--space-12` | 48px | 3XL spacing |
| `--space-16` | 64px | 4XL spacing |
| `--space-20` | 80px | Section spacing |
| `--space-24` | 96px | Page spacing |

---

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Subtle rounding |
| `--radius-md` | 8px | Standard components |
| `--radius-lg` | 12px | Cards, modals |
| `--radius-xl` | 16px | Large cards |
| `--radius-2xl` | 24px | Feature sections |
| `--radius-full` | 9999px | Pills, avatars |

---

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.1)` | Inputs, dropdowns |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` | Cards |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.1)` | Popovers |

---

## 2. Grid System

### Breakpoints
| Name | Min Width | Usage |
|------|-----------|-------|
| `xs` | 0px | Mobile portrait |
| `sm` | 480px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Wide desktop |
| `2xl` | 1536px | Ultra-wide |

### Column Grid
- Mobile: 4 columns, 16px gutter, 16px margin
- Tablet: 8 columns, 24px gutter, 32px margin
- Desktop: 12 columns, 24px gutter, 64px margin

---

## 3. Component Library

### Atoms
- Button (Primary, Secondary, Ghost, Danger)
- Input (Text, Password, Search, Textarea)
- Checkbox, Radio, Toggle
- Badge, Tag, Chip
- Avatar, Icon
- Divider, Skeleton

### Molecules
- Form Field (Label + Input + Error)
- Search Bar
- Card
- Alert / Toast
- Tooltip, Popover
- Dropdown Menu
- Breadcrumb
- Pagination

### Organisms
- Navigation Bar
- Sidebar
- Data Table
- Modal / Dialog
- Form
- Hero Section
- Footer

---

## 4. Accessibility

- 所有颜色组合需通过 WCAG AA 对比度标准（4.5:1 正文，3:1 大文字）
- 所有交互组件需支持键盘操作
- 使用语义化 HTML 标签
- 图标需配合文字或 `aria-label`
- Focus 状态需清晰可见（2px outline）

---

## 5. Dark Mode

所有 token 需提供 light/dark 两套映射：

```css
:root {
  --bg-primary: var(--color-neutral-0);
  --text-primary: var(--color-neutral-900);
}

[data-theme="dark"] {
  --bg-primary: #0D1117;
  --text-primary: var(--color-neutral-50);
}
```

---

## 6. Update Log

| Date | Version | Change |
|------|---------|--------|
| 2026-05-06 | 1.0.0 | Initial system setup |
