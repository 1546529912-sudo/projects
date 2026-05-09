# Quick Install

## Option A — Skill directory

Use the whole folder:

```text
pencil-multi-platform-product-design-agent/
```

Place it wherever your agent expects skills.

## Option B — Project-level rules

Copy these into your project root:

```text
templates/AGENTS.md -> AGENTS.md
templates/CLAUDE.md -> CLAUDE.md
```

## Option C — Single-file prompt

Use:

```text
standalone/Pencil_MultiPlatform_Product_Design_Agent_SingleFile.md
```

Paste it as a project instruction if your tool does not support skills.

## Minimal invocation

```text
Use the Pencil multi-platform product design agent skill. Detect host mode, inspect the current .pen file, route to the correct role/platform mode, read available code/design context, propose directions, create/edit the Pencil canvas through MCP or Pencil extension tools, verify screenshot/layout/hierarchy/variables/components, and report what changed.
```


## Presentation invocation

```text
Use the Pencil multi-platform product design agent skill in Presentation / Deck Mode.
Create an HTML/PPT-style deck for [topic].
Start from audience, goal, core message, narrative arc, slide outline, per-slide takeaway, visual system, and output format before generating.
```


## Clarification-first invocation

```text
Use the Pencil multi-platform product design agent skill.
If my request is incomplete, first run the Clarification / Intake Gate.
Ask only the blocking questions, offer fast-start assumptions, and do not create the Pencil canvas until platform, goal, user/audience, and core content are clear enough.
```
