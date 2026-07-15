# COPA Mobile UI/UX Overhaul — Master Plan

## Context

A full-app review (95 screenshots: iPad + Android-tablet + iPhone, light/dark, plus code exploration) confirmed the app is functionally solid but visually inconsistent and has several user-visible defects: raw route slugs shown as page titles, an infinite "Preparing Section" wait, a theme that ignores runtime OS changes, clipped report tables, three coexisting header patterns, ad-hoc spinners/blank gates instead of branded loading, and tablet layouts that starve one pane. An older roadmap (`docs/UI_AUDIT_2026-07.md`) is partially implemented (copy fixes, settings switches/sign-out/value-wrap done; `AppButton`/`typography.tsx`/`FilterChip`/`StatCard` primitives exist but are only partially adopted) — this plan supersedes it.

**User-approved scope:** include P0 functional bugs; keep tablet two-pane but rebalance; full branded loader/skeleton system. iPhone recapture deferred ("skip iPhone now").

Repo: `playspace/copa-mobile` (Expo Router ~55, RN 0.83, Tamagui, FlashList, reanimated 4.2.1 installed-but-unused, i18n ×5 locales en/de/fr/hi/ja).

---

## The Bigger Picture — User View Guidelines (north star)

Every screen is judged against one persona: **a tired auditor standing outdoors at a playground — gloved, one-handed, interrupted, possibly offline, in direct sunlight.** Ten rules every screen must pass; tasks below cite them as G1–G10:

1. **G1 The screen names itself instantly.** Localized human title in the first frame. Never a route slug, never blank, never an ID.
2. **G2 The app never looks dead, and never traps.** Every wait state visibly moves (branded pulse) and has a one-handed exit (retry/back). Nothing spins forever.
3. **G3 Glove-first targets.** Large, bottom-anchored, singular primary actions; one obvious next step per screen (one full-width primary max).
4. **G4 Sunlight-legible.** High contrast in both themes; no state conveyed only by subtle grays; theme follows the OS the moment it changes.
5. **G5 Say it once.** No duplicated titles/addresses/localities; no filler ("Pending score", min-height voids).
6. **G6 No jargon without a key.** PV/U/Q/V/C always has an in-context legend; untranslated or machine-format text is a defect.
7. **G7 Offline is normal, not an error.** Loading vs offline vs error are visually distinct and honest about what the auditor can do.
8. **G8 Nothing hides silently off-screen.** Horizontal scroll always has an affordance or is redesigned away; FABs never cover content.
9. **G9 Tablet earns its width.** Two-pane only where both panes carry real content; body text capped at a readable measure (~720px).
10. **G10 Predictability over novelty.** One header system, one card, one button, one loader language across the app.

---

## Phase 0 — P0 hotfix batch (ship first, independent of everything)

Minimal diffs, no new primitives.

- **0.1 (S, G1) Raw-slug headers.** Add an unconditional localized fallback `title` via `navigation.setOptions` _before_ the data-gated branch in `app/execute/[placeId]/section/[sectionKey].tsx:209`, `pre-audit.tsx:113`, `space-audit.tsx:171` — mirror the correct pattern already in `overview.tsx:113` / `final-comments.tsx:152` / `execute/[placeId]/index.tsx:117`. Also declare these routes with default titles in the root Stack (`app/_layout.tsx:405-421`) as a belt-and-braces guard, and add titles for `settings/change-password` / `edit-profile` (currently none).
- **0.2 (M, G2/G7) Section infinite wait.** UI-side timeout (~12–15s) on the loading branch at `section/[sectionKey].tsx:256-296`; after timeout offer Retry (`ensurePlaceAudit`) + Back even when `errorMessage` is unset. Do NOT touch `stores/audit-store.ts` (`ensurePlaceAudit:800`) — UI reads only. New strings i18n'd ×5.
- **0.3 (S/M, G4) Theme doesn't track OS.** Add one `Appearance.addChangeListener` (in `stores/preferences-store.ts`) that recomputes `resolvedTheme` via the existing `resolveThemeMode` (:63-69) **only when `themeMode === "system"`**. All consumers (`design-system.ts:497`, `Provider.tsx:37`, `_layout.tsx:150-185,403`) already subscribe to the store — no consumer changes.
- **0.4 (M, G8) Report table clipping hotfix.** `components/reports/DomainItemsTable.tsx:41-48` hardcodes ~1436px of columns in a horizontal ScrollView with no cue: re-enable scroll indicators (`DomainScoreDisplay.tsx:340` sets them off) + add edge-fade/peek affordance. Full responsive redesign lands later in 6.3.

