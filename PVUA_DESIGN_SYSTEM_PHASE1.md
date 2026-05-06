# Playspace Audit Tool — Design System

## Phase 1: Foundations (Color + Typography)

---

## Overview

This document establishes the foundational design tokens for the Playspace Play Value and Usability Audit (PVUA) tool — covering the web dashboard (`audit-tools-playspace-frontend`) and the native mobile field app (`audit-tools-playspace-mobile`). It is the authoritative source of truth for all color and typography decisions.

### Design intent

The product serves two personas in distinct contexts:

- **Managers** at a desk, reviewing projects, places, and audit outcomes across time. Needs: data density, status clarity, comparison at a glance.
- **Auditors** outside — on a playground, in variable light, sometimes offline. Needs: focus, legibility, a clear sense of progress, and confidence that their work is being saved.

The design must feel like a **serious research instrument**, not a consumer app. It should communicate that the work happening through it has real impact on real play spaces for real children — without ever saying so out loud. The visual language does that work.

### Surface modes

The design system has three distinct surface modes that share one token vocabulary but apply it at different densities:

| Mode             | Context                    | Primary concern                                |
| ---------------- | -------------------------- | ---------------------------------------------- |
| **Dashboard**    | Manager/admin web, desktop | Scannability, data comparison, status overview |
| **Field**        | Auditor web + mobile       | Focus, legibility, one task at a time          |
| **Print/Export** | PDF report output          | Light mode forced, clean for paper             |

---

## Part 1: Color System

### 1.1 Design principles

- **Dark mode is primary.** The web app defaults dark. The mobile app is always dark. Light mode is a secondary mode used for settings preference and as the forced mode for print/export.
- **Color encodes meaning, not decoration.** Each accent color has one job. Terracotta is the interactive color. Moss is the outcome/score color. Slate is the informational color. Violet is the methodology color. These roles are not interchangeable.
- **Surface hierarchy through lightness, not color.** The background stacking (canvas → surface → surfaceRaised) is communicated exclusively through lightness contrast, not hue shifts. A minimum of 5 lightness points between adjacent levels.
- **Semantic status colors are consistent across both apps.** The same hex that signals "complete" on the web dashboard signals "complete" on the mobile report. No drift.

---

### 1.2 Core palette — dark mode

The previous dark palette had a 2–3 lightness point gap between adjacent surface levels, making layers visually ambiguous. The new palette spreads the range, starting from a deeper base.

```
Canvas:         #171310    HSL(28, 21%, 9%)    — page background
Surface:        #211c17    HSL(28, 21%, 13%)   — card/panel background
SurfaceRaised:  #2c241d    HSL(28, 21%, 18%)   — elevated cards, dropdowns
SurfaceSunken:  #120f0c    HSL(28, 21%, 7%)    — inset inputs, code blocks

TextPrimary:    #ede5d8    HSL(33, 35%, 88%)   — headings, primary content
TextSecondary:  #c4b9ae    HSL(28, 21%, 72%)   — descriptions, body in cards
TextMuted:      #968880    HSL(28, 15%, 55%)   — labels, hints, placeholders

Edge:           #3d342c    HSL(28, 16%, 20%)   — borders, dividers
Focus:          #d09a70    HSL(28, 52%, 63%)   — focus rings, keyboard nav
```

**Contrast ratios (dark mode):**

- TextPrimary on Canvas: ~12.4:1 (exceeds WCAG AAA)
- TextSecondary on Canvas: ~7.2:1 (exceeds WCAG AA)
- TextMuted on Canvas: ~4.6:1 (passes WCAG AA)
- TextMuted on SurfaceRaised: ~3.9:1 (passes WCAG AA for large text)

---

### 1.3 Core palette — light mode

Light mode is secondary on web, and the forced mode for PDF/print export. The palette follows the same warm-brown family.

```
Canvas:         #f7f1eb    HSL(35, 34%, 93%)   — page background
Surface:        #fdf8f3    HSL(35, 62%, 97%)   — card/panel background
SurfaceRaised:  #ffffff                         — elevated cards
SurfaceSunken:  #ede6da    HSL(33, 24%, 87%)   — inset areas

TextPrimary:    #1e1a16    HSL(30, 14%, 10%)   — primary content
TextSecondary:  #4a423a    HSL(28, 12%, 26%)   — descriptions
TextMuted:      #7a6e62    HSL(28, 11%, 43%)   — labels, hints

Edge:           rgba(30, 26, 22, 0.15)          — borders (alpha for flexibility)
Focus:          #b8743f    HSL(28, 50%, 48%)   — focus rings
```

