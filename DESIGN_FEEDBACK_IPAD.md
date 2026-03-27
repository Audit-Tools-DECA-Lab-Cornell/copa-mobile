# Playspace App — UI/UX Review

**Context:** iPad 13-inch · Expo · React Native · Tamagui  
**Screens reviewed:** Login, Signup, Home/Dashboard, Places, Place Detail, Execute, Execute Place, Pre-Audit, Section, Reports, Report Detail, Settings

---

## Scores

| Dimension        | Score    |
| ---------------- | -------- |
| Overall          | 6.1 / 10 |
| Accessibility    | 5 / 10   |
| Visual Polish    | 7 / 10   |
| Layout / Spacing | 6.5 / 10 |

---

## 🔴 Critical — Fix before demo

### 1. Nav bar title leaks raw enum string — "modeShort.both"

**Affects:** Execute (06), Execute Place (07)

The navigation bar reads "Aro Valley Spectator Seating Learning Park — modeShort.both". This is an untranslated i18n key or an enum value rendered directly. Completely unacceptable for a live demo or real users — it exposes internal implementation detail.

**Fix:** Map the audit mode enum → human-readable label (e.g. "Both survey & onsite") in the screen header string. Use a `getAuditModeLabel(mode)` utility and never pass raw enum keys to UI text.

---

### 2. Touch targets on filter/sort chips are too small for tablet use

**Affects:** Places (04), Reports (10), Execute (06)

The filter pills ("All", "Submitted", "In progress", etc.) and sort buttons appear to be ~32px tall. Apple HIG requires minimum 44pt touch targets. On a 13″ iPad where users may be wearing gloves or holding the device one-handed outdoors, this is a real usability failure.

**Fix:** Set `minHeight: 44` and `paddingVertical: 10` on all filter/sort chip components. Use `hitSlop` if the visual size must stay compact.

---

### 3. Audit code wraps mid-word, creating unreadable gibberish

**Affects:** Report Detail (11)

The audit code "CAPITALW-AROVALLEYSPE-AKL-01-20260325183726" wraps mid-string across 3 lines with hyphen breaks that look like part of the code. Users cannot copy or verify this value reliably. The code itself also appears malformed — the "-" between AROVALLEYSPE and AKL-01 looks like it breaks between two fields incorrectly.

**Fix:** Use a monospace font for audit codes. Set the `selectable` prop so users can copy. Truncate with a "tap to expand" or show in a `ScrollView` with horizontal scroll. Verify the code generation logic — the mid-code hyphen pattern may indicate a bug.

---

## 🟠 High — Fix before v1 release

### 4. iPad 13" layout wastes the right column — no true master-detail adaptation

**Affects:** Home (03), Places (04), Execute (06), Reports (10)

On a 13″ iPad, single-column full-width layouts (Login, Signup, Access Setup, Pre-Audit) have content centered in ~600px with enormous empty side gutters. The 2-column layout in Reports/Execute is good but the left column is significantly wider than needed (60/40 split when 50/50 or 55/45 would read better). The right sidebar in Execute Place (07) feels cramped despite the available canvas.

**Fix:** For single-column screens on iPad, use `maxWidth: 600, alignSelf: 'center'`. For two-column layouts, target a 55/45 or 50/50 split. In the section detail view (09), the right panel "Section Notes" + actions could expand to 40% of screen width comfortably.

---

### 5. Dark mode has insufficient surface differentiation — cards blend into background

**Affects:** All dark mode screens (03, 06, 07, 08, 09, 10)

In dark mode, the surface cards (`#24201D`) sit on a background (`#1C1917`) with only ~6 luminance points of contrast. The border (`#3A3430`) is almost invisible. Individual audit cards in the Execute screen (06 dark) and section cards (09 dark) are hard to distinguish as separate interactive elements.

**Fix:** Increase the card border opacity in dark mode to at least 60% (currently looks ~20%). Consider adding a very subtle top-edge highlight (1px, 8% white) on elevated cards. Alternatively, increase `surfaceMuted` contrast by shifting the background to `#161311`.

---

### 6. Preamble accordion has no visible affordance that it's expandable

**Affects:** Execute Place (07), dark variant (14)

The "Preamble" row has a chevron (↓) but spans the full width as a large tappable area with no background change and no visible press state. The chevron is very small. Users new to the app may not understand this is a collapsible section — especially since every other section card below uses an "OPEN SECTION" button.

**Fix:** Add a subtle background tint to the Preamble accordion header on press. Make the chevron 20px+ and add a "Tap to expand" label in muted text when collapsed. Consider using the same "OPEN SECTION" button pattern for visual consistency.

---

### 7. Score summary metric cards use placeholder dashes without explanation

**Affects:** Place Detail (05), Report Detail (11)

"OVERALL SCORE: --", "PLAY VALUE (PV): --", "USABILITY (U): --", "SOCIABILITY (S): --" all show "--" with no inline explanation. A new user has no idea if "--" means "not calculated", "loading", "N/A", or "error". The small print "Scores will appear here after the audit is submitted" only appears in the section breakdown, not next to the top-level metric cards.

**Fix:** Add a 10px muted caption directly under each "--" metric card: "Pending submission" or "Not yet scored". Optionally replace "--" with a skeleton/shimmer state to signal loading vs empty.

