# Playspace Audit Tool — Design System

## Phase 3: Surface Modes & Layout Specifications

---

## What Phase 3 fixes

Based on the current implementation screenshots, three structural problems need
solving before the design can feel "grand":

1. **No layout hierarchy.** Four equal stat cards, full-width sections,
   equal-weight domain cards. The eye has nowhere to go. Everything competes.

2. **Chart colors are not from the design system.** The bar charts use neon
   green and orange — Recharts defaults that were never overridden. These
   visually dominate the entire report view with colors that belong to no token.

3. **The audit code badge is too harsh.** `FIELDTES · STEWARTPARKI-AUD` in
   black with white all-caps text reads like a serial number. It's the most
   visually aggressive element on the most important surface (recent activity).

Phase 3 addresses all three through layout spec, chart token mapping, and
component correction.

---

## Surface Mode Definitions

| Surface                  | Context                           | Density | Layout model               |
| ------------------------ | --------------------------------- | ------- | -------------------------- |
| A — Manager Dashboard    | Desk, full screen, data-review    | Medium  | Asymmetric bento grid      |
| B — Field Form (Execute) | Outdoor, mobile/tablet, task mode | Low     | Single-column, full-height |
| C — Print / Export       | PDF output, paper                 | High    | Academic report layout     |

---

## Surface A: Manager Dashboard

### Asymmetric bento grid

Replace the four equal cards with a 6-column grid where visual weight maps to
information importance.

```
Desktop (≥1280px):

┌─────────────────────────────────────────────────────────────┐
│  HERO BANNER — org name, subtitle, CTA buttons  (full width)│
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────┬──────────┬────────────────┐
│  ACTIVE AUDITS       │  PLACES  │ AUDITORS │   COMPLETED    │
│  48px terracotta     │  32px    │   32px   │   32px moss    │
│  + breathing dot     │  neutral │  neutral │                │
│  3 columns wide      │  1 col   │  1 col   │   1 col wide   │
└──────────────────────┴──────────┴──────────┴────────────────┘

┌──────────────────────────────┬──────────────────────────────┐
│  RECENT ACTIVITY             │  PROJECT STATUS              │
│  Last 5 submitted audits     │  Per-project progress bars   │
│  3 columns wide              │  3 columns wide              │
└──────────────────────────────┴──────────────────────────────┘
```

Why Active Audits gets the hero card: it's the only number requiring action
today. "30 places" is background. "8 in progress" is today's work.

```css
.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
}
.card-active-audits {
    grid-column: span 3;
}
.card-places {
    grid-column: span 1;
}
.card-auditors {
    grid-column: span 1;
}
.card-completed {
    grid-column: span 1;
}
.card-recent {
    grid-column: span 3;
}
.card-projects {
    grid-column: span 3;
}
```

Tablet (768–1279px): collapse to 2-col, active audits full-width top.
Mobile: single column, active audits first.

---

### Stat cards — updated spec

**Active Audits (hero):**

```
Number:      Space Grotesk 48px 700, accentTerracotta
Status dot:  10px breathing dot, terracotta
Eyebrow:     Geist 11px 500, uppercase tracking 0.04em, textMuted
Sub-info:    "+ 2 since yesterday" Geist 12px textMuted (if data available)
BezelCard:   Yes, hover glow opacity 0.35
```

**Places / Auditors (neutral):**

```
Number:      Space Grotesk 32px 700, textPrimary
BezelCard:   Yes, hover glow opacity 0.25
```

**Completed:**

```
Number:      Space Grotesk 32px 700, accentMoss
BezelCard:   Yes
```

**Remove the top border accent colors.** The current terracotta/violet/gold/teal
top borders are decorative — they don't mean anything. Remove them. Number color
alone carries the semantic signal.

---

### Recent activity — redesigned rows

The current design has the audit code as a prominent black badge. Redesign
the information hierarchy of each row:

```
CURRENT:
  [Black badge: FIELDTES · STEWARTPARKI-AUD]  [Date]
  Place name
  [Submitted badge]                    [Score PV 16 | U 128]

NEW:
  [Place name — Space Grotesk 14px 600]   [PV 4.2 · U 3.1 — ScoreDisplayCompact]
  [Project name — Geist 12px textSecondary]
  [Auditor · timestamp — Geist 11px textMuted]   [Complete badge]
  [fieldtes-aud-001 — Geist 11px textMuted, no background]
```

Key changes:

- Place name is the headline, not the audit code
- Audit code has no badge treatment — plain textMuted, tertiary row
- Score shows normalized score (4.2) not raw total (16)
  Raw totals belong on the detail view only
- Row hover: tableRowHover background, no card lift (this is a feed, not cards)
- Row separator: 0.5px var(--edge)

---

### Project status panel

Right column beside recent activity.

