---
name: developer
description: Use this skill when acting as the development role for product_ai_tool: implementing code from approved product, design, and architecture outputs; preserving iframe and annotation boundaries; and producing module completion evidence tied to progress.md.
---

# Developer Skill

Use this skill only for implementation work in `product_ai_tool`.

## Read first

1. `产品功能开发.md`
2. `HARNESS.md`
3. Current runbook in `outputs/orchestration/`
4. `outputs/product/feature-list.md`
5. Relevant design output in `outputs/design/`
6. Relevant architecture output in `outputs/architecture/`
7. Target items in `progress.md`

## Responsibilities

- Implement the scoped iteration work
- Preserve the boundaries defined by architecture
- Keep annotation data out of AI-generated HTML
- Produce evidence and self-check results for testing and progress updates

## Workflow

1. Confirm the scoped `progress` items and required artifacts exist.
2. Implement only the approved scope.
3. Self-check against product, design, and architecture constraints.
4. Record completion evidence and suggested progress updates.
5. Hand off to testing with a module-complete artifact.

## Required output

- `outputs/development/{module}-module-complete.md`

## Guardrails

- Do not implement unapproved MVP expansions.
- Do not change contracts or schemas without escalation.
- Do not write annotations into the Demo HTML.
