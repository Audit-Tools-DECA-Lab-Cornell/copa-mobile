# Playspace Audit Tool — Design System

## Phase 2: Component Patterns & Elevated Design Language

### (Updated: typography correction applied)

-----

## Typography Correction — Applied After Phase 1 Review

**Problem identified:** JetBrains Mono at wide letter-spacing on long uppercase labels reads as "military inventory system." The academic project used mono labels successfully because they were (a) one word, (b) surrounded by serif body text. Our labels are long phrases in a sans-serif context.

**Revised mono rule — use JetBrains Mono ONLY for opaque coded data:**

|Use mono for                  |Do NOT use mono for                     |
|------------------------------|----------------------------------------|
|Auditor codes: `AUD-2847`     |Domain eyebrows: "Domain 3 · Play Value"|
|Timestamps: `2026-05-06 14:32`|Status badges: "Complete"               |
|Raw score totals: `34/40`     |Progress counters: "Question 7 of 12"   |
|Instrument version: `v5.2`    |Section labels in sidebar               |
|Table column data (numeric)   |Any label longer than ~12 chars         |

**Updated label typography:**

```
Domain eyebrow:   Space Grotesk, 11px, weight 500, tracking 0.03em
                  — warm, confident, not clinical

Status badge:     Geist, 11px, weight 500, tracking 0.02em
                  — readable, approachable

Score dimension:  Space Grotesk, 10px, weight 600
                  — slightly heavier than eyebrow, short (2-3 chars)

Progress counter: Geist, 12px, weight 400
                  — "Question 7 of 12" reads as prose, not a code

Sidebar section:  Geist, 11px, weight 500, tracking 0.04em, uppercase
                  — "MANAGER", "SETTINGS" — short enough for modest tracking

JetBrains Mono:   Auditor codes, timestamps, raw totals, IDs only
```

-----

## The "Grand but Clean" Principle for a Research Tool

The academic project felt grand because every element was doing exactly one job with total confidence. Typography didn't apologize for its weight. Colors didn't hedge their meaning. Whitespace felt like a deliberate exhale between pieces of information that mattered.

For the audit tool, "grand" means: every component knows what it is, the hierarchy is so clear you never have to think about it, and the visual texture communicates that the work happening in it is serious.

Specific techniques that create this feeling:

**Double-bezel architecture.** Cards sit inside an outer shell — an outer wrapper with a near-invisible hairline border, and an inner core with a subtle inset highlight at the top edge. The card feels like it has physical thickness. The difference between a card that looks like a div and a card that looks like a component.

**Spotlight borders.** Place and project cards have no border until the cursor approaches — then a radial gradient in terracotta traces the card edge from wherever the cursor is. Costs nothing in implementation complexity, completely non-generic.

**Breathing status dots.** Live states pulse slowly at 2.4s. Slow enough to feel calm, fast enough to register as alive. Completed states are perfectly still.

**Spring physics everywhere.** `cubic-bezier(0.32, 0.72, 0, 1)` — fast start, asymptotic finish. This is the easing that makes things feel physical. Linear and ease-in-out are banned.

**Count-up stats.** Manager dashboard numbers count up on load. Draws the eye to what's current.

-----

## Component Catalogue

### 1. Stat / Metric Card (Manager Dashboard)

Three or four per row at the top of the manager dashboard.

**Structure:** Double-bezel.

```
Outer shell:  background surfaceRaised
              border 0.5px rgba(255,255,255,0.055)
              padding 2px, border-radius 14px
              hover: border-color rgba(197,138,92,0.25), transition 0.4s spring

Inner core:   background surface
              border-radius 12px
              border 0.5px rgba(255,255,255,0.03)
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.04)
              top gradient overlay: rgba(255,255,255,0.025) → transparent, 40% height
```

**Content:**

```
Eyebrow:   Geist 11px 500, textMuted, uppercase, tracking 0.04em
Number:    Space Grotesk 32px 700, tracking -0.03em — color by variant
Label:     Geist 12px, textSecondary + status dot
```

**Variants:** neutral (textPrimary) · active (terracotta + breathing dot) · complete (moss)

**Count-up:** numbers animate 0→target on mount. Duration 700–900ms, cubic-bezier(0.32,0.72,0,1). IntersectionObserver trigger. Only on first mount.

-----

### 2. Place Card

**Structure:** Standard raised card + CSS spotlight border.

```
Background:  surfaceRaised
Border:      0.5px solid var(--edge) default
Spotlight:   ::before pseudo, radial-gradient 220px at cursor position
             rgba(197,138,92,0.22) → transparent 70%
             opacity 0 default, 1 on hover
Hover:       translateY(-1px), 0.3s spring
```

**Content anatomy:**

```
Place name:      Space Grotesk 13px 600, textPrimary, tracking -0.01em
Location/Project: Geist 11px, textMuted
Score pair:       ScoreDisplayCompact component
Status badge:     see §7
```

**States:** default · hover (spotlight) · selected (solid terracotta border) · loading (skeleton shimmer)

-----

### 3. Project Card

Double-bezel (projects feel more significant than individual places).

Adds a **2px left border accent** in terracotta when the project has active audits. Creates instant visual rhythm — active vs. inactive projects distinguishable at a glance without reading anything.

**Content:**

```
Header:     Project name (Space Grotesk h3) + creation date (JetBrains Mono 10px textMuted)
Stats row:  Places count · Audits complete · Mean PV · Mean U (ScoreDisplayCompact)
Footer:     Status badge + last activity (JetBrains Mono timestamp)
```

-----

### 4. Score Display — Compact

Used inline in place cards, assignment rows, audit list items.

