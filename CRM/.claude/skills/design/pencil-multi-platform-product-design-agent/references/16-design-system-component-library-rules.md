# Design System / Component Library Rules

Use for design systems, component libraries, tokens, multi-platform UI standards, enterprise admin components, mobile components, mini program components, big screen components, and cross-platform design foundations.

## 1. Core principle

A design system should make product design consistent, reusable, scalable, and implementation-friendly.

Design order:

```text
Product scope
→ Platforms
→ Token system
→ Component inventory
→ State matrix
→ Usage examples
→ Cross-platform adaptation
→ Pencil canvas generation
```

## 2. Required intake

Identify:

- Product/platform scope.
- Existing brand/tokens.
- Codebase tokens/components.
- Required platforms.
- Required components.
- Density needs.
- Accessibility needs.
- Handoff target: designers, developers, PMs.

## 3. Token groups

Minimum:

```text
Color
Typography
Spacing
Radius
Shadow
Stroke
Opacity
Z-index / elevation
Motion if relevant
```

Color semantic groups:

```text
brand
background
text
border
surface
semantic/success
semantic/warning
semantic/error
semantic/info
data-visualization
```

Typography groups:

```text
display
h1
h2
h3
body
body-strong
caption
button
data-large
data-small
mobile-title
bigscreen-kpi
```

## 4. Component inventory

Core:

```text
Button
Input
Select
Checkbox
Radio
Switch
Search
Tabs
Badge
Tag
Toast
Modal
Drawer
Tooltip
Card
Table
Pagination
EmptyState
ErrorState
LoadingState
```

Platform-specific:

```text
AdminLayout
DataTable
FilterPanel
MobileNavBar
BottomTabBar
MiniProgramNavBar
CapsuleSafeArea
KpiCard
ChartCard
ProductCard
PriceBlock
CampaignBanner
```

## 5. State matrix

For each component where relevant:

```text
default
hover
active
focus
disabled
loading
selected
error
success
readonly
empty
```

## 6. Usage examples

For each major component include:

- Anatomy.
- Variants.
- States.
- Do / Don't.
- Usage context.
- Platform notes.
- Implementation notes when relevant.

## 7. Pencil organization

Recommended pages:

```text
00_DS_Overview
01_Tokens_Color
02_Tokens_Typography
03_Tokens_Spacing_Radius_Shadow
04_Components_Core
05_Components_Admin
06_Components_Mobile
07_Components_MiniProgram
08_Components_BigScreen
09_Components_Ecommerce
10_StateMatrix
11_UsageExamples
12_Handoff
```

## 8. Quality checklist

- Tokens are semantic, not arbitrary.
- Components have variants and states.
- Components map to code if applicable.
- Multi-platform differences are explicit.
- Examples show real usage.
- No duplicate or conflicting token names.
