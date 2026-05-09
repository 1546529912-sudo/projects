# Enterprise Admin / SaaS Dashboard Rules

Use for web management systems, SaaS dashboards, enterprise back-office systems, admin consoles, operational platforms, data-management pages, approval systems, FM/IBMS/BIM/WBS/asset/inspection/personnel/scheduling modules.

## 1. Core principle

Do not start from visual style. Start from business object and operation model.

```text
Business object
→ User roles
→ Data fields
→ Core operations
→ Permissions
→ Page type
→ States and exceptions
→ Component structure
→ Pencil canvas generation
```

## 2. Page taxonomy

### List / table page

Required:

```text
Page title + description
Global actions
Search
Quick filters
Advanced filters
Table toolbar
Data table
Row actions
Pagination
Batch action bar
Empty/loading/error states
```

### Detail page

Required:

```text
Object header
Status and key metadata
Primary actions
Summary cards
Information sections
Related data tabs
Timeline / operation log
Attachments / comments
Danger zone when relevant
```

### Add / edit form

Required:

```text
Form title
Context explanation
Grouped fields
Required/optional distinction
Inline validation
Save/cancel actions
Draft/autosave state when relevant
Permission warning if readonly
```

### Configuration page

Required:

```text
Setting group
Current status
Editable rule area
Preview or affected scope
Save/apply/cancel
Version or change history
Risk warning for global settings
```

### Approval / workflow page

Required:

```text
Task queue
Status pipeline
Current assignee
SLA / due time
Approval detail
Comments
Approve/reject/transfer actions
Workflow timeline
Audit trail
```

### Dashboard / monitoring page

Required:

```text
KPI summary
Alert/exception area
Trend charts
Breakdown modules
Task/action list
Recent activity
Drill-down paths
```

### WBS / Gantt / schedule page

Required:

```text
Left task table
Right timeline/Gantt
Toolbar
Zoom scale
Dependencies
Baseline
Progress status
Critical path
Resource or cost view
Edit panel
```

## 3. Table rules

### Field priority

Classify:

```text
Primary identifier
Status
Owner
Time
Metric
Risk
Action
```

### Column order

```text
Selection checkbox
Primary identifier
Key status
Key business fields
Owner / responsible party
Time / deadline
Risk / exception
Row actions
```

### Toolbar

Include only relevant:

- Search.
- Filter.
- Column settings.
- Refresh.
- Import.
- Export.
- Create.
- Batch actions.
- View switch.
- Density switch.

Group low-frequency actions.

### Batch actions

Appear only after selection:

```text
Selected count
Available batch actions
Clear selection
Risk confirmation
```

## 4. Filter rules

Quick filters for high-frequency conditions:

- Status.
- Owner.
- Date range.
- Category.
- Priority.
- Exception only.
- My tasks.

Advanced filters when filters exceed 4–5 fields.

Show filter chips after apply.

## 5. Detail / drawer rules

Use drawer when inspecting without leaving list context.

Use full page when detail has many sections, related records, logs, workflow, or focused editing.

Recommended drawer:

```text
Header: object name + status + close
Summary: key metadata
Tabs: Details / Activity / Related / Attachments
Footer: primary and secondary actions
```

## 6. Permission rules

Represent:

- Visible/editable actions by role.
- Disabled actions with reason.
- No permission state.
- Readonly state.
- Approval authority.
- Data scope.

Frame examples:

```text
WebAdmin_UserList_Admin
WebAdmin_UserList_Operator
WebAdmin_UserList_Readonly
WebAdmin_UserList_NoPermission
```

## 7. Required admin components

Create/reuse:

```text
AdminLayout
TopBar
SidebarNav
Breadcrumb
PageHeader
Toolbar
SearchInput
FilterPanel
FilterChip
DataTable
TableColumnHeader
TableRow
StatusTag
ActionMenu
BatchActionBar
Pagination
DetailDrawer
FormSection
FormField
ModalConfirm
Toast
EmptyState
ErrorState
KpiCard
ChartCard
AuditTimeline
PermissionNotice
```

## 8. Direction patterns

### Dense operations console

For expert/high-frequency users.

### Guided task workspace

For workflow-heavy or less experienced users.

### Monitoring and exception-first dashboard

For operations/management teams.

### Configuration studio

For rules/templates/workflow/settings.

### Master-detail productivity layout

For list + frequent inspection.

## 9. Quality checklist

Check:

- Page type matches task.
- Business object obvious.
- Key fields visible and ordered correctly.
- Filters useful.
- Primary/secondary actions separated.
- High-risk actions protected.
- Row and batch actions distinct.
- Detail/edit/log paths clear.
- Empty/error/permission states considered.
- Components reusable.
