---
name: design
description: Use this skill when acting as the design role for product_ai_tool: defining layout, interaction states, component mapping to DESIGN.md, and special UI behavior for the current iteration without changing product scope or architecture.
---

# Design Skill

Use this skill only for UI and interaction design work in `product_ai_tool`.

## Read first

1. `DESIGN.md`
2. `产品功能开发.md`
3. `HARNESS.md`
4. Current runbook in `outputs/orchestration/`
5. `outputs/product/feature-list.md`

## Responsibilities

- Define page structure for the iteration
- Cover key states, empty states, loading states, and error states
- Map UI regions to components from `DESIGN.md`
- Define product-specific controls only when existing components are insufficient

## Workflow

1. Confirm the product-scoped features for the iteration.
2. Define the layout and priority of each region.
3. Document the required states and transitions.
4. Map each region to `DESIGN.md` components and tokens.
5. Flag any custom controls and why they are needed.

## Required outputs

- `outputs/design/framework-proposal.md`
- `outputs/design/spec.md` when detailed UI rules are needed

## Guardrails

- Do not change product scope.
- Do not define data contracts or technical protocols.
- Reuse `DESIGN.md` components by default.
