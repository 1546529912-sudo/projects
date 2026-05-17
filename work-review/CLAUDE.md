# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeChat Mini Program for work journaling: voice/text input → AI extraction → daily report generation. Uses WeChat Cloud Development exclusively (no separate backend in production; the `backend/` directory is an unused Laravel scaffold).

Cloud environment ID: `cloud1-d9gzx1q5h5edcca4a` (set in `miniprogram/app.js`).

## Development

There is no local build or test runner. Development is done entirely through the **WeChat DevTools** IDE:
- Open `project.config.json` at the repo root to load the project
- Cloud functions are deployed by right-clicking the function folder in DevTools → "上传并部署（云端安装依赖）"
- Cloud function timeouts must be set in **both** `config.json` (field `"timeout"`) and the WeChat Cloud Console

## Architecture

### Data flow

```
User voice/text
  → index.js (recording + upload)
  → doASR cloud function (Volcengine 豆包 WebSocket streaming ASR)
  → ai-confirm page (review AI-extracted projects)
  → aiExtract cloud function (DeepSeek JSON extraction)
  → work_records collection (stores raw text + structured projects)
  → report page
  → createReport cloud function (pure render, no DB)
  → saveReport cloud function → daily_reports collection
```

### Cloud functions (`cloudfunctions/`)

| Function | Purpose |
|---|---|
| `doASR` | Volcengine 豆包 streaming ASR via binary WebSocket protocol. Downloads audio from Cloud Storage, sends in two frames (config + audio), parses binary response frames. Has 1 retry with 1.5s delay for server-side timeouts. |
| `aiExtract` | Calls DeepSeek API (`deepseek-chat`) with `response_format: json_object`. Returns `{ projects, summary, tomorrow_focus }`. Has mock fallback when `AI_PROVIDER=mock`. |
| `createReport` | Pure function — takes project array, renders personal and formal report text. No DB writes. |
| `saveReport` | Upserts to `daily_reports` by `(openid, reportDate)`. |
| `getReportHistory` | Queries `daily_reports` filtered by `openid`. |
| `healthCheck` | Returns `asrProvider`, `aiProvider`, DB connectivity. Used by settings page to show provider status badges. |

**Cloud function environment variables** are loaded via `dotenv` from a `.env` file in each function directory. Copy `.env.example` → `.env` and fill in credentials. The `config.json` for each function must **not** contain an `environment.variables` block — it overrides `.env` and will force mock mode.

### Mini program (`miniprogram/`)

**All cloud calls must go through `utils/cloud.js`** — never call `wx.cloud.callFunction` directly from pages. `callCloud` wraps the call with a 30s timeout and normalises `{ code, data, message }` responses.

**Database collections:**
- `work_records` — one document per recording session; contains `date`, `rawText`, `projects[]`, `summary`, `tomorrow_focus`
- `daily_reports` — one document per user per date; contains `personalText`, `formalText`, `content`, `openid`, `reportDate`
- `ai_logs` — AI call telemetry

**Tab bar** (`custom-tab-bar/`): uses `"custom": true` in `app.json`. Tab pages (index, history, settings) get the tab bar automatically; non-tab pages that need it (e.g. `ai-confirm`) must add it via `usingComponents` in their page JSON. Every tab page must call `this.getTabBar().setSelected(n)` in `onShow`.

**Navigation rules:**
- Use `wx.switchTab` to navigate to tab pages (index, history, settings)
- Use `wx.navigateTo` for non-tab pages (record, ai-confirm, report)

**`ai-confirm` page** has `"navigationStyle": "custom"` — no native nav bar. It handles two entry modes:
- `?text=...` — new recording, calls `aiExtract` cloud function
- `?recordId=...` — existing record from home page, loads from `work_records` directly

**`report` page** handles two modes via `?mode=`:
- `mode=view` (from history page) — loads saved report from `daily_reports`, falls back to regenerating if none found
- `mode=generate` or omitted (from ai-confirm) — always regenerates by calling `createReport`

**`scroll-view` height pattern**: WeChat `scroll-view` with `scroll-y` needs an explicit height. The app uses `flex: 1; height: 0` on the scroll-view CSS class (inside a flex column container) rather than JS-calculated pixel heights, which are fragile across screen sizes.

**rpx units**: all sizing uses `rpx`. For dynamic calculations in JS, convert with `sys.windowWidth / 750 * rpxValue`.

**Icon pattern**: all icons use SVG `mask-image` on a coloured `<view>`, not `<image>` tags. See `custom-tab-bar/index.wxss` for examples.
