# Example Prompts and Invocation Patterns

## 0. Short or incomplete prompt handling

When the user's prompt is short, use this pattern:

```text
Use the Pencil multi-platform product design agent skill.

The user request is incomplete. First run the Clarification / Intake Gate:
- identify blocking missing information
- ask 3–5 key questions at most
- offer fast-start assumptions
- do not create the Pencil canvas until blocking information is resolved
```

Example response for “帮我做一个页面”:

```text
我需要先确认几个关键点，避免画偏：

1. 这是 Web 后台、官网/落地页、App、小程序、大屏、电商页面，还是 PPT/HTML Deck？
2. 这个页面的主要目标是什么：管理、转化、监控、录入、审批、汇报，还是展示？
3. 目标用户是谁？
4. 有没有必须包含的内容、字段、数据、卖点或资料？

如果你想快速开始，我可以先按“Web 后台页面，1440×1024，专业企业风格，可编辑 Pencil 画布”推进。
```

## 1. Universal invocation

```text
Use the Pencil multi-platform product design agent skill.

Create an editable Pencil canvas design for:
[task]

Context:
- Product:
- Target user:
- Platform:
- Brand/style:
- Existing materials:
- Required pages/screens:
- Fidelity:
- Constraints:

Before drawing:
- detect host mode
- inspect current Pencil file and available tools
- route to the correct role/platform mode
- propose 2–3 directions if this is a large new task

After drawing:
- verify screenshot, layout, hierarchy, variables, components, and platform-specific rules.
```

## 2. Enterprise admin

```text
Use the Pencil multi-platform product design agent skill in Product Manager + Enterprise Admin / SaaS Dashboard Mode.

Design a Web management backend page for:
[模块 / 页面]

Business object:
[对象]

Users/roles:
[角色]

Fields:
[字段]

Actions:
[操作]

Permissions:
[权限]

Please first identify page type, field hierarchy, operation hierarchy, states, and components. Then propose 2–3 backend layout directions before creating the Pencil canvas.
```

## 3. Responsive web / landing page

```text
Use the Pencil multi-platform product design agent skill in Designer + Responsive Web / Landing Page Mode.

Create a responsive landing page for:
[产品 / 服务]

Audience:
[受众]

Goal:
[转化目标]

Required modules:
[首屏 / 功能 / 案例 / 价格 / FAQ / CTA]

Please define the narrative, section rhythm, CTA strategy, responsive layout, and then create editable Pencil frames.
```

## 4. Mobile app

```text
Use the Pencil multi-platform product design agent skill in Mobile App Mode.

Create an App flow for:
[功能]

Platform:
[iOS / Android / both]

Screens:
[页面]

Must include:
- safe area
- navigation
- bottom tab if relevant
- empty/loading/error states
- touch-friendly layout
- keyboard state if forms are included
```

## 5. WeChat Mini Program

```text
Use the Pencil multi-platform product design agent skill in WeChat Mini Program Mode.

Create a WeChat Mini Program flow for:
[场景]

Must consider:
- capsule safe area
- mini program nav bar
- tabBar if relevant
- WeChat login / phone authorization if relevant
- payment/share/subscription message if relevant
- lightweight page path
```

## 6. Data visualization big screen

```text
Use the Pencil multi-platform product design agent skill in Data Visualization Big Screen Mode.

Create a 1920×1080 big screen for:
[场景]

Data:
[指标 / 告警 / 地图 / 趋势 / 排名 / 实时状态]

Please first define KPI hierarchy, layout zones, alert priority, chart choices, refresh states, and distant-readability rules. Then create the Pencil canvas.
```

## 7. E-commerce / campaign

```text
Use the Pencil multi-platform product design agent skill in E-commerce / Campaign Mode.

Create designs for:
[商品 / 活动 / 平台]

Product info:
- Category:
- Audience:
- Selling points:
- Price/promotion:
- Trust signals:
- Platform:
- Required sizes:

Please prioritize selling points, propose 3 conversion directions, then create editable Pencil frames and reusable components.
```

## 8. Design system

```text
Use the Pencil multi-platform product design agent skill in Design System / Component Library Mode.

Create a Pencil design system for:
[产品 / 平台]

Need:
- color tokens
- typography tokens
- spacing/radius/shadow tokens
- components
- variants
- states
- usage examples
- multi-platform adaptation if relevant
```

## 9. Cross-platform product

```text
Use the Pencil multi-platform product design agent skill in Cross-platform Consistency Mode.

Design a multi-platform product experience for:
[业务对象 / 场景]

Platforms:
- Web Admin:
- Mobile App:
- WeChat Mini Program:
- Big Screen:

Please create:
- cross-platform object/action/status mapping
- platform responsibility split
- shared tokens/components
- platform-specific frames
- consistency verification
```

## 10. Modify selected element

```text
Use the Pencil multi-platform product design agent skill.

Modify the currently selected Pencil element:
[change]

Before editing:
- inspect editor state
- read current selection
- summarize the target

Then edit through Pencil tools and verify.
```


## 11. Presentation / Deck

```text
Use the Pencil multi-platform product design agent skill in Presentation / Deck Mode.

Create a presentation deck for:
[主题]

Audience:
[受众]

Goal:
[汇报目标 / 决策目标 / 说服目标]

Output format:
[Pencil canvas / HTML deck / PPTX-compatible / PDF-exportable]

Context:
[已有文档 / PRD / 数据 / 截图 / 品牌规范]

Please first create:
- audience and goal summary
- narrative arc
- slide outline
- per-slide core takeaway
- visual system direction
- output format assumptions

Then generate editable Pencil slide frames or an HTML-style deck structure.
```

## 12. HTML presentation deck

```text
Use the Pencil multi-platform product design agent skill in Presentation / Deck Mode.

I need an HTML-format presentation deck, not necessarily a .pptx file.

Topic:
[主题]

Audience:
[受众]

Style:
[风格]

Length:
[页数 / 时长]

Requirements:
- 16:9 slide structure
- slide sequence
- readable projection text
- consistent visual system
- optional speaker notes only if useful
- export-friendly layout

Please plan the outline first, then create the design structure.
```

## 13. Product proposal presentation

```text
Use the Pencil multi-platform product design agent skill in Product Manager + Presentation / Deck Mode.

Create a product proposal deck for:
[产品 / 功能 / 方案]

Please structure it as:
- problem
- user scenario
- current pain
- solution concept
- core flow
- key screens
- business value
- implementation plan
- risks
- next steps

Each slide needs one clear takeaway.
```
