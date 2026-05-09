# Clarification / Intake Rules

This file is the first gate for every Pencil design task.

Run this gate before mode routing, design planning, and canvas generation.

The purpose is to prevent the agent from drawing the wrong thing when the user's prompt is short, vague, or missing important context.

## 1. Core principle

Do not punish users for writing incomplete prompts.

When information is missing, decide whether it is:

```text
A. Blocking missing information — must ask before proceeding
B. Important but assumable — state assumptions and continue
C. Low-impact missing information — use sensible defaults silently
```

Ask only the questions that materially affect the design.

## 2. When to run this gate

Always run it before:

- Choosing platform mode.
- Creating or modifying Pencil canvas.
- Producing a slide/deck outline.
- Creating multi-platform mapping.
- Using `batch_design`.
- Modifying the current selection.
- Making a large design decision.

For tiny edits, run a minimal version of the gate:

```text
Is the target clear?
Is the requested change clear?
Is the current selection/page clear?
```

## 3. Blocking missing information

If any of these are missing or ambiguous, ask before creating the Pencil canvas.

### 3.1 Platform is unknown

Must ask if the user only says:

```text
帮我做一个页面
帮我设计一个界面
做一个首页
画一个产品页面
```

and it is unclear whether they want:

```text
Web admin
Responsive web / landing page
Mobile app
WeChat Mini Program
Big screen
E-commerce page
Presentation / deck
Design system
Cross-platform solution
```

### 3.2 Goal is unknown

Must ask if the design goal is unclear:

```text
management
conversion
monitoring
reporting
approval
teaching
pitching
selling
data entry
task execution
```

### 3.3 Target user or audience is unknown

Must ask when user role significantly changes design:

```text
administrator
operator
field worker
customer
executive
designer
developer
student
consumer
merchant
```

### 3.4 Core content is missing

Must ask when the design cannot be meaningfully created without content:

- Admin page: missing business object or fields.
- App/Mini Program: missing core task or screen flow.
- Big screen: missing KPI/data categories.
- E-commerce: missing product/category/selling points.
- Deck: missing topic/audience/goal.
- Design system: missing platform/product scope.
- Cross-platform: missing platforms or business object.

### 3.5 User says to use provided materials, but none are available

Must ask for the missing material if the user says:

```text
按我的资料
基于这个 PRD
参考这个截图
按品牌规范
根据现有设计
```

but the relevant files, screenshots, or context are absent.

### 3.6 Current canvas target is unclear

Must ask if user requests:

```text
修改这个
改当前页面
优化选中元素
调整这个卡片
```

but no current selection, page, frame, or target layer can be confirmed.

## 4. Important but assumable information

These may be assumed if absent, but the agent should state assumptions before proceeding.

### 4.1 Default sizes

```text
Web admin: 1440 × 1024
Desktop dashboard: 1440 × 900
Mobile app: 390 × 844
WeChat Mini Program: 390 × 844
Big screen: 1920 × 1080
Presentation / deck: 1920 × 1080
E-commerce main image: 1000 × 1000
Responsive web desktop: 1440 × 1024
```

### 4.2 Default fidelity

If not specified:

```text
reviewable high-fidelity wireframe / mid-high fidelity
```

For final visual requests:

```text
high-fidelity editable design
```

### 4.3 Default style

If not specified:

```text
professional
clean
structured
not over-decorated
suitable for product/design/engineering review
```

### 4.4 Default states

If not specified, consider relevant states from:

```text
Default
Loading
Empty
Error
NoPermission
Success
Failed
Readonly
```

Only create states that matter for the page type.

### 4.5 Default content

If exact copy/data is missing:

- Use clearly labeled placeholders.
- Do not invent fake facts, prices, customer quotes, certifications, or metrics.
- Use realistic structural labels only when needed.

## 5. Low-impact missing information

Do not block on:

- Exact icon style.
- Minor radius values.
- Fine shadow intensity.
- Final microcopy.
- Animation easing.
- Exact image asset if placeholder is acceptable.
- Low-frequency states not required by the core task.

## 6. Question count rules

Do not ask too many questions.

### Default maximum

Ask **3–5 questions** for ambiguous new work.

Ask **1–3 questions** for small edits.

Ask **5–8 questions** only for complex multi-platform, large deck, or design-system work.

### Question priority

Ask in this order:

1. Platform / output format.
2. Goal / primary task.
3. Target user / audience.
4. Core content / business object / data.
5. Existing materials / brand / constraints.