---

### 8. UPLOAD PAUSED error card is visually similar to regular content cards

**Affects:** Execute Place (06, 07 dark)

The "UPLOAD PAUSED — Background sync failed (HTTP 409)" panel has a warm amber border but shares the same surface and layout as the adjacent "AUDIT ROLE" and "Pre-Audit Setup" informational cards. Users may scan past it as regular content rather than an error requiring attention.

**Fix:** Use the danger/warning color token for the UPLOAD PAUSED card background (`dangerSoft`), not just the border. Add a warning icon before "UPLOAD PAUSED". Consider a persistent compact banner at the top of the screen instead of an inline card buried in the sidebar.

---

### 9. Priority task card exposes an internal session ID as user-facing text

**Affects:** Home Dashboard (03)

The priority task card shows "0% PROGRESS - 529CC5EC" where `529CC5EC` is presumably an internal session/audit ID. This is implementation noise leaked into user-facing UI. The progress bar is also barely visible (nearly empty against the surface).

**Fix:** Remove the session ID from the progress row or move it to a hidden debug panel. Replace with human-readable info: "Not started · Last saved 1 day ago". Ensure the progress bar has a minimum visible width (e.g. 4px even at 0%) or replace with a text label when at 0%.

---

## 🟡 Medium — Polish pass

### 10. Quantity answer buttons use inconsistent hit areas and feel cramped

**Affects:** Section (09), Pre-Audit (08)

The "No / A little bit / A lot" option buttons use a 2+1 grid layout where "A lot" spans the left half (same width as "No") rather than being full-width or consistently sized. The visual grouping implies "A lot" is a secondary option. Season and weather buttons in Pre-Audit have the same issue.

**Fix:** Use a consistent 3-button grid (33/33/33%) or a 2-row layout (No + A little bit / A lot centered below). Alternatively, use full-width radio-button-style rows for better accessibility and outdoor readability.

---

### 11. Section Notes textarea is too large relative to its usage frequency

**Affects:** Section (09)

The Section Notes panel takes up nearly 40% of the right sidebar height with a large empty textarea. This is a secondary/optional action dominating primary action space. The BACK TO OVERVIEW and SAVE AND NEXT buttons are pushed below it.

**Fix:** Collapse Section Notes to a 3-line textarea by default (auto-expand on focus). Move it below the action buttons, or use a collapsible "Add notes +" disclosure button pattern.

---

### 12. Light mode warm background may cause eyestrain outdoors

**Affects:** All light mode screens

The warm parchment background (`#FAF6F0`) is a deliberate design choice that creates a distinctive brand feel. However, for a field audit tool used outdoors in direct sunlight, the warm tint reduces perceived contrast and may make text harder to read at a glance. High-contrast mode addresses this but isn't the default.

**Fix:** Consider a slightly cooler/lighter background variant (`#FDFAF7` or `#FAFAF8`) for standard light mode. Keep the current warm tone for the high-contrast variant. Add a "Field mode" shortcut in Settings that enables max font scale + high contrast in one tap.

---

### 13. Audit role selection has near-invisible selected state

**Affects:** Execute Place (07)

The AUDIT ROLE card shows three options where the selected option appears to have an amber border — but the visual distinction from unselected is only a thin border color change. In bright sunlight this would be near-invisible.

**Fix:** Add a filled radio indicator (filled circle vs empty ring) alongside the border change. Increase selected border width to 2px. Add a background fill (`primarySoft`) for the selected option in addition to the border.

---

### 14. Metric number typography is inconsistent across screens

**Affects:** Home (03), Places (04), Reports (10)

Large metric numbers use different visual weights across screens — the "08/01" on the dashboard use SpaceGrotesk Bold at ~28px, while PV/U/S scores on the reports screen use a smaller size. The "36" score on the Reports list card appears in a different weight than the same "36" in Report Detail. No consistent `metricXs/Sm/Md` token appears to be applied uniformly.

**Fix:** Audit all metric display sites and enforce a single token per context (e.g. `metricMd` for dashboard hero numbers, `metricSm` for card-level metrics). The design system already defines these tokens — enforce them consistently in components.

---

## What's Working Well

The bones are solid. A few things worth acknowledging:

- **Token architecture in `design-system.ts`** is genuinely excellent — semantic color aliases, theme-aware palettes, high-contrast variants, dyslexic font support, and clamped font scaling. This is well-considered accessibility engineering.
- **SpaceGrotesk + Geist** is a strong font pairing — distinctive without being precious.
- **Warm earth palette** is appropriate and memorable for a field audit tool.
- **Two-column iPad layout** in the Execute/Section views shows real thought about the form factor.
- **Offline ready** indicator and connectivity status in the dashboard is a great UX touch for a field-first product.

The gap is between the token definitions and their consistent _application_ in components.

---

## Quick Wins for the Demo

If time is short, do these five things first:

1. **Build a demo flavor** with Expo dev tools stripped — removes the error banners
2. **Fix `modeShort.both`** → `getAuditModeLabel()` utility
3. **Add `minHeight: 44`** to all filter/sort chip components
4. **Replace "0% PROGRESS - 529CC5EC"** with human-readable progress text
5. **Add a one-line caption** under each `--` metric card ("Pending submission")
