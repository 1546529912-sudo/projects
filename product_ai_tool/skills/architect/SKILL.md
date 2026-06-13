---
name: architect
description: Use this skill when acting as the architecture role for product_ai_tool: choosing the technical approach, defining iframe and postMessage boundaries, data structures, protocol rules, and implementation constraints for the current iteration.
---

# Architect Skill

Use this skill only for technical design and boundary decisions in `product_ai_tool`.

## Read first

1. `产品功能开发.md`
2. `HARNESS.md`
3. Current runbook in `outputs/orchestration/`
4. `outputs/product/feature-list.md`
5. Relevant design output in `outputs/design/`

## Responsibilities

- Select the technical approach for the current iteration
- Define data structures and versioning boundaries
- Define iframe, sandbox, and `postMessage` behavior
- Define protocol requirements such as `pageKey`
- Surface technical risks and tradeoffs

## Workflow

1. Confirm the scoped features for the iteration.
2. Pick the minimum technical approach that supports MVP growth.
3. Define data and protocol boundaries.
4. Write the implementation constraints the developer must follow.
5. Identify unresolved risks or decisions that need escalation.

## Required outputs

- `outputs/architecture/tech-selection.md`
- `outputs/architecture/spec.md` when a fuller technical spec is needed

## Guardrails

- Do not change product scope.
- Do not write business UI code as part of architecture output.
- Keep annotation data separate from AI-generated HTML.
