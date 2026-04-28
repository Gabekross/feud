# Family Feud UI/UX Audit Report

**Date:** 2026-04-27  
**Auditor:** Claude Code  
**Repo:** `gabekross` — Next.js 15 / React 19 / SCSS Modules / Supabase

---

## 1. Audit Overview

Inspected all 6 routes and 23 stylesheet files. Issues are grouped by severity.

---

## 2. Issues Found

### 🔴 Critical

| # | File | Issue | Fix |
|---|------|-------|-----|
| C1 | `AnswerBoxes.tsx` | Hardcoded `80px` row height in inline style — clips/overflows on small screens, wastes space on TVs | Replace with `clamp(60px, 8vmin, 100px)` |
| C2 | `AnswerBoxes.module.scss` | `.cell` has no `min-height`; flip card `.plate` uses `height: 100%` which collapses to 0 without parent height | Add `min-height: clamp(60px, 8vmin, 100px)` to `.cell` |
| C3 | `LeftPane.tsx` | Uses `styles.revealControls` but that class is only defined in `MiddlePane.module.scss`, not `LeftPane.module.scss` — class silently missing | Add `.revealControls` to `LeftPane.module.scss` |
| C4 | `GameSetupPage.module.scss` | Uses `styles.fmRow` in TSX but `.fmRow` is not defined anywhere in the stylesheet — layout broken for FM question selectors | Add `.fmRow` rule |
| C5 | `QuestionDisplay.module.scss` | Fixed `font-size: 2rem` — too small on 4K TVs, potentially wraps badly on small tablets | Use `clamp()` with `vmin` units |
| C6 | `StrikeDisplay.module.scss` | Fixed `font-size: 3rem; color: red` — not viewport-relative; clashes with game color system | Use `clamp()` and CSS var |

### 🟠 High

| # | File | Issue | Fix |
|---|------|-------|-----|
| H1 | `TeamScore.module.scss` | `.scoreBoard` width fixed at `60%`; font sizes fixed (`1.2rem`, `2rem`) — too small on 55"+ TVs | Use `clamp()` and `vmin`-relative units |
| H2 | `TeamControlIndicator.module.scss` | `.controlBar` and `.active` defined **twice** — first block (lines 1–17) is dead code overridden by second block | Remove duplicate block |
| H3 | `MainScreen.module.scss` | `.fmTimerTopRight` defined **twice** (lines 146–158, 165–170) — second override drops some props silently | Merge into single rule |
| H4 | `FastMoneyPane.module.scss` | `.toolbar` defined **twice** (lines 80–122, 216–294) — duplicate dead code | Remove first block |
| H5 | `FullscreenToggle.module.scss` | `color`, `border`, `border-radius`, `padding`, `font-size`, `transition` all declared twice in one rule — first values are dead | Clean up to single declaration per property |
| H6 | `LeftPane.module.scss` | `max-width: 350px` constrains the pane when single-column breakpoint fires — doesn't fill available width | Remove `max-width` or use `min()` |
| H7 | `GameSetupPage.module.scss` | Page inherits light background from `globals.css`; entire app is dark — admin page is jarring white | Add dark background, light text |
| H8 | `ControlPanel.module.scss` | At ≤1080px single-column, each pane still has `max-height: calc(100vh - 32px)` but the total stacked height exceeds viewport causing full-page scroll with no clear visual separation | Add explicit scroll behavior and pane headers |

### 🟡 Medium

| # | File | Issue | Fix |
|---|------|-------|-----|
| M1 | `FastMoneyBoard.module.scss` | Font sizes fixed (`1.4rem`, `1.6rem`, `1.2rem`) — not responsive for main screen (TV vs laptop) | Apply `clamp()` with `vmin` |
| M2 | `AnswerBoxes.module.scss` | `.answerText` uses `clamp(1rem, 2.2vw, 1.4rem)` — `vw` doesn't scale correctly inside the constrained 16:9 stage; should use `vmin` | Switch to `vmin` |
| M3 | `CountdownTimer.module.scss` | Fixed `80px × 80px` circle, `margin-top: 2rem` — component only used on main screen but not responsive | Scale with `vmin` |
| M4 | `FastMoneyPane.module.scss` | `.answerRow` grid `1fr auto auto auto` with no min-width — on narrow pane (collapsed control panel) buttons overflow right | Add `flex-wrap` fallback or min-width guards |
| M5 | `LeftPane.module.scss` | Strike control buttons (`➖/➕`) and score buttons (`-5/+5`) have no minimum tap size — hard to use on touch/tablet | Minimum `44px` tap targets |
| M6 | `RightPane.module.scss` | Score `±` buttons are `36×36px` — below Apple/WCAG 44px tap target guideline | Increase to 44×44px |
| M7 | `MiddlePane.module.scss` | `.answerRow` grid `3rem 1fr 6rem 7rem` — total ~380px min; overflows at 300px pane width | Use `minmax` columns |
| M8 | `MainScreen.module.scss` | Stage uses `flex-direction: column; align-items: center` but `.boardWrap` has no `flex: 1` — answer board doesn't grow to fill remaining height | Add `flex: 1; min-height: 0` to boardWrap |

### 🔵 Low