```
[PV] [4.2] · [U] [3.7]
```

- Dimension labels: Space Grotesk 10px 600, violet
- Numbers: Space Grotesk, size by context (22px in cards, 16px in rows)
- Separator: "·" in Geist, textMuted, opacity 0.5
- Not measured: em dash "—" in textMuted
- Color: moss for complete, terracotta for in-progress, textMuted for not-measured

-----

### 5. Score Display — Full

Used on place detail, audit report, manager place deep-dive.

Three columns: PV | U | S

```
Per column:
  Dimension name:  Space Grotesk 10px 600, violet, uppercase, tracking 0.02em
                   "PLAY VALUE" / "USABILITY" / "SOCIABILITY"
  Large number:    Space Grotesk 36px 700, moss (or textMuted if not measured)
  Expanded label:  Geist 11px, textMuted — "Play Value", "Usability", "Sociability"
  Raw total:       JetBrains Mono 10px, textMuted — "34/40" (only place mono is right here)
```

Count-up on first render. 1000ms, spring easing.

-----

### 6. Audit Section Block (Field Form)

The most important component in the product.

**Full structure:**

```
┌─ Header ──────────────────────────────────────────────────────┐
│  [Domain N · Domain Name]   Space Grotesk 11px 500, violet    │
│                              tracking 0.03em — NOT mono        │
│  [Section Heading]          Space Grotesk 16px 600, textPrimary│
│  [Question N of M · Section P of Q]                           │
│                             Geist 12px 400, textMuted          │
│  [████████░░░░░░░░]         2px progress bar, violet fill      │
└───────────────────────────────────────────────────────────────┘
┌─ Body ────────────────────────────────────────────────────────┐
│  [Question text]            Geist 13px 400, textSecondary, 1.6│
│                                                                │
│  [▶ Provision scale]        Geist 13px, spring expand         │
│    [0 None][1 Limited][2 Moderate][3 High]                     │
│    Buttons: violet hover, spring select                        │
│                                                                │
│  [Auto-save indicator]      Geist 11px, textMuted, bottom-right│
│                             "Saved locally" — ambient, no toast│
└───────────────────────────────────────────────────────────────┘
```

**Progress bar color:** violet — it's tracking position within the PVUA instrument, not generic task progress.

**Provision toggle:** spring animation, max-height transition, cubic-bezier(0.32,0.72,0,1).

**Auto-save:** ambient label only. Never a toast, never a banner. Geist 11px textMuted in the bottom-right corner of the block.

-----

### 7. Status Badge

```
Font:    Geist 11px 500, tracking 0.02em — NOT mono, NOT uppercase forced
         (badge text can be sentence case: "Complete", "In progress")
Radius:  4px — square, not pill. Discrete categorical states.
Border:  0.5px

States:
  Complete / Submitted:  moss surface + border, moss text
  In Progress / Draft:   terracotta surface + border, terracotta text
  Pending:               textMuted at 10%/20%, textMuted text
  Flagged:               warning surface + border, warning text
  Error:                 danger surface + border, danger text
```

-----

### 8. Sync Status Island (Mobile)

Floating pill. Appears at top of execute screen when sync state is not idle.

```
Pill:   border-radius 24px
        box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)

States:
  Offline:  amber dot (breathing 2s) + "Offline" label
            amber border
            Always visible during offline session

  Syncing:  terracotta dot (1.2s pulse) + "Syncing..." label
            terracotta border
            Visible during sync

  Synced:   moss dot (static) + "Synced" label
            moss border
            Fades out after 1.5s

Labels:    Geist 11px 500 — NOT mono
Dot:       7px circle, breathing/pulsing/static by state
Transition:450ms cubic-bezier(0.32,0.72,0,1) on all properties
Entrance:  spring from translateY(-8px) opacity-0 → translateY(0) opacity-1
```

-----

### 9. Audit Progress Dots (Mobile)

Six dots showing domain progress. Lives at top of execute tab.

```
[Millbrook Park · Audit #3]     Geist 13px 600
[Domain 3 of 6 · 58% complete] Geist 11px 400, textMuted
[●●●○○○]                        6 dots
                                 Completed: moss
                                 Active:    terracotta
                                 Remaining: edge color

Dot transition on domain advance:
  Active → Completed: terracotta → moss, 0.4s spring
  Next → Active:      edge → terracotta, 0.3s spring, 100ms delay
```

-----

## Interaction Vocabulary

```css
/* Easing — all interactive elements use these */
--ease-spring:    cubic-bezier(0.32, 0.72, 0, 1)   /* primary */
--ease-out-fast:  cubic-bezier(0.0, 0.0, 0.2, 1.0) /* enters */
--ease-in-fast:   cubic-bezier(0.4, 0.0, 1.0, 1.0) /* exits */

/* Durations */
micro:      150ms   /* hover, focus ring */
standard:   200ms   /* state change, badge */
component:  300ms   /* card hover, collapse */
spring:     400–500ms /* modal, island, drawer */
narrative:  700ms+  /* count-up */
```

**Touch feedback (mobile):** `active:scale-[0.97]` on all Pressable/Button, 150ms spring.

**Reduced motion:** All animations respect `prefers-reduced-motion: reduce`. Instant text, instant numbers, no breathing dots.

-----

## What Not To Do

- No gradients on canvas backgrounds
- No pill-shaped status badges
- No terracotta on non-interactive elements
- No wide-tracked mono on long human-readable labels
- No decorative icons inside the audit form
- No more than one animated element visible at a time
- Never hardcode hex values in components — always use CSS custom properties / Tamagui tokens
