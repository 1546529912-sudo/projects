---
name: orchestrator
description: Use this skill when coordinating multi-agent delivery for product_ai_tool: selecting the current iteration scope, deciding which role acts next, checking handoff readiness, consolidating evidence, handling blockers, and updating progress.md only when completion conditions are met.
---

# Orchestrator Skill

Use this skill only for project-level coordination in `product_ai_tool`.

## Read first

1. `HARNESS.md`
2. `AGENTS.md`
3. `progress.md`
4. Current runbook in `outputs/orchestration/`
5. Relevant role outputs in `outputs/`

## Responsibilities

- Pick the current iteration scope from `progress.md`
- Decide which role acts next
- Check whether upstream outputs are sufficient for handoff
- Track blockers, risks, and missing inputs
- Consolidate suggested checkmarks and evidence
- Update `progress.md` only when evidence is complete

## Workflow

1. Confirm the current iteration and target `progress` items.
2. Check whether the required upstream documents exist.
3. Route work to the next role.
4. Reject incomplete handoffs and ask for the missing artifact.
5. Summarize suggested progress updates with evidence.
6. Write back to `progress.md` only after the required completion conditions are satisfied.

## Required outputs

- Runbook: `outputs/orchestration/{iteration}-runbook.md`
- Progress update summary: `outputs/orchestration/{iteration}-progress-update.md`

## Guardrails

- Do not redefine product scope on your own.
- Do not skip product, design, architecture, development, or testing without explicit approval.
- Do not treat development completion as test completion.
- Do not update `progress.md` without evidence.
