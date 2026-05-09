# Cross-platform Consistency Rules

Use when a product spans multiple terminals, such as Web Admin + Mobile App + WeChat Mini Program + Big Screen.

## 1. Core principle

Cross-platform design is not making every platform look identical. It is keeping business meaning consistent while letting each platform serve its role.

Design order:

```text
Business object
→ Shared status/action model
→ Platform responsibility split
→ Shared tokens/components
→ Platform-specific flows
→ Cross-platform mapping
→ Pencil canvas generation
```

## 2. Required intake

Identify:

- Platforms involved.
- Business objects.
- User roles per platform.
- Primary tasks per platform.
- Shared data fields.
- Shared statuses.
- Shared actions.
- Platform-only actions.
- Shared visual language.
- Platform-specific constraints.

## 3. Platform responsibility split

Example for work order:

```text
Web Admin:
- configure rules
- dispatch
- monitor
- approve
- export/report

Mobile App:
- receive task
- navigate to location
- execute checklist
- take photo
- submit result
- work offline

WeChat Mini Program:
- submit repair request
- track progress
- receive notification
- evaluate service

Big Screen:
- show total status
- show overdue alerts
- show spatial distribution
- show trend
```

## 4. Shared mapping tables

Create mapping pages/frames in Pencil when relevant:

### Business object mapping

```text
Object
Web name
App name
Mini Program name
Big Screen name
Key fields
```

### Status mapping

```text
Draft
Submitted
Pending
In Progress
Paused
Completed
Rejected
Overdue
Cancelled
```

### Action mapping

```text
Create
Submit
Assign
Accept
Execute
Pause
Approve
Reject
Export
Evaluate
```

### Component mapping

```text
Web: DataTable
App: ListCard
Mini Program: ServiceCard
Big Screen: Kpi/AlertCard
```

## 5. Shared tokens

Use consistent semantic tokens:

```text
color/semantic/success
color/semantic/warning
color/semantic/error
color/semantic/info
color/status/pending
color/status/in-progress
color/status/completed
```

Platform styles may differ, but semantic meaning should not conflict.

## 6. Pencil page structure

Recommended:

```text
00_CrossPlatform_Overview
01_Object_Status_Action_Mapping
02_Web_Admin
03_Mobile_App
04_WeChat_MiniProgram
05_Data_BigScreen
06_Design_System_Shared
07_Platform_Differences
08_Handoff
```

## 7. Cross-platform quality checklist

- Same business object has consistent naming.
- Same status has consistent meaning.
- Same action has consistent outcome.
- Each platform has a clear responsibility.
- Shared tokens/components exist where useful.
- Platform-specific patterns are respected.
- Users can move between platforms without conceptual mismatch.