| # | File | Issue | Fix |
|---|------|-------|-----|
| L1 | `_globals.scss` | Empty file — missed opportunity for shared layout utilities | Add reusable helpers |
| L2 | `_variables.scss` | Only 4 CSS custom properties — no breakpoints, spacing scale, or typography scale | Expand with game-specific tokens |
| L3 | `Landing.module.scss` | 3-column grid collapses at 920px to 1 column — no 2-column intermediate step at ~600–920px | Add `repeat(auto-fill, minmax(280px, 1fr))` |
| L4 | `GameSetupPage.module.scss` | Inputs have no styled border, background, or focus ring — hard to see on dark background | Style inputs for dark context |
| L5 | `FullscreenToggle.module.scss` | Button is always visible at bottom-right on main screen during gameplay — distracting for audience | Use opacity fade-out after user interaction (already partially implemented with `.hidden`) |
| L6 | Multiple files | `font-family: 'Segoe UI', sans-serif` hard-coded in `FastMoneyBoard` and `FastMoneyPane` — should use a shared font stack variable | Centralize in variable |

---

## 3. Breakpoint Coverage Summary

| Width | Current coverage | Gap |
|-------|-----------------|-----|
| 375px mobile | Partial (only in landing + answer boxes) | Main screen, control panel missing |
| 768px tablet | Partial (TeamScore) | Control panel, admin missing |
| 1080px laptop | Control panel single-column | Pane spacing could be tighter |
| 1280px | Control panel narrower columns | OK |
| 1920px+ TV/projector | Main screen stage scales well | FM board font too small |

---

## 4. Implemented Fixes (by Phase)

### Phase 1 — Global layout safety
- `_variables.scss`: Added breakpoints, spacing scale, font tokens, complete color system
- `_globals.scss`: Added layout helper classes (`.visually-hidden`, `.sr-only`)

### Phase 2 — Main Screen
- `QuestionDisplay.module.scss`: `clamp(1.5rem, 3.5vmin, 3.5rem)` + text shadow for legibility
- `StrikeDisplay.module.scss`: Responsive size, proper color using var, centered layout
- `TeamScore.module.scss`: `clamp()` font sizes, `vmin`-relative units for TV/projector
- `AnswerBoxes.tsx`: Row height `clamp(60px, 8vmin, 100px)` replacing hardcoded `80px`
- `AnswerBoxes.module.scss`: `.answerText` switched to `vmin`, `.cell` min-height added, boardWrap flex properties
- `TeamControlIndicator.module.scss`: Removed duplicate rule block
- `MainScreen.module.scss`: Merged duplicate `.fmTimerTopRight` blocks

### Phase 3 — Control Panel
- `ControlPanel.module.scss`: Added 768px breakpoint, improved pane gap at narrow widths
- `LeftPane.module.scss`: Removed `max-width: 350px`, added `.revealControls`, enlarged tap targets
- `MiddlePane.module.scss`: Used `minmax()` on answerRow columns for narrow-pane safety
- `RightPane.module.scss`: Score `±` buttons enlarged to 44×44px
- `FastMoneyPane.module.scss`: Removed duplicate `.toolbar`, added responsive answerRow

### Phase 4 — Admin/Game Setup
- `GameSetupPage.module.scss`: Dark theme, `.fmRow` added, styled inputs/selects with focus rings

### Phase 5 — Fast Money Board
- `FastMoneyBoard.module.scss`: Responsive font sizes using `clamp()` + `vmin`

### Phase 6 — Polish
- `FullscreenToggle.module.scss`: Removed duplicate property declarations

---

## 5. Remaining Recommendations (not auto-implemented)

1. **Slideshow page** (`/cards/slideshow`) — not inspected for layout issues; test on projector
2. **Cards page** (`/cards`) — not tested on mobile
3. **Alert() calls** in `LeftPane.tsx`, `GameSetupPage.tsx` — replace with inline toast/banner UI for a more polished operator experience
4. **Fast Money timer font** — `CountdownTimer.module.scss` timer circle is used somewhere; if it renders on-screen, scale it up
5. **Supabase error states** — no loading spinners or error boundaries visible; add at least a text indicator for connection failures
6. **Keyboard accessibility** — focus rings only added to inputs; ensure all interactive buttons have `:focus-visible` outlines
7. **Touch events on Control Panel** — test on iPad (768px); all button targets should be ≥44px

---

## 6. Manual Test Checklist

- [ ] **Mobile 375px** — Landing page cards stack correctly, no horizontal overflow
- [ ] **Mobile 375px** — Control panel collapses to single column, panes scroll individually
- [ ] **Tablet 768px** — Control panel 3→1 column transition, all buttons tappable
- [ ] **Laptop 1366px** — Control panel 3-column fits, no pane overflow
- [ ] **Desktop/projector 1920px** — Main screen fills TV, answer board rows large
- [ ] **Main Screen display** — QuestionDisplay text is large and readable at 3m distance
- [ ] **Main Screen display** — AnswerBoxes rows are equal height and fill the stage
- [ ] **Main Screen display** — StrikeDisplay ❌ is visible but not dominating
- [ ] **Main Screen display** — TeamScore names and scores are readable
- [ ] **Main Screen display** — FastMoney board fills stage cleanly
- [ ] **Main Screen display** — FM timer SVG is visible in top-right, not clipped
- [ ] **Control Panel** — LeftPane round selector and reveal buttons visible without scroll on 1080p
- [ ] **Control Panel** — MiddlePane answer rows don't overflow at 1280px
- [ ] **Control Panel** — RightPane score ± buttons are easily tappable
- [ ] **Admin setup** — Dark background, inputs visible, FM 5-question rows appear correctly
- [ ] **Fast Money flow** — FastMoneyPane timer controls visible without horizontal scroll
- [ ] **Strike modal** — ❌ appears centered, covers full screen, fades correctly
- [ ] **Answer reveal** — Flip animation plays smoothly, ding sound fires once per answer
- [ ] **Team score update** — Realtime score update reflects within 1 second