---

### 1.4 Accent colors — with assigned roles

Each accent has exactly one semantic role. Overloading these roles (e.g. using terracotta for both CTAs and score display) is what caused ambiguity in the previous system.

#### Terracotta — primary action

The interactive color. Used for: primary buttons, active nav items, focus rings, progress bars, CTAs, selected state on toggles and checkboxes. Nothing else.

```
Dark:   #c58a5c    HSL(28, 47%, 56%)
Light:  #a86332    HSL(28, 54%, 42%)

Surface (dark):   rgba(197, 138, 92, 0.12)
Border (dark):    rgba(197, 138, 92, 0.28)
Surface (light):  rgba(168, 99, 50, 0.10)
Border (light):   rgba(168, 99, 50, 0.24)
```

#### Moss — outcomes and scores

The "this is what was measured" color. Used for: score displays, success states, completed audit status, place_audit_status complete badge, chart lines for score data. Not used for general UI success — only for PVUA score-related success.

```
Dark:   #5e9470    HSL(140, 23%, 47%)
Light:  #3d7554    HSL(147, 32%, 35%)

Surface (dark):   rgba(94, 148, 112, 0.12)
Border (dark):    rgba(94, 148, 112, 0.28)
Surface (light):  rgba(61, 117, 84, 0.10)
Border (light):   rgba(61, 117, 84, 0.24)
```

> **Note on the previous moss:** The previous `accentMoss: "#6f9a7f"` was only slightly deeper than the mid-tone green in the mobile palette's hue drift. Deepening to `#5e9470` makes it more distinct and more legible on dark surfaces.

#### Slate — informational and metadata

The "supporting data" color. Used for: informational banners, link text, data labels in charts, secondary stat displays, info tooltips, auditor code display. Not used for navigation or interactive elements.

```
Dark:   #7a90b7    HSL(218, 30%, 59%)
Light:  #4d6a9a    HSL(218, 33%, 45%)

Surface (dark):   rgba(122, 144, 183, 0.12)
Border (dark):    rgba(122, 144, 183, 0.28)
Surface (light):  rgba(77, 106, 154, 0.10)
Border (light):   rgba(77, 106, 154, 0.24)
```

#### Violet — PVUA methodology

The "instrument" color. Reserved for: domain badges, PVUA scoring dimension labels (PV / U / S), audit instrument section headers, provision-scale items. This color signals "this is from the methodology itself" — it connects the UI to the published research.

```
Dark:   #9b86b2    HSL(270, 22%, 61%)
Light:  #6b52a0    HSL(264, 33%, 47%)

Surface (dark):   rgba(155, 134, 178, 0.12)
Border (dark):    rgba(155, 134, 178, 0.28)
Surface (light):  rgba(107, 82, 160, 0.10)
Border (light):   rgba(107, 82, 160, 0.24)
```

---

### 1.5 Semantic status colors

These apply across both web and mobile for status badges, place status indicators, and audit workflow states.

```
Success / Complete:
  Foreground:  --accent-moss
  Surface:     --status-success-surface   (moss at 12% opacity)
  Border:      --status-success-border    (moss at 28% opacity)

Warning / Flagged:
  Dark:   #b8955a    HSL(38, 41%, 54%)
  Light:  #8a6720    HSL(38, 62%, 33%)
  Surface/Border at same opacity ratios as above

Danger / Error:
  Dark:   #c98472    HSL(14, 41%, 62%)
  Light:  #9a3a2a    HSL(14, 57%, 39%)

Pending (not started):
  Use TextMuted — no color signal, just reduced emphasis

In-progress:
  Use --accent-terracotta surface/border — the interactive color
  signals "this is active work"
```

**Status → color mapping for PVUA-specific states:**

| State                             | Color signal                 | Rationale                        |
| --------------------------------- | ---------------------------- | -------------------------------- |
| `place_audit_status: complete`    | Moss                         | Score exists, outcome measured   |
| `place_audit_status: in_progress` | Terracotta surface           | Active, interactive work         |
| `place_audit_status: pending`     | TextMuted, no badge color    | Not started, no signal needed    |
| `place_survey_status: complete`   | Moss                         | Same logic as audit              |
| `draft` audit                     | Terracotta surface           | Auto-save active, work in flight |
| `submitted` audit                 | Moss                         | Work done, outcome exists        |
| Offline (mobile)                  | Warning                      | Connectivity reduced             |
| Syncing (mobile)                  | Terracotta                   | Active operation                 |
| Synced (mobile)                   | Moss (brief, then dismisses) | Confirmed, no action needed      |

---

