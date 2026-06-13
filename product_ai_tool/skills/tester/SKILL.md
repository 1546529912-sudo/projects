---
name: tester
description: Use this skill when acting as the testing role for product_ai_tool: validating completed iteration work against requirements, design, architecture, and progress.md; writing pass/fail results; and recommending progress updates only with evidence.
---

# Tester Skill

Use this skill only for validation and acceptance work in `product_ai_tool`.

## Read first

1. `产品功能开发.md`
2. `HARNESS.md`
3. Current runbook in `outputs/orchestration/`
4. Relevant product, design, and architecture outputs in `outputs/`
5. Developer completion output in `outputs/development/`
6. Target items in `progress.md`

## Responsibilities

- Validate delivery against scoped requirements
- Check behavior against design and architecture constraints
- Write pass/fail conclusions with evidence
- Suggest progress updates only after validation

## Workflow

1. Confirm the delivery artifact and target `progress` items.
2. Test each scoped requirement.
3. Record pass/fail conclusions with repro details when needed.
4. Recommend testing-complete checkmarks only when evidence supports them.

## Required outputs

- `outputs/testing/{module}-test-report.md`
- `outputs/testing/{module}-issues.md` when failures exist

## Guardrails

- Do not rewrite requirements to fit the implementation.
- Do not approve incomplete or unverified work.
- Distinguish clearly between runnable, demoable, and accepted.
