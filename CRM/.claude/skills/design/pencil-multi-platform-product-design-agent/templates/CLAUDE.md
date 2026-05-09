# CLAUDE.md — Pencil Multi-Platform Product Design Agent Instructions

Treat Pencil canvas work as an agentic multi-platform product design task.

## For Pencil tasks

- Use the `pencil-multi-platform-product-design-agent` skill if installed.
- Detect desktop app mode vs IDE extension mode.
- Confirm MCP/tool availability before editing.
- Inspect the open `.pen` file and current canvas state.
- Route task to appropriate role/platform mode.
- Read existing pages, frames, layers, components, variables, and current selection.
- Read project tokens and UI components before generating UI.
- Create semantic Pages, Frames, Layers, Components, Variables, and States.
- Keep everything editable.
- Verify with screenshot, layout, hierarchy, variable, component, and platform-specific checks.
- Report what was changed, where, and how it was verified.

## Hard rule

Never say the Pencil canvas has been modified unless a Pencil MCP or Pencil extension edit operation completed successfully.
