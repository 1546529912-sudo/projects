# WeChat Mini Program Rules

Use for WeChat Mini Programs, service mini programs, repair/reporting mini programs, mall mini programs, membership mini programs, appointment mini programs, and WeChat ecosystem flows.

## 1. Core principle

A WeChat Mini Program should be lightweight, fast, task-focused, and aligned with WeChat ecosystem patterns.

Design order:

```text
WeChat entry scenario
→ User intent
→ Page stack / tabBar
→ WeChat capability
→ Lightweight task path
→ Platform constraints
→ Pencil canvas generation
```

## 2. Required intake

Identify:

- Entry path: scan code, share card, service notification, official account, search, mini program list.
- User role.
- Core task.
- Need login/authorization?
- Need phone number authorization?
- Need WeChat Pay?
- Need share?
- Need subscription message?
- Need location/camera?
- tabBar pages.
- Content/data states.

## 3. Frame and safe area

Common frame:

```text
MiniProgram_Home_390x844
MiniProgram_Home_375x812
```

Must consider:

- Status bar.
- Navigation bar.
- Right-side capsule button safe area.
- Title placement.
- Avoid top-right collision.
- Bottom tabBar when relevant.

## 4. Navigation rules

Common structures:

### tabBar structure

```text
Home
Services / Categories
Orders / Records
Messages / Notifications
Mine
```

### Page stack

```text
List → Detail → Form → Result
```

### Service path

```text
Entry → Authorize → Select service → Fill form → Submit → Result → Track status
```

## 5. WeChat capability patterns

Use when relevant:

- WeChat login.
- Phone number authorization.
- WeChat Pay.
- Share to chat/timeline.
- Subscribe message.
- Location authorization.
- Camera/photo upload.
- QR scan.

Do not add these unless relevant.

## 6. Common screen types

### Mini Program home

```text
Service shortcuts
Current status / orders
Promotions or announcements
Recommended actions
tabBar
```

### Service form

```text
Context description
Required fields
Photo/upload area
Location selector
Contact info
Submit button
Authorization hints
```

### Order/detail tracking

```text
Status timeline
Key information
Service contact
Action buttons
Messages/notifications
```

### Mine

```text
User card
Orders/records
Coupons/benefits
Settings
Help
```

## 7. Required components

```text
MiniProgramNavBar
CapsuleSafeArea
TabBar
ServiceCard
OrderCard
StatusTimeline
AuthPrompt
PhoneAuthButton
PaymentButton
ShareButton
SubscribeMessagePrompt
LocationSelector
PhotoUploader
ResultPage
```

## 8. Mini Program states

```text
Default
Loading
Empty
NoLogin
AuthRequired
PhoneRequired
PaymentPending
PaymentSuccess
PaymentFailed
SubmitSuccess
SubmitFailed
LocationDenied
CameraDenied
```

## 9. Quality checklist

- Capsule safe area respected.
- Page path is lightweight.
- tabBar and page stack clear.
- WeChat authorization appears only when needed.
- Payment/share/subscription flows are represented when relevant.
- Mobile tap targets and text sizes are usable.
- Mini Program does not look like a desktop web page.
