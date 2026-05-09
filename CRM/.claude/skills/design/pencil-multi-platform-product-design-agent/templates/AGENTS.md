# AGENTS.md — Pencil Multi-Platform Product Design Agent Instructions

Use these instructions for Codex, Claude Code, Cursor, Windsurf, or any MCP-capable agent working in this repository.

## Pencil product design work

When the user asks to create, modify, review, or sync Pencil designs:

1. Use the `pencil-multi-platform-product-design-agent` skill if available.
2. Detect Pencil host mode: desktop app or IDE extension.
3. Confirm Pencil MCP or Pencil extension tools are accessible before claiming canvas edits.
4. Inspect current `.pen` file:
   - editor state
   - current page
   - selection
   - page/frame hierarchy
   - variables
   - components
5. Route the task by role mode and platform mode.
6. Read codebase tokens/components when available.
7. Use semantic Pencil naming:
   - Pages
   - Frames
   - Layers
   - Components
   - Variables
8. Create editable structures, not flattened screenshots.
9. Verify after edits with screenshot/layout/hierarchy/variable/component tools.
10. Never claim a Pencil edit succeeded unless the tool call succeeded.

## Multi-platform quality bar

Pencil output must be:

- editable
- structured
- platform-appropriate
- componentized where repeated
- token-consistent
- aligned with code/design context
- verified after editing
- suitable for product/design/engineering review