### 1.6 Mobile palette — hue-locked

The previous Tamagui palette had an unintentional hue drift in stops 5–7 (jumping to 110°, 188°, 135° hue). The new palette locks the entire ramp to the 26–30° band. Replace the arrays in `themes.ts` with these values.

**Dark palette (12 stops):**

```typescript
const darkPalette = [
    "hsla(30, 22%, 10%, 1)", // 1  canvas
    "hsla(30, 22%, 13%, 1)", // 2  surface
    "hsla(30, 22%, 16%, 1)", // 3  surface raised
    "hsla(29, 22%, 20%, 1)", // 4  surface sunken / alt
    "hsla(29, 22%, 26%, 1)", // 5  mid-dark (was 110° olive — fixed)
    "hsla(29, 22%, 33%, 1)", // 6  mid (was 188° teal — fixed)
    "hsla(28, 23%, 41%, 1)", // 7  mid-light (was 135° forest — fixed)
    "hsla(28, 24%, 51%, 1)", // 8  (was 83° yellow-green — fixed)
    "hsla(27, 25%, 63%, 1)", // 9  text muted
    "hsla(27, 27%, 76%, 1)", // 10 text secondary
    "hsla(26, 30%, 88%, 1)", // 11 text primary
    "hsla(26, 33%, 96%, 1)", // 12 near-white
];
```

**Light palette (12 stops):**

```typescript
const lightPalette = [
    "hsla(33, 38%, 97%, 1)", // 1  canvas
    "hsla(32, 35%, 93%, 1)", // 2  surface
    "hsla(31, 32%, 89%, 1)", // 3  surface raised (white in practice)
    "hsla(30, 29%, 84%, 1)", // 4
    "hsla(29, 27%, 76%, 1)", // 5
    "hsla(28, 26%, 66%, 1)", // 6
    "hsla(27, 26%, 56%, 1)", // 7
    "hsla(27, 26%, 46%, 1)", // 8
    "hsla(26, 27%, 36%, 1)", // 9
    "hsla(25, 28%, 26%, 1)", // 10
    "hsla(24, 30%, 16%, 1)", // 11
    "hsla(23, 32%, 9%, 1)", // 12 near-black
];
```

---

### 1.7 High contrast modes

High contrast modes are unchanged in structure — they preserve the full WCAG AAA treatment. The only updates are to align the accent colors with the new role-specific values:

```
High contrast dark:
  accentTerracotta: #ffb87a  (brightened for AAA on black canvas)
  accentMoss:       #7ed4a0
  accentSlate:      #a8c2f5
  accentViolet:     #d0b8f4

High contrast light:
  accentTerracotta: #7a3a10
  accentMoss:       #1f5b33
  accentSlate:      #163a70
  accentViolet:     #4d2a80
```

---

## Part 2: Typography System

### 2.1 Design principles

The academic reference introduced a useful principle: **use serif for substance, mono for metadata**. Adapted for the audit tool: **use Space Grotesk for headings, Geist for UI and body, JetBrains Mono for structural metadata**. The key insight is that mono type signals "this is a label or identifier, not prose" — it creates a visual grammar where users can instantly distinguish content from structure.

The existing font stack (Geist + Space Grotesk + JetBrains Mono) is correct. No changes to the actual fonts. What's being added is a more explicit role assignment so every typographic choice is intentional.

---

### 2.2 Font role assignments

#### Space Grotesk — display and headings

Used for: page titles, section headings (H1–H3), dashboard stat numbers, sidebar workspace name. Carries authority and weight. Never used for body text or labels.

#### Geist — body and UI

Used for: all body copy, form labels, button text, sidebar nav items, card descriptions, placeholder text, error messages, table cells. The workhorse font — legible at every size, comfortable for extended reading.

#### JetBrains Mono — structural metadata

This is the addition. Used for: domain eyebrows, score dimension labels, section counters, auditor codes, status badge text, question counters, timestamps, all tabular numbers. The mono font creates a clear "this is a label/identifier" signal that separates structural information from content.

Existing usage (code blocks, `--font-code`) is unchanged. This adds a second semantic context for the same font.

---

### 2.3 Type scale

All sizes in rem, base 16px. The `--app-font-scale` CSS variable from the existing system applies multiplicatively to all these values.

#### Display tier (Space Grotesk)

