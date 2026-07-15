# COPA Mobile — Brutal UI/UX Audit & Upgrade Plan

> **SUPERSEDED** — this roadmap has been replaced by [`docs/PLAN.md`](./PLAN.md)
> (COPA Mobile UI/UX Overhaul — Master Plan). Items already implemented from this
> document (copy fixes, settings switches/sign-out/value-wrap, `AppButton` /
> `typography.tsx` / `FilterChip` / `StatCard` primitives) remain in place; all
> remaining work is tracked in the new plan.

## Context

The COPA / Playspace mobile app (Expo ~55, RN 0.83, Tamagui, `playspace/copa-mobile`) is functionally complete — offline-first sync, full audit flow, scoring, exports — but the UI reads as developer-built: status is triple-encoded, screens repeat themselves, tablet layouts clip and stretch, jargon leaks everywhere ("COPA Scoring", "PV 171 | U 85", "Q 145 | V 49 | C 19", "preamble"), and several screens have outright visual bugs (clipped charts, truncated values, FABs covering controls, a typo on the most-seen screen of the audit flow). Users are field auditors: tired, outdoors, one-handed, interrupted, possibly offline. The app must be calm, scannable, and hard to mess up.

This plan is based on direct review of all 30+ screenshots (iPhone/iPad/Android-tablet × light/dark) plus a full code exploration (routes, design system, audit flow, sync UI, i18n). **Login/signup screenshots (01/02) are missing from every device folder** — those screens were audited from code only and must be recaptured in Phase 5.

Good news: the foundation is unusually solid. `lib/design-system.ts` has a real token system (typography roles, radii, semantic colors, light/dark/field/high-contrast palettes, shadows), `lib/responsive-layout-tokens.ts` has interpolated tablet tokens, and hardcoded-value violations are rare (~15 total). **This is a misuse-and-composition problem, not a missing-system problem** — which makes the fix cheap relative to impact.

---

# Deliverable 1 — Brutal visual audit (screen by screen)

Severity: **P0** = broken/trust-destroying, **P1** = clearly hurts usability/credibility, **P2** = inconsistency/polish, **P3** = nice-to-have.

## 1. Login / session restore (`app/(auth)/login.tsx`) — code-only, no screenshots

