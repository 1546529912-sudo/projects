# Codebase Sync Rules

Use when Pencil MCP is used from VS Code, Claude Code, Codex, Cursor, Windsurf, or another coding-agent environment connected to a software project.

## 1. Pencil host modes inside IDEs

Identify whether Pencil is available through:

- Standalone Pencil desktop app.
- Pencil IDE extension with `.pen` file open.
- MCP server registered directly in the agent.
- MCP server registered through VS Code/Cursor extension or workspace configuration.

Do not require the desktop app when user uses IDE extension.

Minimum checks:

- `.pen` file exists in workspace.
- `.pen` file is open.
- Pencil icon/canvas view is available.
- Pencil extension is installed and enabled.
- Current AI agent can see Pencil MCP or Pencil extension tools.

If extension works visually but agent cannot see Pencil tools, report MCP exposure/configuration problem rather than missing installation.

## 2. Do not design from memory if code exists

Inspect the project:

```text
package.json
tailwind.config.*
theme.*
tokens.*
variables.*
colors.*
typography.*
styles/
src/styles/
src/theme/
src/tokens/
src/components/
src/ui/
app/
pages/
components/
```

## 3. Identify design system source

Determine where visual truth lives:

- Tailwind config.
- CSS variables.
- Sass/Less variables.
- TypeScript theme.
- Design token JSON.
- Component library.
- Storybook.
- Existing UI components.
- Existing screenshots.

Prefer project tokens over ad-hoc values.

## 4. Import or mirror tokens into Pencil variables

Example mapping:

```text
--color-bg-default        -> color/bg/default
--color-text-primary      -> color/text/primary
--spacing-4               -> space/4
--radius-lg               -> radius/16
font.heading              -> type/h1, type/h2
shadow.card               -> shadow/medium
```

Do not create duplicate tokens if equivalent variables exist.

## 5. Match component vocabulary

If codebase has:

```text
Button
Input
Card
ProductCard
Dialog
Tabs
Table
Badge
Toast
Sidebar
BottomTabBar
MiniProgramNav
KpiCard
ChartCard
```

Then Pencil components should align.

## 6. Use implementation-aware layout

- Prefer grids/frames over arbitrary positioning.
- Use spacing scales that exist in the codebase.
- Use real breakpoints.
- Avoid visual treatments impossible in current stack.
- Call out new UI paradigms.

## 7. Design-to-code consistency

When asked to generate/update code after Pencil design:

1. Read Pencil page/frame/component structure.
2. Read codebase component/token structure.
3. Map Pencil components to code components.
4. Generate minimal code changes.
5. Preserve architecture.
6. Note mismatches.

## 8. Code-to-design consistency

When creating Pencil from code:

1. Read route/page/component files.
2. Read tokens and styles.
3. Identify states.
4. Create editable Pencil frames/components.
5. Use real labels, navigation, and page structure from code when available.
6. Use placeholders only for dynamic data not present.

## 9. Project instructions

Recommended:

```text
AGENTS.md
CLAUDE.md
skills/pencil-multi-platform-product-design-agent/SKILL.md
skills/pencil-multi-platform-product-design-agent/references/
```

Project instructions should say:

- Use Pencil MCP for Pencil canvas work.
- Detect host mode.
- Inspect `.pen` before editing.
- Use project tokens/components.
- Never claim edit success without tool success.
- Verify layout after changes.

## 10. Version control

Before major codebase changes:

- Check uncommitted changes when possible.
- Avoid overwriting user work.
- Prefer new files/branches when uncertain.
- Summarize changed files separately from Pencil canvas changes.
