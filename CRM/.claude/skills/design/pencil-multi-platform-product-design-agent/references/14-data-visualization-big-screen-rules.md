# Data Visualization Big Screen Rules

Use for data big screens, command centers, control rooms, smart-building dashboards, park/city dashboards, BIM operation screens, energy monitoring, safety monitoring, project progress screens, and real-time visualization walls.

## 1. Core principle

A big screen is for situational awareness and decision support, not decorative charts.

Design order:

```text
Decision scenario
→ Audience
→ KPI hierarchy
→ Alert priority
→ Spatial layout
→ Chart selection
→ Real-time states
→ Readability from distance
→ Pencil canvas generation
```

## 2. Required intake

Identify:

- Screen size: 1920×1080, 3840×2160, multi-screen.
- Viewing distance.
- Audience: leadership, operations, command center, security, maintenance.
- Main decisions.
- Data freshness.
- Real-time/refresh frequency.
- Map/BIM/floor plan required?
- Alert severity levels.
- Interaction: passive display or operator interaction.

## 3. Frame sizes

Common:

```text
BigScreen_Overview_1920x1080
BigScreen_Overview_3840x2160
BigScreen_CommandCenter_1920x1080
```

## 4. Layout patterns

### Left-center-right command layout

```text
Left: KPI groups / rankings / trends
Center: map / BIM / floor plan / core status
Right: alerts / event list / operational details
Bottom: timeline / trend / comparison
```

### Top KPI + map + detail

```text
Top: core KPIs
Center: spatial view
Bottom/right: trends and alerts
```

### Monitoring wall

```text
KPI strip
Grid of subsystem cards
Alert panel
Event stream
```

## 5. Data hierarchy

Classify:

```text
Level 1: Command KPI
Level 2: Business breakdown
Level 3: Exception / alert
Level 4: Detail list
Level 5: Raw supporting data
```

Do not give all data equal weight.

## 6. Chart selection

Use charts by decision:

- Trend over time: line/area chart.
- Comparison/ranking: bar chart.
- Composition: stacked bar/donut only when useful.
- Location/spatial: map/floor/BIM.
- Flow: sankey/flow only when relationship matters.
- Status: KPI card, progress ring, status grid.
- Alert: severity list, flashing indicator only for critical issues.

Avoid decorative charts without analytical purpose.

## 7. Big-screen visual rules

- Prefer dark background if appropriate.
- Use high contrast.
- Text must be large enough for distance.
- Reduce dense labels.
- Use clear KPI numbers.
- Avoid tiny table text.
- Use calm animations; do not over-animate.
- Alerts should be visually prioritized.
- Use consistent semantic colors.

## 8. Real-time states

Include when relevant:

```text
Live
Refreshing
DataDelayed
DataDisconnected
AlertCritical
AlertWarning
NoSignal
SystemMaintenance
```

## 9. Required components

```text
BigScreenLayout
KpiStrip
KpiCardLarge
AlertPanel
EventStream
MapPanel
BimPanel
FloorPlanPanel
TrendChart
RankingChart
StatusGrid
SubsystemCard
RefreshIndicator
TimeRangeSelector
```

## 10. Quality checklist

- Main decision visible within 3 seconds.
- KPI hierarchy clear.
- Alerts prioritized.
- Center visual has purpose.
- Text readable at distance.
- Data freshness visible.
- Charts match data questions.
- Not just a dark dashboard with random charts.