## 7. Fast-start option

When asking questions, also offer a fast-start default if reasonable.

Pattern:

```text
I need to confirm a few points before drawing so I do not design the wrong thing:

1. ...
2. ...
3. ...

If you want me to start quickly, I can proceed with these assumptions:
- Platform:
- Goal:
- User:
- Size:
- Style:
- Output:
```

This lets non-professional users continue without writing a perfect prompt.

## 8. Mode-specific blocking questions

### 8.1 Enterprise Admin / SaaS Dashboard

Ask if missing:

- What business object is managed?
- Who uses this page?
- What are the key fields?
- What are the primary operations?
- Are permissions, approval, import/export, or batch actions required?

Fast default:

```text
Web admin, 1440×1024, professional enterprise style, default/list/detail/empty/error states.
```

### 8.2 Responsive Web / Landing Page

Ask if missing:

- What product/service is promoted?
- Who is the audience?
- What conversion action is desired?
- What sections or content must be included?
- Any brand/reference style?

Fast default:

```text
Responsive desktop-first landing page, professional SaaS/product style, hero + features + proof + CTA.
```

### 8.3 Mobile App

Ask if missing:

- iOS, Android, or both?
- What is the user's primary task?
- What screens are needed?
- Are permissions, offline state, photo/scan/location, or keyboard input relevant?

Fast default:

```text
iOS-sized 390×844 mobile app flow, safe area, top navigation, bottom actions, default/loading/error states.
```

### 8.4 WeChat Mini Program

Ask if missing:

- What is the core mini-program task?
- Does it require WeChat login, phone authorization, payment, share, or subscription messages?
- What tabBar pages are needed?
- What is the entry path?

Fast default:

```text
390×844 WeChat Mini Program, capsule safe area, lightweight flow, tabBar if multi-section.
```

### 8.5 Data Visualization Big Screen

Ask if missing:

- What scenario is the big screen for?
- What KPIs/data are available?
- Who views it?
- Is it passive display or operator-interactive?
- Size: 1920×1080 or 4K?

Fast default:

```text
1920×1080 command-center big screen, dark theme, KPI + center map/BIM placeholder + alerts + trends.
```

### 8.6 E-commerce / Campaign

Ask if missing:

- What product/category?
- What audience?
- What selling points?
- What platform/size?
- What promotion/trust signals?

Fast default:

```text
Conversion-oriented e-commerce layout, product visual placeholder, selling points + price/promotion + trust + CTA.
```

### 8.7 Design System / Component Library

Ask if missing:

- Which product/platforms?
- Which components are required?
- Are there existing tokens or code components?
- Is it for design exploration or engineering handoff?

Fast default:

```text
Core tokens + core components + state matrix + usage examples.
```

### 8.8 Cross-platform Consistency

Ask if missing:

- Which platforms?
- What business object?
- Which roles use each platform?
- What statuses/actions must stay consistent?

Fast default:

```text
Create cross-platform object/status/action mapping first, then platform frames.
```

### 8.9 Presentation / Deck

Ask if missing:

- Topic.
- Audience.
- Goal.
- Output format: Pencil canvas, HTML deck, PPTX-compatible, PDF-exportable.
- Desired length or time.

Fast default:

```text
16:9 deck, professional style, outline first, each slide has one core takeaway.
```

## 9. When not to ask and proceed

Proceed without questions when:

- User provides enough information to safely infer platform, goal, and content.
- User explicitly says “直接开始,” “你决定,” “按默认,” or “先出第一版.”
- The task is a small visual or copy adjustment with a clear target.
- The missing information only affects later refinement.

Still state assumptions when they matter.

## 10. Clarification output format

Use this format when clarification is needed:

```text
I need to confirm a few points before creating the Pencil design:

1. ...
2. ...
3. ...

Fast-start assumptions if you want me to proceed:
- Platform:
- Goal:
- User/audience:
- Size:
- Style:
- Output:
```

For Chinese users, answer in Chinese.

## 11. Anti-patterns

Avoid:

- Asking 15+ questions at once.
- Asking about low-impact style details before core purpose.
- Starting canvas generation when platform and goal are unknown.
- Pretending missing content exists.
- Using generic placeholders without naming them.
- Treating a deck as a web page.
- Treating a mobile app as a shrunken desktop page.
- Treating a big screen as a normal dashboard.
