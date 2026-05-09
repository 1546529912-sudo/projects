# Quality Verification

Verification is mandatory after Pencil canvas changes whenever relevant tools are available.

## 1. Visual verification

Check:

- Correct page and frame visible.
- Elements aligned.
- No unexpected overlap.
- Text not clipped.
- Density appropriate.
- Placeholder clarity.
- Result matches selected direction.
- Platform-specific conventions are respected.

## 2. Layout verification

Check:

- Off-canvas objects.
- Overlapping elements.
- Zero-size/hidden elements.
- Broken constraints.
- Clipped text.
- Inconsistent spacing.
- Excessive empty areas.
- Wrong frame dimensions.
- Flattened non-editable content.

## 3. Structure verification

Check:

- Meaningful pages.
- Meaningful top-level frames.
- Semantic layer names.
- No generic `Rectangle 1` / `Group 2` / `Text 5`.
- Reasonable nesting.
- Repeated UI componentized.
- Component instances used correctly.
- Clear state/variant names.

## 4. Variable verification

Check:

- Colors use variables/tokens.
- Typography consistent.
- Spacing uses scale.
- Radius/shadows consistent.
- No duplicate variables.
- Codebase tokens mirrored when applicable.

## 5. Component verification

Check:

- Repeated UI uses components.
- Buttons/cards/inputs/tables/navigation/product cards/charts use relevant components.
- Variants/states are relevant and not overbuilt.

## 6. Platform-specific checks

### Enterprise Admin

- Business object is obvious.
- Field hierarchy is correct.
- Filters and table actions are useful.
- Empty/error/no-permission states considered.

### Responsive Web / Landing

- Value proposition is clear.
- CTA path is visible.
- Trust modules support conversion.
- Responsive adaptation is considered.

### Mobile App

- Safe area, navigation, bottom tab, touch targets, and keyboard states are considered.
- Main path is thumb-friendly.

### WeChat Mini Program

- Capsule safe area, nav bar, tabBar, authorization/payment/share patterns are considered.

### Big Screen

- Distant readability, alert priority, KPI hierarchy, and real-time data states are considered.

### E-commerce

- Selling points, price/promotion/trust, product image strategy, and conversion path are clear.

### Design System

- Tokens, component variants, state matrix, and usage examples are complete enough.

### Cross-platform

- Business objects, statuses, actions, and terminology are consistent across platforms.

### Presentation / Deck

- Audience and goal are clear.
- Narrative arc is coherent.
- Each slide has one core takeaway.
- Slide titles are meaningful.
- Text is readable for projection or intended export.
- Slide dimensions are consistent.
- Visual system is consistent.
- Output format constraints are respected.
- HTML/PPTX/PDF compatibility is considered when relevant.

## 7. Accessibility sanity check

Check:

- Text contrast likely sufficient.
- Tap targets appropriate.
- Text sizes readable.
- Important information not color-only.
- Focus/error states considered.

## 8. Fix loop

If verification finds problems:

1. Diagnose issue.
2. Modify canvas using Pencil tools.
3. Verify again.
4. Report completion only after obvious issues are fixed or disclosed.

## 9. Completion report

Use:

```text
Completed
- ...

Selected mode(s)
- Role:
- Platform:

Created/changed in Pencil
- Pages:
- Frames:
- Components:
- Variables:
- States:

Verification performed
- Screenshot/preview:
- Layout:
- Hierarchy:
- Variables/components:
- Platform-specific checks:

Remaining assumptions
- ...

Suggested next step
- ...
```

Never report “done” if the edit failed.