```
Header: "Projects" Space Grotesk 15px 600 + "View all →" right-aligned

Per project row:
  Name:         Geist 13px 500, textPrimary
  Progress bar: 4px height
                terracotta = in-progress portion
                moss = complete portion
                edge = remaining
  Sub-label:    "4 of 7 places audited" Geist 11px textMuted
  Separator:    0.5px edge divider between rows
Card:           SpotlightCard (not double-bezel — it's a list)
```

---

## Surface A: Report View (Image 1 problem)

### Chart colors — replace Recharts defaults

```typescript
export const CHART_COLORS = {
    primary: "var(--accent-terracotta)",
    secondary: "var(--accent-moss)",

    // Domain series — one color per domain, consistent everywhere
    provision: "var(--accent-terracotta)",
    diversity: "var(--accent-slate)",
    challenge: "var(--accent-moss)",
    sociability: "var(--accent-violet)",
    playValue: "var(--accent-terracotta)",
    usability: "var(--accent-slate)",

    // Score threshold fill
    scoreHigh: "var(--accent-moss)", // ≥ 75%
    scoreMid: "var(--status-warning)", // 50–74%
    scoreLow: "var(--status-danger)", // < 50%

    // Chart chrome
    grid: "var(--edge)",
    axis: "var(--text-muted)",
    tooltipBg: "var(--surface-raised)",
    tooltipBorder: "var(--edge)",
};
```

### Domain card headers — replace colored banners

```
Before: Full-width terracotta background bar, white centered text
After:  Surface card, 3px left border in domain accent color
        Domain name: Space Grotesk 13px 600, textPrimary (left-aligned)

Domain → border color:
  Provision:           accentTerracotta
  Diversity:           accentSlate
  Challenge Opp.:      accentMoss
  Sociability Support: accentViolet
  Play Value:          accentTerracotta
  Usability:           accentSlate
```

The left border is a single-sided border — border-radius: 0 on that side.

---

## Surface B: Execute / Field Form

### Mobile layout

```
┌────────────────────────────┐
│  [← Back]        [···]     │  44px top bar
├────────────────────────────┤
│  [AuditProgressDots]       │  pinned — never scrolls
├────────────────────────────┤
│                            │
│  [AuditSectionBlock]       │  flex-1, scrollable internally
│                            │
├────────────────────────────┤
│  [← Prev]    [Next →]      │  fixed bottom — 64px
│  [Saving...]               │  auto-save indicator
└────────────────────────────┘
```

Navigation buttons:

- Next →: full-width terracotta when answered, outlined/muted when unanswered
  (not disabled — auditors can skip)
- ← Prev: ghost button, textSecondary
- AuditProgressDots always visible above the section block

### Web execute (tablet+) — two-pane

```
┌────────────┬──────────────────────────────────────────┐
│ Domain nav │  [AuditSectionBlock]                     │
│ panel      │                                          │
│            │  [Response area]                         │
│ ● done     │                                          │
│ ◉ active   │  [← Prev]               [Next →]        │
│ ○ todo     │                                          │
└────────────┴──────────────────────────────────────────┘
```

Domain nav left panel: vertical list of domain names.
Moss dot = complete. Terracotta dot = active. Edge dot = todo.

---

## Surface C: Print / Export

### Forced tokens (override all user preferences)

```
Canvas:     #ffffff
Surface:    #ffffff
Raised:     #f7f1eb  (subtle warmth, distinguishes sections)
Text:       #1a1612
Borders:    rgba(0,0,0,0.12)
Shadows:    none
```

### Report page structure

```
Page 1 — Cover:
  Playspace name         Space Grotesk 28px 700
  Project · date · auditor
  Instrument version     JetBrains Mono 11px textMuted
  ScoreDisplayFull       PV · U prominent

Page 2+ — Domain breakdowns:
  Domain name + 3px left border (domain accent color)
  Score bar (chart color mapping)
  Item table: question · response · score
  Domain total

Final page — Methodology note:
  Brief citation: Morgenthaler et al. (2024)
  Instrument version + scoring guide reference
```

The methodology note is not optional. The PDF often leaves the research team
as a deliverable. It should carry the academic provenance of the tool.

---

## Phase 3 Checklist

**Web:**

- [ ] Implement 6-column bento grid for manager dashboard
- [ ] Active Audits hero card: 3-col span, 48px number, larger breathing dot
- [ ] Remove decorative top border colors from all stat cards
- [ ] Redesign recent activity rows per new information hierarchy
- [ ] Remove black audit code badge — plain textMuted identifier only
- [ ] Add Project Status panel (right column, progress bars per project)
- [ ] Replace all Recharts color configs with CHART_COLORS token map
- [ ] Replace domain card full-width colored headers with 3px left-border pattern
- [ ] Score in feed/list views shows normalized score, not raw total

**Mobile:**

- [ ] AuditProgressDots pinned below top bar, never scrolls away
- [ ] Fixed bottom navigation: full-width terracotta Next, ghost Prev
- [ ] Auto-save indicator in bottom nav area

**Both:**

- [ ] Normalized scores in list/activity contexts
- [ ] Raw totals (16/28) only in detail views and exports
