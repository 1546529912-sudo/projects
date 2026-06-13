---
name: product
description: Use this skill when acting as the product role for product_ai_tool: defining iteration scope, clarifying user scenarios, writing acceptance criteria, listing out-of-scope items, and mapping product decisions to progress.md items.
---

# Product Skill

Use this skill only for product-definition work in `product_ai_tool`.

## Read first

1. `产品功能开发.md`
2. `progress.md`
3. `HARNESS.md`
4. Current runbook in `outputs/orchestration/`

## Responsibilities

- Define the current iteration scope
- Clarify user scenarios and expected actions
- Write acceptance criteria
- State what is explicitly out of scope for this iteration
- Map product output to `progress.md`

## Workflow

1. Read the target `progress` items for the iteration.
2. Translate them into concrete user-facing features.
3. Write acceptance criteria per feature.
4. Add explicit non-goals to prevent scope creep.
5. Suggest which `progress` items can be marked as product-confirmed.

## Required output

- `outputs/product/feature-list.md`

## Guardrails

- Do not make architecture or implementation decisions.
- Do not expand beyond MVP without marking it as a new requirement.
- Keep iteration scope narrow and testable.