| Token            | Size            | Weight | Line-height | Tracking | Usage                             |
| ---------------- | --------------- | ------ | ----------- | -------- | --------------------------------- |
| `--text-display` | 2rem (32px)     | 700    | 1.15        | -0.02em  | Dashboard hero stats, page titles |
| `--text-h1`      | 1.625rem (26px) | 600    | 1.2         | -0.015em | Main page headings                |
| `--text-h2`      | 1.375rem (22px) | 600    | 1.25        | -0.01em  | Section headings                  |
| `--text-h3`      | 1.125rem (18px) | 600    | 1.3         | -0.005em | Card titles, subsection headings  |
| `--text-h4`      | 1rem (16px)     | 600    | 1.4         | 0        | Minor headings, form group titles |

#### Body tier (Geist)

| Token             | Size             | Weight | Line-height | Usage                                  |
| ----------------- | ---------------- | ------ | ----------- | -------------------------------------- |
| `--text-body-lg`  | 1rem (16px)      | 400    | 1.65        | Long descriptions, audit question text |
| `--text-body`     | 0.9375rem (15px) | 400    | 1.6         | Standard body, card content            |
| `--text-body-sm`  | 0.875rem (14px)  | 400    | 1.55        | Secondary content, table cells         |
| `--text-body-xs`  | 0.8125rem (13px) | 400    | 1.5         | Compact content, tooltips              |
| `--text-label`    | 0.875rem (14px)  | 500    | 1.4         | Form labels, button text               |
| `--text-label-sm` | 0.8125rem (13px) | 500    | 1.35        | Smaller labels, sidebar items          |

#### Mono metadata tier (JetBrains Mono)

This is the new layer. These are not code — they are structural identifiers.

| Token                | Size             | Weight | Tracking | Usage                                                   |
| -------------------- | ---------------- | ------ | -------- | ------------------------------------------------------- |
| `--text-eyebrow`     | 0.6875rem (11px) | 500    | 0.12em   | Domain/section eyebrows: "DOMAIN 3 · PLAY VALUE"        |
| `--text-eyebrow-sm`  | 0.625rem (10px)  | 500    | 0.14em   | Block labels, badge text: "SUBMITTED", "DRAFT"          |
| `--text-score-label` | 0.625rem (10px)  | 600    | 0.10em   | Score dimension labels: "PV", "U", "S"                  |
| `--text-counter`     | 0.6875rem (11px) | 400    | 0.06em   | Progress counters: "Question 7 of 12", "Section 3 of 6" |
| `--text-meta`        | 0.6875rem (11px) | 400    | 0.04em   | Timestamps, IDs, auditor codes                          |
| `--text-nav-section` | 0.625rem (10px)  | 500    | 0.10em   | Sidebar section separators: "MANAGER", "SETTINGS"       |

All mono metadata text is uppercase. No exceptions — the uppercase + tracking combination is the visual signal that distinguishes a label from content.

---

### 2.4 Score display — typographic specification

The PV/U score pair is the most important display moment in the product. It needs its own typographic treatment, not just "some text."

```
Score number:    Space Grotesk, 2rem, 700, tracking -0.02em, --accent-moss
Score dimension: JetBrains Mono, 10px, 600, tracking 0.10em, uppercase, --text-muted
Score separator: "/" or "·", Geist, --text-muted, opacity 0.5
Score label:     Geist, 13px, 400, --text-secondary — "Play Value" (expanded form, shown on hover/detail)
```

**Compact (dashboard/list view):**

```
PV  4.2 · U  3.7
^   ^       ^ ^
|   |       | score number
|   |       dimension label
|   score number
dimension label
```

Both PV and U labels render in mono, both numbers in Space Grotesk. The separator is mono at reduced opacity. On hover or in a detail view, "PV" expands to "Play Value" in Geist 13px.

**Full (place detail / audit report):**

```
PLAY VALUE    USABILITY    SOCIABILITY
   4.2            3.7          —
```

Labels in mono eyebrow style, numbers in display style, em dash for "not measured."

---

### 2.5 Audit form section header — typographic specification

The section header inside the audit execution flow is where the "meaningful work" narrative is most visible. The auditor sees this at the top of each section. It needs to communicate: what domain, what section, where in the audit.

```
DOMAIN 3 · SENSORY & MOTOR PLAY       ← mono eyebrow, --accent-violet
                                         (violet because it's the methodology)
Play Opportunities                     ← Space Grotesk h2, --text-primary

Question 7 of 12                       ← mono counter, --text-muted
```

The violet eyebrow is the single place where the methodology color signals "this text comes from the PVUA instrument." When an auditor reads "DOMAIN 3 · SENSORY & MOTOR PLAY" in violet mono, they know they're working within the published framework.

---

### 2.6 Sidebar navigation — typographic specification

