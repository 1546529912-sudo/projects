# Pencil MCP Canvas Rules

These are hard rules for creating or modifying Pencil canvas designs through MCP or Pencil extension tools.

## 1. Inspect before edit

Before editing an existing `.pen` file, inspect:

- Current editor state.
- Open file.
- Page list.
- Current page.
- Current selection.
- Canvas hierarchy.
- Variables.
- Components.
- Existing layout conventions.
- Existing naming conventions.

If the user says “this,” “selected element,” “current page,” or “this frame,” read current selection/context before editing.

## 2. Multi-platform file organization

For multi-platform projects, use this page structure when relevant:

```text
00_Project_Overview
01_IA_UserRoles_Flows
02_Web_Admin
03_Web_Responsive
04_Mobile_App
05_WeChat_MiniProgram
06_Data_BigScreen
07_Ecommerce_Campaign
08_Design_System
09_CrossPlatform_Mapping
10_States_And_Errors
11_Handoff_Notes
```

Do not create every page if unnecessary. Create only pages relevant to the task.

## 3. Page rules

Every meaningful scenario should have a Page.

Examples:

```text
01_Flow_Main
02_Screens_Desktop
03_Screens_Mobile
04_Components
05_States
06_Exploration_A
07_Exploration_B
08_Handoff_Notes
```

## 4. Frame rules

Every screen must be inside a named top-level Frame.

Frame name pattern:

```text
[Platform]_[screen-name]_[state-or-variant]
```

Examples:

```text
WebAdmin_AssetList_Default
WebAdmin_AssetList_BatchSelected
MobileApp_WorkOrderDetail_Default
MiniProgram_RepairSubmit_Form
BigScreen_EnergyDashboard_1920
Ecommerce_ProductDetail_Campaign
DesignSystem_Button_States
```

Recommended dimensions:

```text
Desktop web: 1440 × 1024
Desktop app/dashboard: 1440 × 900
Mobile iOS: 390 × 844
Mobile Android: 360 × 800
WeChat Mini Program: 375 × 812 or 390 × 844
Tablet: 834 × 1194
Presentation slide: 1920 × 1080
Big screen: 1920 × 1080 or 3840 × 2160
E-commerce banner: 1920 × 600
Marketplace main image: 1000 × 1000
Product card: 360 × 480
```

Use the user's requested size when specified.

## 5. Layer naming rules

Never leave generic names:

```text
Rectangle 1
Group 2
Text 5
Frame 33
Image 12
```

Use semantic names:

```text
Header / Navigation
Hero / Headline
Hero / PrimaryCTA
ProductCard / Price
FilterPanel / CategoryList
Form / EmailInput
Modal / ConfirmDelete
Toast / Success
Chart / EnergyTrend
MiniProgram / CapsuleSafeArea
Mobile / BottomTabBar
```

Layer names should explain purpose, not visual shape.

## 6. Grouping and hierarchy rules

Use meaningful containment:

```text
Page
└── WebAdmin_AssetList_Default
    ├── AdminLayout
    ├── PageHeader
    ├── FilterBar
    ├── DataTable
    ├── BatchActionBar
    └── Pagination
```

Avoid:

- Deep meaningless nesting.
- Random groups.
- Ungrouped repeated elements.
- Detached text and shapes.
- Flattened UI screenshots as final editable design.

## 7. Variable / token rules

Before detailed UI work, establish or reuse tokens.

Minimum token groups:

```text
color/bg/default
color/bg/subtle
color/bg/elevated
color/text/primary
color/text/secondary
color/text/inverse
color/border/default
color/brand/primary
color/brand/secondary
color/semantic/success
color/semantic/warning
color/semantic/error
color/semantic/info

type/display
type/h1
type/h2
type/h3
type/body
type/body-strong
type/caption
type/button
type/data-large
type/data-small

space/4
space/8
space/12
space/16
space/24
space/32
space/48
space/64

radius/4
radius/8
radius/12
radius/16
radius/24

shadow/small
shadow/medium
shadow/large
stroke/default
stroke/focus
```

If `.pen` or codebase already has tokens, reuse them instead of duplicating.

## 8. Component rules

Create reusable components for repeated UI:

- Button.
- Input.
- Select.
- Checkbox.
- Radio.
- Search field.
- Card.
- Product card.
- Navigation item.
- Sidebar item.
- Tab.
- Badge.
- Modal.
- Toast.
- Banner.
- Table row.
- KPI card.
- Empty state.
- Error state.
- Mobile tab bar item.
- Mini Program navigation bar.
- Chart card.

Component naming:

```text
Component/Button/Primary
Component/Input/Search
Component/Card/Product
Component/DataTable/Row
Component/Mobile/BottomTabItem
Component/MiniProgram/NavBar
Component/BigScreen/KpiCard
Component/Chart/TrendCard
```

Do not redraw repeated elements manually.

## 9. State and variant rules

Important components should include relevant states:

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
empty
readonly
no-permission
```

Include platform-specific states where relevant.

## 10. Placeholder rules

Use clearly named placeholders:

```text
ImagePlaceholder / ProductMain
ImagePlaceholder / UserAvatar
CopyPlaceholder / HeroHeadline
CopyPlaceholder / ProductDescription
DataPlaceholder / KPIValue
LogoPlaceholder / Brand
MapPlaceholder / BuildingFloor
ChartPlaceholder / EnergyTrend
```

Do not invent fake brand claims, fake prices, fake testimonials, fake legal copy, or fake product certifications unless labeled placeholder.

## 11. Annotation rules

Use annotations only for product review or engineering handoff:

```text
Annotation / Interaction
Annotation / DataRule
Annotation / OpenQuestion
Annotation / PermissionRule
Annotation / ResponsiveRule
```

Keep annotations separate from final UI.

## 12. Final structure check

Before reporting completion, inspect:

- Page names.
- Frame names.
- Layer names.
- Component reuse.
- Variable usage.
- State coverage.
- Layout sanity.
- Placeholder clarity.
- Platform mode requirements.

## 13. Batch operation reference rules

When using `batch_design`, follow `references/09-pencil-batch-design-rules.md`.

Hard rules:

- Do not invent `#` prefixes for existing node IDs.
- Bind newly created nodes if they will be referenced later.
- Read existing nodes before updating them.
- Use exact node references returned by inspection tools.
- Split high-risk operations into small logical batches.
- If an operation fails with `binding variable ... not found`, fix references before retrying.