- **What the user is doing:** getting in fast, possibly with cold hands in the field.
- **Issues:**
    - **P1** No screenshots exist (01/02 missing in all 6 folders) — visual state unverified; capture script's login targets silently absent.
    - **P2** `login.tsx:329` hardcodes `rgba(255,107,0,0.24)` border — an orange that exists nowhere in the palette (`primary` is #A66334). Will look alien in dark/field mode.
- **Fix:** recapture 01/02 in Phase 5; replace raw rgba with `ds.colors.primarySoft`.

## 2. Home / Field Dashboard (`app/(tabs)/index.tsx`)

- **What the user is doing:** "What am I doing today, and where did I leave off?"
- **What works:** Priority-task hero concept, offline-ready card, warm identity, tab bar.
- **Broken / awkward:**
    - **P0 (trust)** The hero card says **"Not started · Ready to begin"** with an almost-empty progress bar, but the button says **"RESUME ▷"** (all devices/themes). Resume-vs-start is _the_ core question on this screen and the UI answers it contradictorily.
    - **P1** Quick-action row **PLACES / EXECUTE / REPORTS sits directly above a tab bar containing the same three destinations** (phone). Pure duplication; on iPad the same buttons appear a third time in the right rail ("Quick Actions").
    - **P1 (iPad)** Top stat cards (07 ASSIGNED / 04 COMPLETED / 00 IN PROGRESS) and the right-rail "FIELD PRIORITIES" (0 in progress / 3 not started / 4 completed) are **the same data rendered twice in two different visual languages on one screen**.
    - **P1** Stat values zero-padded — "07", "04", "00". A field instrument padding numbers reads as decoration over accuracy; "00 IN PROGRESS" in mustard is especially odd.
    - **P1** Scrolled home ("Active Audits") re-encodes status three ways per card: `NOT STARTED` badge + "Mandatory completion 0%" bar + 🕐 "Not started" row, then a full-width `OPEN AUDIT ↗` button. One card ≈ 550px for one fact. ~1.5 cards/screen = terrible glanceability.
    - **P1** `OPEN AUDIT ↗` uses an external-link arrow for internal navigation — wrong affordance (also on VIEW DETAILS →, which is fine; the ↗ is not).
    - **P2** Stat-card composition: number top-left, label, then a lonely icon bottom-left with dead space to the right.
    - **P2** ALL-CAPS letter-spaced eyebrows everywhere (ACTIVE AUDITOR, PRIORITY TASK, CONNECTIVITY STATUS) at 9–11px — outdoor readability killer, dated.
    - **P2** Avatar tile is a rounded square; bell and logout are circles, right beside it. Mixed shape language in the first 100px.
    - **P2** `index.tsx:801,837,873,1016,1052` hardcoded icon tints (`rgba(255,107,0,.25)`, `rgba(16,185,129,.28)`) — off-palette greens/oranges that don't adapt to dark/field/high-contrast.
- **Fix direction:** hero card gets one status line + context-correct CTA ("Start audit" / "Resume · Section 3 of 8"); delete quick-action row on phone; on iPad merge the two stat systems into one; active-audit cards collapse to a compact row (title, project, one progress bar with %, chevron); unpad numbers; sentence-case eyebrows at ≥12px.

## 3. Places list (`app/(tabs)/places.tsx`)

- **What the user is doing:** "Find my place, see where it stands."
- **What works:** search + status chips concept, FlashList virtualization, left status-accent bar, 2-col tablet grid.
- **Broken / awkward:**
    - **P0 (trust)** Burwood Discovery Park card: **`COMPLETED` badge next to "Mandatory completion 0%"** and an empty bar (iPhone + iPad, both themes). Either the datum is wrong or the label lies; an auditor cannot trust either. (Root cause per code: completed places keep showing the _mandatory completion of a new/blank audit_ rather than the submitted one — verify in `place card` data mapping.)
    - **P1** Filter UI is three systems in one column: full-width `PROJECT` labeled dropdown, then `Status: All` / `Sort: Recent` chips. Reports tab uses a _third_ arrangement (dropdown + 3 chips). No shared filter-bar pattern.
    - **P1** SCORE SUMMARY block: "PV 136 | U 85" in big serif orange with no explanation anywhere in the app. Meaningless to a new auditor, intimidating to a manager reading over a shoulder.
    - **P2** Card height ~600px each: score tile + completion row + time + VIEW DETAILS all stacked. Two visible cards per phone screen for a _list_ screen.
    - **P2** Title + `COMPLETED` badge collide on iPad's 2-col grid — badge floats mid-air right of a wrapping 2-line title.
    - **P2** Subtitle "Review your field queue, monitor progress, and jump back into active audits." — marketing voice on a worker screen; costs a full text row.
- **Fix direction:** compact card (title/status badge row, project+locality meta, single progress or score line, whole-card tappable); one shared FilterBar component (search + chips row); score line gets labels ("Play value 136 · Usability 85") or a legend affordance.

## 4. Place detail (`app/place/[placeId].tsx`)

- **What the user is doing:** confirm "this is the right place", then act.
- **Broken / awkward:**
    - **P0 (verify)** Header shows only a centered orange title — **no visible back chevron** in screenshots (iPhone light 06). If real, mid-flow dead-end; if the chevron is merely low-contrast/cropped, still a P2 affordance issue. Code says native header with back — verify on device.
    - **P1** Screen says the place name **3×** (header, H1, implicit) and "Christchurch" **3×** (subtitle, pin row, map card header). Map card itself repeats the full address a 4th time.
    - **P1** The 2×2 stat grid renders **all four values in the same orange serif** (100% / PV 171 | U 85 / "32 days ago" / project name). "32 days ago" and a project _name_ are not metrics; nothing establishes what matters.
    - **P1** "Current audit — PV 171 | U 85" card repeats SCORE SUMMARY from 3 cards above, same screen.
    - **P2** `MANDATORY COMPLETION` label + orange 100% — good info, but the completed/score/last-updated/project grid has no reading order (metric, metadata, metric, metadata).
- **Fix direction:** one identity block (name, project, address+pin once), map thumbnail without repeated heading/address, single stats row (Completion · Score · Updated), actions grouped at bottom.

## 5. Execute list (`app/(tabs)/execute.tsx`)

- **What the user is doing:** start or resume the audit for the place they're standing in.
- **What works:** "Continue selected place" featured card is the right idea; Active/All scoping.
- **Broken / awkward:**
    - **P1** Screen title **"Audit Execute"** is developer word order (route name as title). Subtitle leaks methodology jargon: "section-by-section COPA audit flow."
    - **P1** Execute tab vs Places tab is a mental-model split the UI never explains — both are place lists with CTAs. Places even has "jump back into active audits" in its subtitle. Users must learn which list to use by trial.
    - **P2** Featured card's `OPEN SELECTED AUDIT →` vs list cards' outlined `START AUDIT` — but featured card duplicates the first list item below it (Avonlea appears as featured; Cashmere/Meadowbank as list) — okay, but on iPad the featured card is full-width while the grid is 2-col, and ~60% of the screen is empty below three items.
    - **P2** Active/All chips: third distinct chip style (filled-tint selected here; bordered chips in Places; labeled chips in Reports).
- **Fix direction:** rename ("Execute audits" / i18n), subtitle in worker language ("Pick a place to start or continue its audit"), unify chip style, consider merging featured card into a pinned first list item.

## 6. Start/resume + execution-mode selection (`app/execute/[placeId]/index.tsx`)

- **What the user is doing:** confirm role/mode and get into questions fast.
- **What works:** radio-card options with helper text; disabled state when locked; sync status card exists.
- **Broken / awkward:**
    - **P0 (copy)** Collapsible reads **"Rewiew important info, before you begin"** — a typo plus comma splice on the audit flow's front door, on every device/theme screenshot. Credibility of a _research instrument_ dies here. (Locate exact key in `lib/i18n/locales/*/audit.json`; fix in en + de/fr/hi/ja.)
    - **P0** Header has **no back affordance** (centered title + subtitle only). From here until section screens, the only escape is a HOME pill that abandons the flow.
    - **P1** Two stacked full-width CTAs — filled `CONTINUE TO ASSESSMENT DETAILS →` + outlined `SKIP TO SECTION OVERVIEW →`. Both shout; "assessment details" vs "section overview" is instrument jargon; users can't predict either destination.
    - **P1** Radio cards double-encode selection (filled radio + orange border + orange bold text) while unselected helper text sits at low contrast in dark mode.
    - **P2** `EXECUTION MODE` eyebrow + clipboard icon + project name + question — four header lines before the first option. On dark, a stray spinner artifact renders beside the eyebrow (dark 08 screenshot).
    - **P2** "SAVE A COPY / Save a copy of this audit" — eyebrow duplicates the title verbatim.
- **Fix direction:** fix string in all locales; native back header; one primary CTA ("Continue") + text-button secondary ("Skip to sections"); mode options keep radio + border only (drop text-color shout).

## 7. Pre-audit / Audit information (`app/execute/[placeId]/pre-audit.tsx`)

- **What the user is doing:** glance at auto-generated metadata, move on. Zero decisions.
- **Broken / awkward:**
    - **P1** Five separate full-width cards for five read-only one-liners (Auditor ID / Date / Start / Finish / Total time), each with bold title + "Automatically generated." helper + value = **~1,700px of scroll for 5 facts**. On iPad each card is ~1,300px wide for one line — comically stretched.
    - **P1** **"Finish time of the audit — 5/13/2026 at 6:10 AM"** shown _mid-flow, before finishing_ (it's from the prior submitted session). Reads as either a bug or time-travel; erodes "this data is generated correctly" trust.
    - **P1** "You are logged in as Talia Cooper" plain text floats unanchored at top (also on section screens). Session identity is setup info, not per-screen chrome.
    - **P2** Date format `5/13/2026` (US) for NZ users and a research context — should be locale-formatted (13 May 2026) via i18n date formatting.
    - **P2** "STEP 2 OF 3" eyebrow exists — good — but no stepper continuity on the other steps.
    - **P2 (iPad)** `BACK TO PREAMBLE` — "preamble" is instrument-author vocabulary.
- **Fix direction:** collapse to a single "Audit details" card with label/value rows (Auditor ID, Date, Started; omit Finish/Total until they exist), one shared "generated automatically" footnote; move logged-in notice into the step-1 card; locale dates.

## 8. Audit section overview (`app/execute/[placeId]/overview.tsx`) — not in screenshot set

- **P1 (coverage)** No screenshot target captures the overview (hub of the whole flow). Add to TARGETS.md in Phase 5. Code review: section cards with X-of-Y + complete/incomplete chips + filters — likely inherits every card-density issue above; audit visually after recapture.

## 9. Audit question screen (`app/execute/[placeId]/section/[sectionKey].tsx` + `question-card.tsx`)

The single most-used screen in the product; an auditor answers 124 questions here.

- **What works:** big touch targets (option buttons ≥44px), per-scale semantic colors (provision green, variety orange), bold-segment highlighting inside prompts, autosave-on-tap with no explicit save.
- **Broken / awkward (phone):**
    - **P1** Triple-nested card chrome: section card → question card ("1 of 7" + "Q 1.1") → PROVISION card (green left border) → options. Three borders + three paddings deep before content; wasted width on a 390px screen.
    - **P1** The helper question **"To what degree is this feature/environmental characteristic present or considered?" repeats verbatim inside every question card** (7× per section, ~124× per audit). After Q1 it is pure noise pushing options below the fold.
    - **P1** Dual numbering "1 of 7" (left) + "Q 1.1" (right) — two counting systems for the same thing, neither tells overall audit progress. **No section progress indicator is visible at all while scrolling** a 4,000px section.
    - **P1** Header: title + "Section: Playspace Character & Community" + a **HOME pill as the only nav control** (right side, one-sided). No back, no next-section, no progress. HOME mid-audit = "eject".
    - **P1** H1 "1. Playspace Character & Community" followed by an intro paragraph that **starts by repeating "Playspace Character & Community:" in orange bold** — same string twice in 80px.
    - **P2** "You are logged in as Talia Cooper" again at top of every section.
    - **P2** Prompt styling: grey "This playspace…" + orange bold continuation — orange is the _action_ color; using it for emphasis text makes everything shout (worse in dark where orange is the brightest thing on screen).
- **Broken / awkward (dark):**
    - **P1** Selected option = **light beige fill with olive text** (`successSoft`-ish flattened to near-white). It looks pasted from light mode and is the most jarring element in dark screenshots (11/12-dark).
- **Broken / awkward (tablet matrix — `section-question-table.tsx`):**
    - **P0** On Android tablet the **VARIETY column is clipped at the viewport edge with no scroll affordance** (header reads "VARIET"/cells half-visible). Data-entry columns must never be discoverable-by-accident.
    - **P0** Option label wraps mid-word: **"Not appli cable"** (android-tablet light 09). Layout is breaking words to fit fixed cell widths.
    - **P1** For 6 of 7 questions the VARIETY cell renders **"Not used for this item."** — an entire dead column of repeated filler. The one question using it (Q1.7) is the exception. Render only applicable scales per row (or an em-dash), never a sentence.
    - **P1** Bug-report FAB overlaps the answer radio for Q1.3 (android tablet) — a floating debug control on top of data-entry controls.
    - **P2** Header title truncates hard: "Family Connections | Section: Playspace Character & Comr" — no ellipsis, crashes into HOME pill.
- **Footer (phone + tablet):**
    - **P1** Three stacked full-width buttons: `BACK TO OVERVIEW` / `SAVE AND BACK TO PREVIOUS SECTION` / `SAVE AND NEXT`. The middle one renders in grey text that reads as _disabled_. "SAVE AND…" prefixes contradict the autosave model the sync card promises ("Your responses are saved") — they re-teach users that saving is manual.
    - **P1** The footer only exists at the end of a 4,000px scroll; no sticky affordance to move between sections.
- **Fix direction:** flatten to one card per question (number chip + prompt + options); scale helper shown once per section under the scale header (matrix already does this — phone should too); sticky slim footer (`← Prev · 12/24 · Next →`); header = back + section title + overflow menu (overview, home); rename buttons "Previous / Next section" (drop "SAVE AND"); dark selected state uses `successSoft` on dark surface with light text; matrix fixes: fit columns or explicit scroll affordance, dash for unused scales, no mid-word breaks.

## 10. Follow-up scales (gated)

- **What works:** the gating logic (follow-up hidden until provision answered) and per-scale colors are conceptually right.
- **P1** When gated, phone shows a text note (`section.followUpHidden`) — but nothing later tells you a follow-up **became available** if you change an answer; on the matrix the pending state is another "Not used…"-style filler. Needs a visible state change (e.g., variety cell animates in / chip "1 follow-up unlocked").
- **P2** Orange selected fill for variety vs green for provision is good semantics with zero legend anywhere; auditors must infer.

## 11. Notes / comments

- **P0 (copy)** Section-notes prompt shows **"involvment"** (iPhone 12, iPad 10 — likely from instrument JSON `notes_prompt`, not app i18n). Typos inside the _research instrument_ need a content-owner fix; scoring is untouched by text edits but treat via `playspace-scoring-change` guardrails.
- **P1** The note field is a bare rectangle at the end of the section with no autosave feedback; the sync card is a full screen away. One line ("Saved · just now") under the field would carry the whole "my work is saved" feeling.
- **P2** Question-level notes (`notes_prompt` inputs, "Enter any comments") writes to store on every keystroke (per code) but shows nothing either.

## 12. Review / submit (`final-comments.tsx`) — not in screenshot set

- **P1 (coverage)** The moment of highest anxiety (submission) has no screenshot target. Code: blockers list + Alert.alert confirm. Add target; audit after recapture. `Alert.alert` for the final submit of a 1-hour field session is thin — deserves a summary sheet (sections ✓, notes count, mode, "submits when online" note when offline).

## 13. Reports list (`app/(tabs)/reports.tsx`)

- **What the user is doing:** find a finished audit, check its score, open details.
- **Broken / awkward:**
    - **P1** Tab says **REPORTS**, screen says **"COPA Scoring"** — navigation label and page title disagree; "COPA Scoring" is internal product vocabulary.
    - **P1** Report cards contain a **~150px blank hole** between the FULL ASSESSMENT chip and the divider (all devices/themes; from `queueCardMinHeight` + space-between). Every card looks half-rendered.
    - **P1** **`Q 145 | V 49 | C 19` and a bare `43%`** with a progress bar — four unlabeled codes on the primary card. 43% of _what_? (It's score ratio — on a `COMPLETED` card a 29–43% bar reads as "incomplete work", directly fighting the badge.)
    - **P1 (iPad)** "PV 152.5 | U" wraps, "96.5" alone on line 2 in the first stat card — score strings must never wrap mid-unit.
    - **P1** `COMBINED SCORING COMING SOON` banner: alert-triangle + warning styling for a roadmap note, pinned above the fold, pushing actual content down. Roadmap ≠ warning; make it a dismissible info row or move to Settings→About.
    - **P2** Third filter arrangement (PROJECT dropdown + Filters/Audit type/Sort chips).
    - **P2** Card title truncation on iPad grid: "Somerfield Family Play Gar…" while the card has 40% empty vertical space.
- **Fix direction:** title "Reports"; card = title/status/score row + meta + labeled score bar ("Score 43% of max"); kill min-height hole; legend for PV/U (once, in a sheet from a ⓘ); shared FilterBar.

## 14. Report detail (`app/report/[auditId].tsx` + `components/reports/*`)

- **What works:** metadata table, per-domain collapsibles, thermometer concept, expand/collapse all, iPad 4-up score summary and 3-up export row.
- **Broken / awkward:**
    - **P0** **Scale-score charts and tables clip at the card's right edge on iPhone** (both themes, 16/17): 4th thermometer half-drawn, "Social" label cut, table columns "So…" cut. Horizontally scrollable with zero affordance → looks broken, data inaccessible.
    - **P0** **Scroll-to-top FAB overlaps table cells/values** (iPhone 16/17, dark 12-ipad "1?" hidden) — a nav convenience hiding data. Bug FAB does the same on Android tablet.
    - **P1** **Audit code truncates without wrap** on iPhone: `AVONLEANATUR-CHC-02-2026051…` clipped at card edge (monospace, no wrap/ellipsis). Codes must wrap or be copyable.
    - **P1** Layout order: title → metadata card → **Export (3 stacked ~90px buttons)** → score summary → sections. Export before content = wrong priority; on iPhone the export card alone is ~400px.
    - **P1** "Progress 123/123" row — 123 of 123 _what_? (questions) — label it.
    - **P1** "Highest and Lowest Scored" end cards: **six different saturated header colors** (green/orange/navy/purple/olive/mustard) with white caps text — a rainbow that ignores the muted brand palette; uneven card heights leave holes in the 2-col grid.
    - **P2** "PLAY VALUE 171 (29.1%)" in celebratory big orange serif — a 29% result presented as a trophy; consider neutral value styling with the % as the primary figure.
    - **P2** `Expand all | Collapse all` text links ~30px tall, right-aligned — small targets for gloved/outdoor use.
    - **P2** Thermometer y-axis labels "66.6% / 33.3%" at ~9px; dashes for N/A fine, but "N/A" columns still consume full width on phone (why draw an empty thermometer for a scale a domain doesn't use?).
- **Fix direction:** reorder (identity → score summary → domains → export at end or a header share icon); charts size-to-fit on phone (compute bar width from container; drop N/A bars or collapse to chips); tables get horizontal-scroll affordance (edge fade + initial peek) or reflow to label/value rows on phone; FABs move above content padding / auto-hide; audit code wraps with `flexShrink`+mono; neutral domain cards with 4px colored top accent instead of full-color headers.

## 15. Export / share flow (`audit-export-card.tsx`)

- **What works:** PDF/CSV/Excel via native share sheet; success/error toasts; iPad row layout.
- **P1 (phone)** Three stacked full-width outlined buttons ≈ the visual weight of the primary flow CTAs. Should be one row of three compact buttons (iPad already proves it works) or a single "Export…" button opening the share/format sheet.
- **P2** "Save a copy" (in-progress export) vs "Export this audit" (report) — two vocabularies for the same mental act.

## 16. Settings (`app/(tabs)/settings.tsx`)

- **What works:** genuinely great a11y feature set (font scale slider, Field Mode, High Contrast, OpenDyslexic); theme trio; grouped cards; tablet 2-col.
- **Broken / awkward:**
    - **P0** **Value truncation without wrapping:** "Instrument — Playspace Play Value and Us|" (iPhone 20), "Organisation — Thomas Morgenthaler (Field Test Manager|" (android tablet dark) — values clip at card edge, no ellipsis, no wrap.
    - **P1** Toggles render as **outlined pills reading `OFF`** — is it a state label or a button? Does tapping turn it off? Non-standard, ambiguous, and a screen-reader hazard. Use `Switch` (platform) with the label row tappable.
    - **P1** **SIGN OUT is the most prominent element on the screen** — full-width red-tinted destructive button in the middle of the page (inside Profile card, above Appearance). Destructive actions end the page.
    - **P2** `Edit Profile` / `Change Password` are Title Case sentence-style while every other button in the app is ALL-CAPS — the app's two button type styles collide in one row.
    - **P2** Profile card is 7 read-only rows (Name/Email/Org/Account type/Auditor Code/Role/Country) taking the entire first screen; "Role: Student" exposed verbatim from the DB.
    - **P2 (tablet)** Appearance card is 30% content, 70% empty, beside a packed Accessibility card — pair mismatch.
- **Fix direction:** wrap/ellipsize values (`flexShrink:1`, `numberOfLines` + full text on tap); real switches; Sign out to page bottom (danger-outline); unify button casing app-wide (sentence case, semibold — see D4).

## 17. Offline / sync surfaces (`audit-sync-status-card.tsx`, `pending-uploads-banner.tsx`)

- **What works:** the four states (queued / saved-on-device / uploading / paused) have humane, correct copy — best writing in the app; pending-uploads banner is reassuring.
- **P1** The sync card only lives inside audit screens, and there is **no persistent lightweight indicator** during question answering — the one moment users worry. A subtle "Saved ✓ / Saving… / Offline — saved on device" chip in the section header (or above the footer) would close the loop.
- **P1** No global offline banner: home says "Offline ready" as a _capability_ even when online; nothing changes visibly when connectivity drops (phase `blocked_network` surfaces only if you visit an audit screen).
- **P2** Sync card styles vary from other cards (muted surface + big button) — fold into the card system.

---

# Deliverable 2 — Cross-app design system audit

Files: `lib/design-system.ts` (tokens), `lib/responsive-layout-tokens.ts`, `tamagui.config.ts`, `components/ui/*`, `components/playspace-audit/*`, `components/reports/*`.

| System                     | State                                                                                             | Verdict / inconsistencies                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spacing**                | Tokens exist (`$1–$4`, sectionGap 20→32, cardPadding 16) and are used                             | Healthy. Violations only in `+not-found.tsx:21`, `_layout.tsx:389`, `DomainScoreDisplay.tsx:243`. Keep.                                                                                                                                                                                                                                                                                                                             |
| **Typography scale**       | 19 roles (labelXs 9px → displayLg 32px), tablet ×1.3, user scale 0.85–1.3                         | Scale is fine; **usage is not**: no Text wrapper component, so every callsite re-assembles font/size/color (31× bodySm, 28× bodyXs…). labelXs=9px/labelSm=10px + letterspacing + ALL CAPS = illegible outdoors; two hardcoded fontSize 10 (`NotificationBellIcon.tsx:26`, `DomainScoreDisplay.tsx:238`). **Fix: add `AppText`/`Eyebrow`/`ScreenTitle` primitives; floor labels at 11–12px; reserve display for one H1 per screen.** |
| **Card layout**            | CollapsibleCard/StatCard/QuestionCard/queue cards all hand-rolled                                 | 4+ card anatomies (queue card, stat card, report card w/ min-height hole, metadata card). **Fix: one Card primitive + QueueCard/StatCard/FormCard recipes; kill `queueCardMinHeight` blank space.**                                                                                                                                                                                                                                 |
| **Border radius**          | RADII 8/12/16/20/999, no raw values                                                               | Healthy. Only issue: mixed shapes side-by-side (square avatar vs circle icon buttons, home header).                                                                                                                                                                                                                                                                                                                                 |
| **Shadows/elevation**      | card + accent + glass variants, theme-aware                                                       | Consistent. `CurrentToast.tsx:84` uses raw shadow props — migrate.                                                                                                                                                                                                                                                                                                                                                                  |
| **Color/contrast**         | Full light/dark/field/high-contrast palettes, semantic scale colors                               | Strong foundation. Violations: `DomainScoreDisplay.tsx:77-78` (#2E7D78, #C7972F PV/U bars — not theme-aware), home icon rgba tints, `login.tsx:329`, `BugReportFab.tsx:481`. Dark-mode **selected answer fill reads light-beige** (soft color computed too light). Orange-as-emphasis-text (prompts, values, links, buttons) makes primary meaningless. Rainbow domain headers (report end) off-palette.                            |
| **Badges/chips**           | Status badge (pill, tinted), FULL ASSESSMENT chip (grey), filter chips (3 styles), eyebrow labels | **4 chip styles, 3 filter-chip variants across Places/Execute/Reports.** Fix: one StatusBadge + one FilterChip.                                                                                                                                                                                                                                                                                                                     |
| **Buttons**                | No shared Button primitive; ActionButton only for exports                                         | **Biggest offender.** Casing: ALL-CAPS letterspaced (most) vs Title Case (settings). Hierarchy: filled/outlined/text used interchangeably (3 stacked full-width in section footer & export card; two competing CTAs on mode screen). Arrows: → and ↗ mixed for internal nav. **Fix: Button primitive with variant=primary/secondary/tertiary/destructive, sentence case, one full-width primary per view max.**                     |
| **Inputs**                 | SearchInput shared; notes = raw TextInput; dropdowns = 2 styles                                   | Notes field has no focus/saved state; PROJECT dropdown full-width web-select style vs chip-dropdowns. Unify select trigger style.                                                                                                                                                                                                                                                                                                   |
| **Progress**               | Thin bars (home/places/reports), % text, thermometers (reports), "X of Y" text                    | 4 languages for progress. Bars are 3px hairlines with a dot at 0% (looks like dirt). No in-section progress at all. **Fix: one ProgressBar (4–6px, labeled), one "n of m" text pattern, thermometers only in report detail.**                                                                                                                                                                                                       |
| **Empty states**           | Not observed in screenshots; code has minimal handling                                            | Audit in Phase 5 recapture (empty places/reports/search-no-results).                                                                                                                                                                                                                                                                                                                                                                |
| **Loading**                | Spinners ad hoc; stray spinner artifact next to EXECUTION MODE eyebrow (dark)                     | Add skeleton rows for FlashList screens; kill orphan spinners. Stray orange arc artifact bottom-right on many iPad shots (`BugReportFab`/toast fragment?) — investigate.                                                                                                                                                                                                                                                            |
| **Error states**           | Sync card handles blocked_*; toasts exist                                                         | Fine post-P1; ensure `blocked_validation` surfaces field-level info.                                                                                                                                                                                                                                                                                                                                                                |
| **Offline/sync**           | 12-phase machine surfaced via card + banner                                                       | Copy excellent; needs persistent lightweight indicator + global offline chip.                                                                                                                                                                                                                                                                                                                                                       |
| **Section/question cards** | Triple-nested; repeated helper; dual numbering                                                    | See D1 §9.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Report cards**           | min-height hole; unlabeled codes                                                                  | See D1 §13.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Tablet layout rules**    | Real breakpoints (600/960), pair-grid, two-pane home, matrix table                                | Right skeleton, wrong flesh: duplicated stat systems (home), stretched 1300px single-line cards (pre-audit), dead matrix columns, clipped columns, truncated headers, FABs over content. Rules needed: max content width for forms (~720px), no full-width single-line cards, columns must fit or announce scroll.                                                                                                                  |

---

# Deliverable 3 — User psychology critique

| Confidence statement                           | Where the UI fails it today                                                                                                                                                                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"I know what place I'm auditing."**          | Header shows place name, but section screens bury it next to a truncated section string ("…Character & Comr"); place name repeats 3× on detail but isn't paired with a stable visual anchor (thumbnail/monogram) anywhere in the flow.                                  |
| **"I know whether I'm starting or resuming."** | Home hero: "Not started" + **RESUME** (P0). Execute list: "Open selected audit" vs "Start audit" — different verbs, unexplained. Fix: verbs derived from session state everywhere (Start / Resume · Section 3 of 8).                                                    |
| **"I know my work is saved."**                 | Autosave exists and sync copy is great — but during answering (the anxious moment) there is **zero feedback**: no saved chip, no note-field state; meanwhile footer buttons say "SAVE AND NEXT", implying saving is manual and conditional. The words fight the system. |
| **"I know what is incomplete."**               | Within a section: no live progress; must scroll 4,000px. Across the audit: overview exists but the section header/footer never says "3 unanswered". Report cards say COMPLETED with a 29% bar (score) — completeness and score share one visual channel.                |
| **"I know what happens if I go offline."**     | "Offline ready" card explains capability at home, but no state change when actually offline; queued-submit state is discoverable only via audit screens. Needs a persistent, calm "Offline — everything saves to this device" chip when disconnected.                   |
| **"I know how much is left."**                 | Nothing anywhere says "Section 3 of 8 · 41 of 124 questions". Pre-audit says "STEP 2 OF 3" (good) then the pattern dies.                                                                                                                                                |
| **"I know when I can submit."**                | Submit readiness logic exists (blockers list) but lives on a screen with no screenshot and no advertisement; nothing on overview/home says "2 sections remaining before submit".                                                                                        |
| **"I trust the report/export."**               | Codes without legends (PV/U/Q/V/C), clipped charts, truncated audit code, a 29% score in celebration orange, rainbow cards, "Progress 123/123" — the report _looks_ less rigorous than the research behind it. Trust here is a rendering problem.                       |

---

# Deliverable 4 — Redesign direction (spec for the implementing agent)

**Personality target:** calm field instrument. Warm parchment identity stays; decoration retreats; data hierarchy leads. Think "clipboard, not brochure."

1. **Typography hierarchy (enforced, not just available)**
    - One `displayMd/Lg` H1 per screen (screen title only). Card titles = `titleMd/Lg` semibold. Body = `bodyMd`. Meta = `bodySm` mutedForeground. Metrics = `metric*` (numbers only). Eyebrows = `labelLg` (12px floor), sentence case, +0.4 tracking max — caps only for status badges.
    - New primitives in `components/ui/typography.tsx`: `ScreenTitle`, `CardTitle`, `Body`, `Meta`, `Eyebrow`, `MetricValue` wrapping ds tokens. Migrate callsites screen-by-screen.
2. **Button system** (`components/ui/button.tsx`): variants primary (filled `primary`), secondary (outlined), tertiary (text), destructive (danger outline). Sentence case ("Save and continue" → "Next section"), semibold, height from `layout.buttonHeight`, internal-nav chevron `→` only, never `↗`. Max one full-width primary per view; secondary actions become tertiary or move to overflow.
3. **Card system** (`components/ui/card.tsx`): base Card (surface, border, radii.md, cardPadding, shadow.card). Recipes: `QueueCard` (compact: title+badge row / meta row / progress row / whole-card press), `StatCard` (label, value, delta — no orphan icons), `FormCard` (label/value rows). Delete blank-space `minHeight` behavior — equalize grid heights via row alignment, not padding voids.
4. **Status model:** one `StatusBadge` (not-started / in-progress / completed / queued / syncing) + one labeled `ProgressBar`. A state appears **once** per card. Kill leading zeros, kill clock-icon+text duplicates.
5. **Navigation model:** native back header on every pushed screen (place, execute/*, report). Section header = back + place name + section x/y + overflow menu (Overview, Save & exit, Home). Phone home loses the quick-action row; tab bar is the navigation. HOME pill dies.
6. **Question answering (phone):** flat single card per question — `Q1.1` chip + prompt (neutral ink emphasis, bold not orange) + options. Scale helper text once per section under a scale header chip. Sticky footer: `← Prev  ·  12/24  ·  Next →` (+ jump-to-overview in header). Notes field gets "Saved · just now" microcopy tied to sync phase.
7. **Question matrix (tablet):** only applicable scale columns per row (dash for N/A), min column width with guaranteed fit or leading-edge fade + peek, no mid-word wraps (`allowFontScaling` sane, `flexWrap` on words), sticky first column, row height compact.
8. **Progress model:** audit-level = "Section 3 of 8 · 41/124 answered" (overview + section header); section-level = sticky counter; submit readiness = overview banner ("2 sections to finish before submit").
9. **Offline/sync communication:** persistent header chip with 3 states (✓ Saved · ↻ Saving · ⚠ Offline, saved locally), driven by existing sync phases; global offline state also tints the chip on home. Sync detail card stays for edge states (conflict, blocked_*).
10. **Reports:** list card = title/badge/score row + meta + one labeled bar. Detail order: identity → score summary → domains → export. Charts sized-to-container on phone; domain end-cards neutral surface + 4px scale-color top border; PV/U legend sheet from ⓘ. Rename tab+title "Reports".
11. **Forms/inputs:** shared select trigger (chip-style), shared FilterBar (search + chips) across Places/Execute/Reports; switches replace OFF pills.
12. **Color/token adjustments:** replace 8 hardcoded colors with tokens (add `colors.playValue`, `colors.usability` to ds); dark selected-option = `successSoft` over dark surface with `foreground` text (verify ≥4.5:1); demote orange from emphasis-text duty (prompts/emphasis = foreground bold); domain rainbow → scale accent tokens.
13. **Spacing rhythm:** screen = sectionGap between blocks; cards internal 16/12/8; lists 12 (phone) 16 (tablet) separators — codify in card recipes, delete per-screen improvisation.
14. **Tablet rules:** forms/metadata max-width 720px centered; stat rows 3-up; queue grids 2-up; home right rail keeps _only_ non-duplicated content (connectivity + up-next) or dies; settings pairs balanced.
15. **Settings:** profile summary row (avatar, name, org) + "View details"; switches; Sign out last; casing unified; values wrap.
16. **Report presentation & export:** export = one row of 3 compact buttons (phone) / row (tablet), or single Export → share sheet; audit code wraps in mono with copy-on-tap.

---

# Deliverable 5 — Implementation roadmap

Effort: S <½day, M ~1day, L 2–3days. Risk = regression risk to flows/scoring. **No task below needs backend/API changes.** "Shots" = update screenshots.

### Phase 1 — Foundation polish

| #    | Task                                                                                                                                  | Impact | Effort | Risk                       | Files (primary)                                                            | Tests/Shots                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------------------------- | -------------------------------------------------------------------------- | ----------------------------- |
| 1.1  | Copy fixes: "Rewiew…" string, "Audit Execute"→"Execute audits", "COPA Scoring"→"Reports", date localization; propagate to de/fr/hi/ja | High   | S      | Low                        | `lib/i18n/locales/*/{audit,reports,dashboard}.json`                        | Shots                         |
| 1.2  | Instrument typo "involvment" (+ scan instrument for other typos) — coordinate via `playspace-scoring-change` guardrails (text-only)   | High   | S      | Low-Med (content owner)    | instrument JSON (backend-owned asset + `assets/bundled-instrument.json`)   | contract check                |
| 1.3  | Button primitive + app-wide casing/hierarchy migration                                                                                | High   | L      | Med                        | `components/ui/button.tsx` (new), all screens                              | Shots                         |
| 1.4  | Typography primitives + eyebrow/label floor 12px, sentence-case eyebrows                                                              | High   | M      | Low                        | `components/ui/typography.tsx` (new), screens                              | Shots                         |
| 1.5  | StatusBadge + ProgressBar unification; kill leading zeros, ↗ arrows, dot-on-empty-bar                                                 | High   | M      | Low                        | `components/ui/*` (new), tabs screens                                      | Shots                         |
| 1.6  | Card recipes; **fix report-card blank hole**; compact QueueCard density                                                               | High   | M      | Med                        | `components/ui/card.tsx`, `(tabs)/{places,execute,reports}.tsx`            | Shots                         |
| 1.7  | Truncation bugs: audit code wrap, settings values wrap, tablet header ellipsis                                                        | High   | S      | Low                        | `report/[auditId].tsx`, `(tabs)/settings.tsx`, `ui/audit-header-title.tsx` | Shots                         |
| 1.8  | Hardcoded colors → tokens (DomainScoreDisplay PV/U, home icon tints, login border, toast shadow)                                      | Med    | S      | Low                        | listed in D2                                                               | Shots (dark)                  |
| 1.9  | Dark-mode selected-option fill fix                                                                                                    | High   | S      | Low                        | `question-card.tsx`, ds soft-color resolution                              | Shots (dark)                  |
| 1.10 | Settings: switches for toggles, Sign out to bottom, casing                                                                            | Med    | S      | Low                        | `(tabs)/settings.tsx`                                                      | Shots                         |
| 1.11 | FAB collisions: scroll-top + BugReportFab offsets/auto-hide; stray arc artifact                                                       | High   | S      | Low                        | `report/[auditId].tsx`, `BugReportFab.tsx`                                 | Shots                         |
| 1.12 | Home: remove quick-action duplication, fix hero Start-vs-Resume verb, stat card composition                                           | High   | M      | Med (state logic for verb) | `(tabs)/index.tsx`                                                         | Maestro dashboard flow, Shots |

### Phase 2 — Flow clarity

| #   | Task                                                                                                                   | Impact    | Effort | Risk                              | Files                                                              | Tests/Shots                        |
| --- | ---------------------------------------------------------------------------------------------------------------------- | --------- | ------ | --------------------------------- | ------------------------------------------------------------------ | ---------------------------------- |
| 2.1 | "COMPLETED but 0% mandatory" data/UI contradiction — root-cause in place-card mapping                                  | High      | S–M    | Med                               | `(tabs)/places.tsx`, `lib/audit/*` selectors                       | unit + Shots                       |
| 2.2 | Section screen: flatten question card, de-dupe helper text, single numbering, sticky prev/next footer with counter     | Very high | L      | Med (no logic changes to answers) | `section/[sectionKey].tsx`, `question-card.tsx`                    | Maestro create/resume-audit, Shots |
| 2.3 | Header nav: back everywhere, overflow menu, kill HOME pill, logged-in notice → setup only                              | High      | M      | Med                               | `_layout.tsx`, execute screens, `ui/audit-header-title.tsx`        | Maestro all flows                  |
| 2.4 | Sync chip in section header + "Saved · just now" on notes; global offline chip                                         | High      | M      | Med (read-only vs sync machine)   | `use-audit-sync.ts` (read), new `ui/sync-chip.tsx`, section screen | Maestro queued-submit flow         |
| 2.5 | Mode screen: one primary CTA, radio de-shouting; pre-audit metadata → single FormCard; drop stale finish-time mid-flow | High      | M      | Low                               | `execute/[placeId]/{index,pre-audit}.tsx`                          | Shots                              |
| 2.6 | Reports list: labeled scores, legend sheet, coming-soon banner demoted; shared FilterBar across 3 tabs                 | High      | M      | Low                               | `(tabs)/reports.tsx`, `ui/filter-*.tsx`                            | Shots                              |
| 2.7 | Submit readiness surfaced on overview ("2 sections left"); richer submit confirmation sheet                            | High      | M      | Med                               | `overview.tsx`, `final-comments.tsx`                               | Maestro complete-audit             |
| 2.8 | Follow-up unlock visibility (state change when gate opens)                                                             | Med       | S      | Low                               | `question-card.tsx`, `section-question-table.tsx`                  | unit                               |

### Phase 3 — Tablet & responsive redesign

| #   | Task                                                                                                                                            | Impact    | Effort | Risk | Files                                         | Tests/Shots          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ | ---- | --------------------------------------------- | -------------------- |
| 3.1 | Matrix table: fit-or-affordance columns, dash for unused scales, kill "Not used for this item." text, no mid-word wraps, sticky question column | Very high | L      | Med  | `section-question-table.tsx`                  | Shots (both tablets) |
| 3.2 | iPad home: merge duplicate stat systems; right rail justified or removed; single source of quick actions                                        | High      | M      | Low  | `(tabs)/index.tsx`                            | Shots                |
| 3.3 | Form max-width (~720px) for pre-audit/mode/settings/report metadata on tablets                                                                  | High      | S      | Low  | `getResponsiveContentContainerStyle`, screens | Shots                |
| 3.4 | Reports stat-card wrap fix ("PV 152.5 \| U / 96.5"); grid card title truncation vs empty space                                                  | Med       | S      | Low  | `(tabs)/reports.tsx`, StatCard                | Shots                |
| 3.5 | Report detail on iPad: keep 4-up summary/3-up export; align domain grid heights                                                                 | Med       | S      | Low  | `report/[auditId].tsx`                        | Shots                |

### Phase 4 — Deeper interaction redesign

| #   | Task                                                                                                                                         | Impact | Effort | Risk | Files                                               | Tests/Shots                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ---- | --------------------------------------------------- | -------------------------- |
| 4.1 | Section navigation model: overview as hub w/ per-section chips + resume-at-first-incomplete; optional one-question-at-a-time mode evaluation | High   | L      | High | overview + section screens, `section-navigation.ts` | Maestro suite              |
| 4.2 | Report detail restructure: reorder blocks, chart fit-to-width, neutral domain cards, legend                                                  | High   | L      | Med  | `report/[auditId].tsx`, `components/reports/*`      | Shots                      |
| 4.3 | Notes UX: autosave microcopy, char-count, question-note affordance                                                                           | Med    | M      | Low  | question-card, section screen                       | Maestro question-note flow |
| 4.4 | Export: single Export action + format sheet; copy unification                                                                                | Med    | M      | Low  | `audit-export-card.tsx`, report screen              | Maestro report-access      |
| 4.5 | Place detail: de-duplicate identity/score blocks, stat row                                                                                   | Med    | M      | Low  | `place/[placeId].tsx`                               | Shots                      |
| 4.6 | Motion pass: pressed states, section transitions, reduced-motion respect                                                                     | Low    | M      | Low  | primitives                                          | —                          |

### Phase 5 — Validation

| #   | Task                                                                                                                                                                     | Notes                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| 5.1 | TARGETS.md: add login/signup (missing PNGs), overview, final-comments, empty states; recapture all 6 matrices                                                            | `scripts/capture-screenshots.mjs`        |
| 5.2 | Maestro: update selectors renamed by copy changes; add section-footer nav flow + sync-chip assertion                                                                     | `maestro/*.yaml`                         |
| 5.3 | A11y sweep: labels on all interactive elements, contrast re-check (dark selected states, orange-on-cream), font-scale 1.3 + tablet 1.69x overflow test, switch semantics | manual + `mobile_audit.py`               |
| 5.4 | Type/lint/format per repo rules (separate commands, `2>&1                                                                                                                | head -50`); `mobile-version-bump` at end | repo conventions |
| 5.5 | Visual regression expectation notes per screen in TARGETS.md                                                                                                             | docs                                     |

---

# Deliverable 6 — Immediate implementation target (first batch, on approval)

Safe with zero backend/API changes; hits the user's stated priorities (tablet fixes, spacing/typography, buttons, truncation, contrast, report/settings polish, execution nav placement):

1. **P0 bug sweep:** report chart/table clipping affordance (iPhone), matrix column clipping + "Not appli cable" wrap (Android tablet), FAB collisions, audit-code/settings/organisation truncation, tablet header ellipsis, "Rewiew" i18n typo (all locales), hero Start-vs-Resume verb.
2. **Button + typography primitives** and migration of the five tab screens + execute flow (casing, hierarchy, eyebrow floor, one-primary rule, section footer 3-stack → sticky Prev/Next).
3. **Card/badge/progress unification:** compact QueueCard (places/execute/reports), report-card blank-hole removal, StatusBadge single-encoding, labeled progress ("Score 43% of max"), leading-zero removal.
4. **Dark/contrast fixes:** selected-option fill, hardcoded hexes → tokens (incl. PV/U bar colors), demote orange emphasis text in prompts.
5. **Tablet quick wins:** form max-width for pre-audit/mode/settings, iPad home stat de-duplication, matrix "Not used…" filler → dash.
6. **Settings:** switches, Sign out placement, value wrapping, casing.
7. **Screenshot recapture** of all six device/theme sets to validate (+ add missing login targets).

Deferred intentionally: question-flow restructure beyond the footer (Phase 2/4), overview hub redesign, submit sheet, export sheet, motion.

**Estimated first batch:** ~2–3 focused days of implementation + recapture/QA.

## Verification

- `./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | head -50`; `eslint` and `prettier` as separate commands per repo rules (bun repo — local bins).
- `bun run screenshots:ios` / `screenshots:android` with screenshot account; diff against this audit's findings screen-by-screen.
- Maestro: `login`, `create-audit`, `resume-audit`, `question-note-compatible`, `audit-queued-submit-reopen` (offline correctness untouched but nav copy changes may affect selectors).
- Manual: dark + light on iPhone/iPad, font scale 1.3, Field Mode + High Contrast toggles, offline airplane-mode pass through a section (autosave chip states).
- End with `mobile-version-bump` skill (minor bump expected).

## Explicit non-goals / guardrails

- No scoring/instrument logic changes (typo fix is text-only and goes through `playspace-scoring-change` review).
- No changes to sync machine, MMKV persistence, or submission queue — UI reads phases only (`mobile-offline-sync-change` skill if any store file is touched).
- No commits/pushes without explicit approval.
- All new user-facing strings via i18n with all 5 locales updated.
