# Mobile App Design Rules

Use for iOS apps, Android apps, mobile business apps, field apps, inspection apps, repair apps, work order apps, personnel apps, or any mobile product.

## 1. Core principle

A mobile app screen should be thumb-friendly, task-focused, state-aware, and respectful of device constraints.

Design order:

```text
User context
→ Primary mobile task
→ Navigation model
→ Screen type
→ Interaction states
→ Device constraints
→ Pencil canvas generation
```

## 2. Required intake

Identify:

- Platform: iOS, Android, or both.
- User role.
- Main task.
- Environment: office, field, outdoor, low-light, walking, one-hand use.
- Navigation: tab, stack, modal, sheet.
- Inputs: text, photo, scan, location, voice.
- Offline/weak network needs.
- Permissions: camera, location, notifications, photos.
- Required states.

## 3. Frame sizes

Common:

```text
iOS: 390 × 844
iOS large: 430 × 932
Android: 360 × 800
Android large: 412 × 915
```

Use requested target when known.

## 4. Mobile layout rules

Consider:

- Safe area.
- Status bar.
- Top navigation.
- Bottom tab bar.
- Bottom sheets.
- Floating action button only when appropriate.
- Keyboard state.
- Sticky bottom action.
- Thumb reach.
- Minimum tap target around 44px.
- Scrollable content boundaries.

## 5. Common screen types

### Home / dashboard

```text
Greeting or context
Primary task shortcut
Status summary
Recent items
Bottom navigation
```

### List / feed

```text
Search/filter
Segment tabs
List cards
Status badges
Swipe/row actions if relevant
Empty/loading/error states
```

### Detail

```text
Object header
Status
Key info
Actions
Tabs/sections
Activity/log
```

### Form / submit

```text
Progress/context
Grouped fields
Input validation
Attachment/photo area
Sticky submit
Draft/failed-submit state
```

### Profile / mine

```text
User info
Account actions
Settings
Support/help
Logout
```

## 6. Mobile-specific states

Include where relevant:

```text
Default
Loading
Empty
NetworkError
PermissionRequired
OfflineDraft
Submitting
SubmitFailed
SubmitSuccess
KeyboardOpen
CameraPermissionDenied
LocationPermissionDenied
```

## 7. Required mobile components

```text
MobileNavBar
BottomTabBar
TabBarItem
ListCard
StatusBadge
SearchBar
SegmentControl
BottomSheet
ActionSheet
Toast
EmptyState
PermissionPrompt
FormField
StickyActionBar
PhotoUploader
ScanButton
```

## 8. iOS / Android differences

If both platforms matter:

- iOS: navigation bar, large title, bottom sheet style, safe area.
- Android: Material top app bar, FAB when appropriate, system back behavior.
- Avoid forcing one platform's convention onto the other without reason.

## 9. Quality checklist

- Main task reachable quickly.
- Tap targets usable.
- Safe area respected.
- Bottom nav or page stack clear.
- Keyboard and permissions considered.
- Empty/error/offline states included where needed.
- Mobile screen is not just a shrunken web page.
