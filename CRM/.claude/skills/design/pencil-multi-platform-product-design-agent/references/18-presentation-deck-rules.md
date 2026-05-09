# Presentation / Deck Mode Rules

Use this mode when the user wants to create, modify, review, or structure a presentation, deck, pitch, proposal, report deck, training courseware, keynote-style story, or HTML-based slide experience in Pencil or an HTML/PPT/PDF-compatible page format.

This mode is not limited to `.pptx`. It applies to:

- PPT / PowerPoint-style presentations
- HTML slide decks
- browser-based presentations
- PDF-exportable decks
- pitch decks
- product proposal decks
- business reports
- research report decks
- training decks
- sales enablement decks
- executive briefings
- design review decks
- roadmap / strategy decks

## 1. Core principle

A presentation is not a collection of decorated pages. It is a guided narrative.

Design order:

```text
Audience
→ Goal
→ Core message
→ Narrative arc
→ Slide sequence
→ Per-slide takeaway
→ Visual system
→ Output format
→ Pencil / HTML / deck generation
```

Every slide should answer:

```text
What should the audience understand, believe, decide, or do after this slide?
```

## 2. When to activate

Activate this mode for triggers such as:

```text
PPT
演示文稿
slides
deck
presentation
汇报
方案汇报
产品方案
商业提案
路演
pitch deck
培训课件
研究报告
项目汇报
述职
总结汇报
发布会
演讲稿
HTML deck
网页演示
可导出 PDF
```

If the user asks for “HTML 格式 PPT” or “用 HTML 做演示文稿,” still use Presentation / Deck Mode.

## 3. Required intake

Identify:

- Audience.
- Presentation goal.
- Occasion.
- Time limit.
- Desired number of slides.
- Output format: Pencil canvas, HTML deck, PPTX, PDF, or hybrid.
- Tone: executive, professional, educational, sales, technical, storytelling, visual-first.
- Existing content: outline, document, PRD, data, screenshots, references, brand guide.
- Required speaker notes or not.
- Whether the deck is for live presentation, reading, handoff, or export.

If missing and not critical, make assumptions and label them.

## 4. Deck taxonomy

### 4.1 Executive briefing

Best for decision makers.

Structure:

```text
Context
Key conclusion
Evidence
Options
Recommendation
Decision needed
Next steps
```

Rules:

- Lead with conclusion.
- Use fewer details.
- Emphasize decisions and risks.
- Make every slide skimmable.

### 4.2 Product proposal deck

Best for product reviews, internal alignment, client proposal.

Structure:

```text
Problem
Users / scenarios
Current pain
Solution concept
Core flow
Key screens
Business value
Implementation plan
Risks and next steps
```

### 4.3 Sales / solution proposal deck

Best for customer-facing proposals.

Structure:

```text
Customer context
Pain points
Opportunity
Solution overview
Why us
Use cases
Implementation approach
Business outcomes
Commercial / next steps
```

### 4.4 Pitch deck

Best for startup / investment / roadshow.

Structure:

```text
Vision
Problem
Solution
Market
Product
Traction
Business model
Competition
Go-to-market
Team
Ask
```

### 4.5 Training / courseware deck

Best for teaching.

Structure:

```text
Learning objectives
Concept overview
Step-by-step explanation
Examples
Practice / exercise
Common mistakes
Summary
Next action
```

### 4.6 Research / report deck

Best for structured findings.

Structure:

```text
Research question
Method
Key findings
Evidence
Interpretation
Implications
Recommendations
Appendix
```

### 4.7 Design review deck

Best for presenting design work.

Structure:

```text
Objective
Constraints
Exploration directions
Selected direction
Key screens
Interaction / states
Design system impact
Open questions
Next iteration
```

## 5. Narrative rules

Before designing slides, define:

```text
Thesis: one-sentence core argument
Audience: who must be convinced
Decision: what must be decided
Story arc: beginning / middle / end
Slide count: target length
```

Recommended story arcs:

### Problem → Solution → Proof → Next step

Good for product, sales, and proposal decks.

### Situation → Complication → Resolution

Good for strategy, consulting, and executive decks.

### Past → Present → Future

Good for roadmap, transformation, and progress updates.

### What → So what → Now what

Good for data, research, and analysis decks.

### Learn → See → Try → Remember

Good for training.

## 6. Slide-level rules

Each slide should have:

```text
Slide title
Core takeaway
Supporting content
Visual structure
Optional speaker note
```

Avoid slides that only have a topic title and random bullets.

Use action-oriented titles:

Bad:

```text
Market Analysis
```

Better:

```text
Market demand is shifting from standalone tools to integrated workflows
```

## 7. Information density rules

### Live presentation

- Less text.
- Larger type.
- One idea per slide.
- Use visuals and speaker notes.
- Avoid dense paragraphs.

### Read-alone deck

- More explanatory content allowed.
- Use structured captions and evidence blocks.
- Still avoid walls of text.