```
[Role workspace label]
MANAGER                                ← mono nav-section, --text-muted, uppercase
                                         (signals which role context you're in)

Dashboard                              ← Geist 14px, 400 (inactive)
Dashboard                              ← Geist 14px, 500, --accent-terracotta (active)
Projects                               ← Geist 14px, 400

SETTINGS                               ← mono nav-section separator
Preferences                            ← Geist 14px, 400
```

The role label at the top of the sidebar ("MANAGER", "AUDITOR") uses the mono section style. This is subtle but provides the role identity signal that the current system is missing — the auditor sidebar says "AUDITOR" in the same way the manager sidebar says "MANAGER."

---

### 2.7 Status badge — typographic specification

```
Badge text:   JetBrains Mono, 10px, 500, tracking 0.08em, uppercase
Badge padding: 3px 8px
Badge radius:  4px (not pill — these are categorical, not continuous)

Examples:
  COMPLETE   → moss surface + border
  IN PROGRESS → terracotta surface + border
  DRAFT       → terracotta surface + border
  PENDING     → muted background, no color
  FLAGGED     → warning surface + border
```

The square-cornered badge (vs. pill) is deliberate. Pills suggest tag-like or continuous items. Square badges suggest discrete categorical states. The distinction matters for a tool where status has precise meaning.

---

## Part 3: The Shared Token Problem

### 3.1 The drift risk

Currently `design-system.ts` (web) and `themes.ts` (mobile) are manually parallel. Any change to terracotta requires updating both files independently. This is manageable now but will cause drift as the system evolves.

### 3.2 Recommended approach

Create a single shared constants file — `packages/design-tokens/tokens.ts` or even just a `tokens.json` — that both apps import. The web `design-system.ts` reads from it; the mobile `themes.ts` reads from it.

```typescript
// tokens.ts — the single source of truth
export const TOKENS = {
    // Accents (hex values)
    accentTerracottaDark: "#c58a5c",
    accentTerracottaLight: "#a86332",
    accentMossDark: "#5e9470",
    accentMossLight: "#3d7554",
    accentSlateDark: "#7a90b7",
    accentSlateLight: "#4d6a9a",
    accentVioletDark: "#9b86b2",
    accentVioletLight: "#6b52a0",

    // Surfaces (dark)
    canvasDark: "#171310",
    surfaceDark: "#211c17",
    surfaceRaisedDark: "#2c241d",
    surfaceSunkenDark: "#120f0c",

    // Surfaces (light)
    canvasLight: "#f7f1eb",
    surfaceLight: "#fdf8f3",
    surfaceRaisedLight: "#ffffff",
    surfaceSunkenLight: "#ede6da",

    // Text (dark)
    textPrimaryDark: "#ede5d8",
    textSecondaryDark: "#c4b9ae",
    textMutedDark: "#968880",

    // Text (light)
    textPrimaryLight: "#1e1a16",
    textSecondaryLight: "#4a423a",
    textMutedLight: "#7a6e62",
} as const;
```

This file lives in the monorepo root or a shared package, and both `design-system.ts` and `themes.ts` import from it. The palette HSL values in `themes.ts` can't be derived from hex programmatically without conversion — it's acceptable for `themes.ts` to define its own HSL ramps as long as they visually match the hex values above for the key surfaces and accents.

---

## Phase 1 checklist

The following changes are needed to implement this phase:

**Mobile (`audit-tools-playspace-mobile`):**

- [ ] Replace `darkPalette` array in `themes.ts` with hue-locked 12-stop ramp
- [ ] Replace `lightPalette` array in `themes.ts` with hue-locked 12-stop ramp
- [ ] Add `monoLabel`, `monoEyebrow`, `monoCounter` font variants to `tamagui.config.ts` (backed by JetBrains Mono, smaller sizes)
- [ ] Verify mossDark `#5e9470` is registered as a custom color token alongside existing semantic child themes

**Both apps:**

- [ ] Create `tokens.ts` shared constants file and import into respective design system files
- [ ] Audit all hardcoded color values in components and replace with design system tokens

---

## What comes next

**Phase 2 — Component Patterns** will cover:

- Audit section block (the domain/section header + question progression component)
- Score display component (compact and full variants)
- Place status card
- Sync status indicator (mobile)
- Typed status badge
- Role-scoped sidebar

**Phase 3 — Surface Modes** will cover:

- Dashboard density spec (manager/admin)
- Field density spec (auditor web + mobile)
- Print/export surface spec
- The glass UI flag — whether to formalize or remove it

**Phase 4 — Motion and Feedback** will cover:

- Auto-save feedback loop (mobile)
- Section transition animation
- Score reveal animation
- Offline → online sync transition
