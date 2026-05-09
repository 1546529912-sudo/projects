# Design Workflow

This workflow applies to all platform modes.

## 1. Intake

Understand:

- User goal.
- Target users and roles.
- Business or creative context.
- Platform and device.
- Required output.
- Fidelity.
- Constraints.
- Existing assets and context.
- Whether this is exploration, review, or handoff.

## 2. Host and tool check

Before canvas work:

- Identify desktop app mode or IDE extension mode.
- Confirm `.pen` file availability.
- Inspect available Pencil MCP or extension tools.
- If unavailable, report the connection issue and prepare a plan instead.

## 3. Context reading

Read available context:

- PRD / brief.
- Existing Pencil file.
- Screenshots.
- Codebase tokens.
- UI components.
- Brand guidelines.
- Copy docs.
- Product data.
- Platform rules.
- Business object / fields / permissions / workflow.

## 4. Clarification / Intake Gate

Before mode routing, run `references/00-clarification-intake-rules.md`.

Decide whether missing information is blocking, assumable, or low-impact.

- Blocking: ask concise questions.
- Assumable: state assumptions and continue.
- Low-impact: use defaults.

Do not route or design when platform, goal, user/audience, or core content is blocking-missing.

## 5. Mode routing

Use `references/01-mode-router.md`.

Determine:

- Role mode.
- Platform mode.
- Whether cross-platform consistency is required.

## 6. Clarification

Ask questions only when answers materially affect the design.

Common high-value questions:

- Who is the target user?
- What is the primary action?
- What must be visible first?
- Which platform and size?
- What existing design system should be followed?
- What states must be included?
- Is this for exploration, review, or engineering handoff?

## 7. Direction exploration

For new or ambiguous tasks, propose 2–3 directions:

- Name.
- Best for.
- Layout idea.
- Visual tone.
- Interaction focus.
- Platform-specific considerations.
- Pros.
- Risks.
- Recommendation.

## 8. Platform-specific structure

Before drawing, read the relevant platform rule file:

- Enterprise Admin: business object, fields, operations, permissions.
- Web/Landing: story, conversion, trust, CTA.
- Mobile App: navigation, safe area, touch, page stack.
- WeChat Mini Program: capsule, tabBar, WeChat authorization/payment/share.
- Big Screen: KPI hierarchy, real-time data, alerts, distant readability.
- E-commerce: selling points, product image strategy, price/promotion/trust.
- Design System: tokens, components, variants, usage examples.
- Cross-platform: object/state/action consistency across terminals.
- Presentation: audience, goal, story arc, slide sequence, per-slide takeaway, output format.

## 9. Canvas planning

Plan:

- Page names.
- Frame names and dimensions.
- Platform sections.
- Components.
- Variables/tokens.
- States.
- Cross-platform mapping if needed.
- Verification plan.

## 10. Canvas execution

Execution order:

1. Create/select Page.
2. Create top-level Frame.
3. Establish or reuse variables.
4. Create reusable components.
5. Build screen structure.
6. Fill real content or named placeholders.
7. Add relevant states and variants.
8. Add annotations only if useful.
9. Verify and fix.

## 11. Versioning

For significant changes:

- Preserve prior version when possible.
- Create new Pages/Frames for alternatives.
- Use versioned names:
  - `v1_Default`
  - `v2_Compact`
  - `v3_Conversion`
- Do not overwrite a user's chosen design unless asked.

## 12. Handoff

Report:

- What changed.
- Selected modes.
- Where it is in the Pencil file.
- Key pages/frames/components/variables/states.
- Verification performed.
- Remaining assumptions and next step.