## Phase 1 — Foundations (unblocks everything downstream)

- **1.1 (S)** Motion tokens in `lib/design-system.ts` (durations, easing, pulse spec); respect reduced motion.
- **1.2 (M)** Skeleton primitives (`components/ui/skeleton.tsx`): `SkeletonBlock/Line/Circle` with a shared reanimated opacity pulse in brand surface tones. Reuse the shapes of the static settings skeleton (`settings.tsx:806-950`) as reference.
- **1.3 (S/M)** Shared `CenteredMessageCard` (currently duplicated in 6 execute-flow files).
- **1.4 (S, G1/G10)** Extract shared `themedHeaderOptions` helper from the canonical copy at `section/[sectionKey].tsx:103-119` (duplicated ×6); resolve the hardcoded `headerBlurEffect: "light"` (theme-aware or removed).
- **1.5 (M, G9)** Layout consolidation: single `isTablet` source (`lib/responsive-layout.ts:115` vs `lib/design-system.ts:502`); reconcile `homePageSupportRailWidth` vs `supportRailWidth` (`lib/responsive-layout-tokens.ts`); add a readable-measure token (~720px) for body text.
- **1.6 (S, G8)** Bottom-inset helper (safe-area + tab bar + FAB clearance) replacing hardcoded `bottomPadding: 92` across tab screens; aware of `BugReportFab` geometry (`b = insets.bottom + 88`, global mount `_layout.tsx:423`).
- **1.7 (M, G2)** Branded `AppLoader` (pulsing brand mark — **image asset, not text**, since fonts aren't loaded at the earliest gate).

Ordering: tokens → primitives → rollout; one header helper before six migrations; one `isTablet` before any rebalancing.

## Phase 2 — Header unification (depends 1.4)

- **2.1 (M)** Migrate all 6 execute screens onto the shared header helper, preserving Phase-0 fallback titles.
- **2.2 (M/L)** New shared `ScreenHeader` component for the 5 tab screens (currently `headerShown:false` + ad-hoc inline JSX, each styled differently); migrate all tabs. On tablet this also merges Home's stacked double header (avatar row `index.tsx:755-797` + H1 `817-830`).
- **2.3 (S)** Sweep: every screen title i18n'd with a loading fallback.
- **2.4 (S)** Remove the double `setOptions` per render in `execute/[placeId]/index.tsx:117-131` (also a lead for the iPhone ghost-text artifact).

## Phase 3 — Branded loader/skeleton rollout (depends 1.1–1.3, 1.7)

Replaces: 9 `ActivityIndicator`s, 2 Spinners, 6 duplicated CenteredMessageCards, 1 static skeleton, 3 `return null` root gates.

- **3.1 (M)** Root gates → `AppLoader` (`_layout.tsx:104` fonts/prefs, `:397` auth) and `ForceUpdateScreen.tsx:137`. _Highest-risk task — cold-start verify both platforms/themes._
- **3.2 (L)** Per-tab skeletons: Home (`index.tsx:733`), Places (`places.tsx:228`), Reports, Execute list — built from the same layout tokens as the real cards (finalize shapes together with 4.1).
- **3.3 (M)** Detail skeletons: `place/[placeId].tsx:705`, `report/[auditId].tsx:1393`.
- **3.4 (L)** Execute-flow skeletons + shared CenteredMessageCard adoption (integrates the 0.2 timeout UI).
- **3.5 (S)** Remaining spinners: `edit-profile.tsx:196`, `BugReportFab.tsx:452`; keep `action-button.tsx:49`'s small in-button spinner.
- **3.6 (S)** Settings static skeleton → pulsing primitives.

## Phase 4 — Component & density consolidation

- **4.1 (L, G5/G10)** Extract shared `QueueCard` from `PlaceQueueCard` (`places.tsx:437-623`) and `ReportQueueCard` (`reports.tsx:793-1010`); remove duplicate locality lines and the un-localized "Pending score" filler (`places.tsx:446`); kill the still-live `queueCardMinHeight` void (`responsive-layout-tokens.ts:33/51/69`) via content-driven heights. Watch FlashList recycling (stable keys, memoization, scroll-perf check).
- **4.2 (M, G3/G10)** Migrate hand-rolled CTAs to the existing `AppButton` (`components/ui/app-button.tsx`): `index.tsx:640-668`, `1611-1634`; `execute.tsx:261-285`, `420-442`.
- **4.3 (S/M, G10)** Home's inline stat tiles (`index.tsx:832-920`) → existing `StatCard`.
- **4.4 (M, G5)** Place-detail cleanup: address once, not 4× (`place/[placeId].tsx:436-508`); drop the body H1 duplicating the native header title (`:81-86` vs `:439-450`); localize the map card (hardcoded EN at `:368,395`) and collapse it to a compact row when coordinates are missing.

## Phase 5 — Tablet rebalance (depends 1.5; benefits from 2.2, 4.1)

- **5.1 (M/L, G9)** Home tablet branch (`index.tsx:741-956`): merged header (from 2.2) + rebalanced rail so the iPad main column stops starving (rail keeps only non-duplicated content: connectivity + up-next). Two-pane kept per approved scope.
- **5.2 (M)** Place-detail rail (`:513-529`): rebalance; drop only if irredeemable (document the decision).
- **5.3 (S/M, G9)** Apply the measure token to wizard/body text (execute flow, details).

## Phase 6 — Report detail

- **6.1 (S/M, G5)** Auto-collapse unscored domains: change `use-domain-expansion.ts:19-27` default so all-N/A domains start collapsed (still expandable). Presentation only — no scoring changes.
- **6.2 (M)** Replace the `+ 2900` magic scroll offset (`report/[auditId].tsx:839`) with measured `onLayout` offsets.
- **6.3 (M/L, G8)** Responsive `DomainItemsTable` redesign (priority columns / row-detail pattern replacing fixed ~1436px grid); builds on 0.4.
- **6.4 (S, G6)** Audit-code presentation (`:920-925`): chunked mono + copy action.
- **6.5 (S)** Remove dead `className` props (`SectionNavigatorCard:536-537`); scroll-to-top FAB via the 1.6 inset helper.

## Phase 7 — Copy, jargon, FAB, investigations

- **7.1 (M, G6)** PV/U/Q/V/C legend affordance (ⓘ → sheet) near first use, i18n'd ×5.
- **7.2 (S, external)** "involvment" instrument typo (`assets/bundled-instrument.json:403`) — content-owned; coordinate via `playspace-scoring-change` guardrails, do not edit in this workstream.
- **7.3 (S, G8)** Apply the 1.6 inset helper across tab screens so `BugReportFab` clears content.
- **7.4 (M, timeboxed spike)** Live-repro investigation: iPad-dark ghost tab labels + iPhone execute-place ghost text (no blur/gradient code exists; leads: double `setOptions` removed in 2.4, native tab bar quirk). Outcome = fix or documented root cause. Schedule after 2.4.

## Phase 8 — Verification & release

- **8.1** i18n sweep: `scripts/translate_i18n.py` for new keys; grep changed files for raw string literals; spot-check de (longest strings).
- **8.2** Per-batch static gates (repo rules — separate commands, truncated output): `./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | head -50`, then eslint, then prettier.
- **8.3** Maestro: run existing flows; add assertions for header titles (0.1) and the timeout/retry path (0.2).
- **8.4** Screenshot recapture with the hardened `scripts/capture-screenshots.mjs`: **all sets except iPhone** (per user). Add missing targets: overview, final-comments, space-audit, login/signup — and make the section screen capturable (warm-up ordering: hit the execute-place target first so `ensurePlaceAudit` resolves before the section deep link; longer wait for that target).
- **8.5** Manual matrix: live OS theme flip in System and manual modes (0.3); airplane-mode deep link into a section (0.2 must never abort sync); cold start both platforms (3.1); tablet widths (Phase 5); FlashList fast-scroll with a large queue (4.1).
- **8.6** `mobile-version-bump` skill at the end (minor bump expected). Ask before any git commit.

---

## Batching (delivery order)

| Batch           | Contents               | Why                                                           |
| --------------- | ---------------------- | ------------------------------------------------------------- |
| **A (first)**   | Phase 0                | Pure bug fixes, screenshot-diffable, unblockable              |
| **B**           | Phases 1 + 2 + 3       | The visible "overhaul feel"; 2 and 3 parallelize once 1 lands |
| **C**           | Phases 4 + 5 + 6       | 4.1 before 5 (rebalance against final cards)                  |
| **D (rolling)** | Phases 7 + 8 close-out | 7.2 is external and never blocks                              |

## Top regression risks → how they're caught

1. **Root-gate AppLoader (3.1)**: crash/theme-flash before hydration → image-only brand mark; caught by 8.5 cold-start matrix.
2. **Header migration (Ph. 2)**: Android back / title-timing regressions re-introducing raw slugs → 8.3 Maestro title assertions + 8.4 diffs.
3. **Appearance listener (0.3)**: fighting manual theme mode → no-op unless `system`; 8.5 theme tests in both modes.
4. **Timeout UI (0.2)**: surfacing during legitimately slow offline hydration; must never abort sync → 8.5 airplane test; consult `mobile-offline-sync-change` if anything near the store is touched.
5. **QueueCard in FlashList (4.1)**: recycling/perf bugs → 8.5 fast-scroll test.
6. **Skeleton/content mismatch (3.2–3.4)**: layout shift at load → skeletons share layout tokens with real cards; screenshot comparison.
7. **Bottom-inset change (1.6/7.3)**: clipped list ends → 8.4 list-end recapture diffs.

## Guardrails (hard constraints)

- No scoring/instrument logic changes; no sync-machine/MMKV/submission-queue changes — UI reads sync phases only.
- Every new user-facing string through i18n, all 5 locales.
- No commits/pushes/branches without explicit user approval.
- Mark `docs/UI_AUDIT_2026-07.md` as superseded by this plan when Batch A lands.

## Critical files

- `app/execute/[placeId]/section/[sectionKey].tsx` — P0 anchors, canonical header options, execute skeletons
- `stores/preferences-store.ts` — Appearance listener
- `app/_layout.tsx` — root gates → AppLoader, Stack route titles, global FAB mount
- `lib/design-system.ts` + `lib/responsive-layout-tokens.ts` — motion tokens, isTablet/rail/measure consolidation
- `app/(tabs)/index.tsx` — tablet double header + rail, hand-rolled CTAs/stat tiles
- `components/ui/` — new: `skeleton.tsx`, `app-loader.tsx`, `screen-header.tsx`, `centered-message-card.tsx`, `queue-card.tsx`; existing to adopt: `app-button.tsx`, `stat-card.tsx`, `typography.tsx`
- `components/reports/DomainItemsTable.tsx`, `use-domain-expansion.ts`, `app/report/[auditId].tsx`
- `scripts/capture-screenshots.mjs` + `screenshots/TARGETS.md` — new targets + warm-up ordering