### Executive deck

- Clear conclusion on each slide.
- Dense enough for decision-making, not decorative.

### Training deck

- Step-by-step progression.
- Examples and exercises.
- Recap pages.

## 8. Visual system rules

Define a deck system before creating slides:

```text
Cover slide
Section divider
Content slide
Comparison slide
Data slide
Process slide
Quote / insight slide
Case slide
Summary slide
Appendix slide
```

Use consistent:

- Typography scale.
- Grid.
- Margins.
- Section label.
- Page number.
- Color palette.
- Chart style.
- Icon/diagram style.
- Image treatment.

Avoid:

- Random per-slide styles.
- Overdecorated gradients.
- Tiny unreadable text.
- Decorative icons with no meaning.
- Excessive page chrome.

## 9. Slide canvas and dimensions

Default slide size:

```text
Presentation_16x9_1920x1080
```

Other possible sizes:

```text
Presentation_16x9_1280x720
Presentation_4x3_1024x768
Presentation_A4_Report
Presentation_Mobile_Story
```

For Pencil canvas:

```text
Deck_00_Cover
Deck_01_Context
Deck_02_Problem
Deck_03_Solution
Deck_04_Flow
Deck_05_Proof
Deck_06_Roadmap
Deck_07_NextSteps
Deck_Appendix
```

Frame naming:

```text
Deck_01_Cover
Deck_02_Problem
Deck_03_Solution
Deck_04_KeyFlow
Deck_05_DataEvidence
Deck_06_Recommendation
Deck_07_NextSteps
```

## 10. HTML deck rules

If output is HTML deck:

- Use fixed 16:9 canvas unless user asks otherwise.
- Support keyboard navigation where possible.
- Keep slides printable/exportable.
- Avoid relying on non-editable screenshots for text.
- Keep content semantic enough to revise.
- Consider speaker notes only if requested.
- Keep text sizes readable on projection.
- Use slide labels and page numbers.

HTML deck structure:

```text
deck root
slide container
slide frames
navigation controls
optional progress indicator
optional speaker notes
print/export styles
```

## 11. PPTX / PDF compatibility rules

If the user may later export to PPTX/PDF:

- Avoid effects that cannot translate.
- Prefer editable text and shapes.
- Avoid excessive CSS-only tricks if PPTX is required.
- Use safe margins.
- Keep images and diagrams modular.
- Use consistent slide dimensions.
- Avoid tiny text below 24px in 1920×1080 slide canvas.

## 12. Slide component requirements

Create or reuse:

```text
DeckLayout
SlideTitle
SlideSubtitle
SectionDivider
KeyMessageBlock
TwoColumnLayout
ThreeColumnLayout
ComparisonTable
ProcessTimeline
DataChart
QuoteBlock
ImageFrame
Callout
MetricCard
AgendaList
ProgressIndicator
PageNumber
SpeakerNotePlaceholder
AppendixLabel
```

## 13. Deck structure planning

Before generating slides, create an outline:

```text
Slide number
Slide title
Core takeaway
Content bullets
Visual type
Notes required?
```

Example:

```text
01 Cover
- Takeaway: Introduce the proposal and audience context
- Visual: title + subtitle + subtle product/system visual

02 Problem
- Takeaway: Current workflow creates operational blind spots
- Visual: pain-point diagram

03 Solution
- Takeaway: Unified platform connects data, workflow, and decision-making
- Visual: architecture diagram
```

## 14. Visual types

Choose visual type intentionally:

```text
Hero statement
Diagram
Timeline
Matrix
Comparison
Process flow
System architecture
Data chart
Case card
Screenshot walkthrough
Before/after
Decision table
Roadmap
```

Do not use charts unless data supports them.

## 15. Speaker notes

Only add speaker notes if the user asks or if the deck is explicitly for live presentation and notes are useful.

Speaker notes should:

- Be conversational.
- Explain what to say, not duplicate slide text.
- Match slide order.
- Be optional and separable from slide visuals.

## 16. Deck quality checklist

Before reporting completion, check:

- Does the deck have a clear audience and goal?
- Is there a coherent narrative arc?
- Does each slide have one core takeaway?
- Are slide titles meaningful?
- Is information density appropriate for live/read-alone use?
- Are section transitions clear?
- Are visuals purposeful, not decorative?
- Is text readable on projection?
- Are dimensions consistent?
- Are slide frames named correctly?
- Are reusable deck components used?
- Is export format considered?
- Are assumptions and missing data labeled?

## 17. What to avoid

Avoid:

- A deck full of generic bullet pages.
- Slide titles that only name topics.
- Inconsistent slide templates.
- Too many tiny details.
- Random decorative icons.
- Fake data.
- Unlabeled placeholders.
- Overly complex charts.
- Treating HTML deck as a normal long web page.
- Treating Pencil slides as loose frames without sequence.
