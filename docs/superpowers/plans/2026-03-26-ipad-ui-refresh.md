# iPad UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the iPad experience into a denser, more intentional tablet UI with taller cards, fuller screen usage, and more premium typography, while preserving the current phone UX and all existing app behavior.

**Architecture:** Expand the current tablet layout layer into a richer composition system, update shared UI primitives to support taller and more refined tablet surfaces, then rework the screen groups in place: dashboard, queue screens, detail/workspace screens, and form screens. Keep all data flow and routing unchanged, and verify the refresh through static checks plus simulator/screenshot comparisons on both iPad and iPhone rather than introducing new React Native screen-test infrastructure.

**Tech Stack:** Expo SDK 55, React Native 0.83, Expo Router, Tamagui, Zustand, existing screenshot automation in `scripts/screenshots/capture_pages.sh`

---

**Spec:** `docs/superpowers/specs/2026-03-26-ipad-ui-refresh-design.md`

**Relevant skills during implementation:** `@expo-best-practices`, `@expo-react-native-performance`, `@polish`

**Testing note:** Do not add new React Native component/unit test infrastructure in this plan. This task is highly visual and the repo does not already have screen-test coverage for these flows. Verification for this plan should rely on `typecheck`, `lint`, and screenshot/simulator comparison on both iPad and iPhone.

**Git note:** Do not create a commit unless the user explicitly asks for one.

**Scope note:** Keep auth/settings out of the main implementation unless a shared-primitive change reveals a concrete tablet inconsistency that must be fixed in the same pass.

## File Structure

### Files to Modify

- `lib/responsive-layout.ts`  
  Expand the responsive model from “tablet padding” into a composition layer with narrow-tablet vs wide-tablet behavior, panel widths, column gaps, and min-height tokens.

- `app/(tabs)/_layout.tsx`  
  Keep the tab bar proportionate to the new tablet control sizing.

- `components/ui/stat-card.tsx`  
  Support taller tablet metric surfaces and more deliberate typography hierarchy.

- `components/ui/action-button.tsx`  
  Improve tablet CTA height, label hierarchy, and button density.

- `components/ui/filter-chip.tsx`  
  Improve tablet chip scale without changing phone behavior.

- `components/ui/search-input.tsx`  
  Improve tablet field proportion and typography.

- `components/ui/collapsible-card.tsx`  
  Improve tablet header/body hierarchy and spacing.

- `components/playspace-audit/question-card.tsx`  
  Improve tablet question spacing, option height, and type hierarchy.

- `app/(tabs)/index.tsx`  
  Recompose the dashboard into a tablet main column plus support rail.

- `app/(tabs)/places.tsx`  
  Convert the iPad queue from stretched single-column cards into denser two-up tablet rows while preserving phone list behavior.

- `app/(tabs)/reports.tsx`  
  Apply the same tablet queue treatment while preserving report footer/export behavior.

- `app/(tabs)/execute/index.tsx`  
  Keep the featured place full-width and convert the rest of the tablet queue to denser paired rows.

- `app/place/[placeId].tsx`  
  Recompose the detail screen into a stronger hero plus balanced summary/support structure on tablet.

- `app/report/[auditId].tsx`  
  Recompose the report detail screen into a stronger hero plus balanced summary/support structure on tablet while preserving export logic.

- `app/(tabs)/execute/[placeId]/index.tsx`  
  Turn the execute overview into a tablet workspace with a main “work” column and a support column.

- `app/(tabs)/execute/[placeId]/pre-audit.tsx`  
  Give the pre-audit flow a focused form column and better tablet surface proportions.

- `app/(tabs)/execute/[placeId]/section/[sectionKey].tsx`  
  Give the section flow a focused form column, stronger notes surface, and tablet-aware support layout.

### Files to Create

- `lib/ui/pair-grid.ts`  
  Small utility for building stable two-column tablet rows from one-dimensional list data. This keeps the queue-screen grid implementation explicit and avoids relying on implicit list-column behavior that may complicate virtualization and spacing.

### Files Not Expected to Change

- `stores/*`  
  Keep store ownership and local-first/offline behavior unchanged.

- `lib/audit/*`  
  Do not change API, sync, export, scoring, or selector behavior unless a purely presentational import path needs a local adjustment.

- `app/(auth)/*`, `app/(tabs)/settings.tsx`  
  Keep these out of the main implementation unless shared primitive changes expose an obvious tablet inconsistency.

## Task 1: Expand The Tablet Composition Layer

**Files:**
- Modify: `lib/responsive-layout.ts`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Split tablet behavior into narrower and wider tiers**

Extend `useResponsiveLayout()` so it exposes composition-oriented values rather than only spacing values. Include tokens for:

- narrow-tablet vs wider-tablet thresholds
- content max width and form max width
- two-pane gap
- support-rail width
- queue card min height
- summary/hero card min height
- form option/button heights

Use explicit breakpoint constants, for example:

```ts
const TABLET_BREAKPOINT = 720;
const WIDE_TABLET_BREAKPOINT = 960;
```

Phone defaults must stay intact.

- [ ] **Step 2: Update the content-container helper for tablet compositions**

Adjust `getResponsiveContentContainerStyle()` so screens can center content intelligently while still using fuller tablet layouts. Keep support for:

- custom gap
- custom max width
- optional top padding

Do not remove the existing safe defaults for phone screens.

- [ ] **Step 3: Keep the tab bar proportional to the new tablet sizing**

Update `app/(tabs)/_layout.tsx` so the tablet tab bar stays visually balanced with the refreshed control heights and label hierarchy.

Preserve:

- `headerShown: false`
- theme-driven colors
- the existing route structure and tab order

- [ ] **Step 4: Run static validation for the shared layout layer**

Run: `bun run typecheck`

Expected: exit code `0`

- [ ] **Step 5: Do not commit**

The user has not asked for a commit. Leave changes uncommitted.

## Task 2: Upgrade Shared Tablet Primitives

**Files:**
- Modify: `components/ui/stat-card.tsx`
- Modify: `components/ui/action-button.tsx`
- Modify: `components/ui/filter-chip.tsx`
- Modify: `components/ui/search-input.tsx`
- Modify: `components/ui/collapsible-card.tsx`
- Modify: `components/playspace-audit/question-card.tsx`

- [ ] **Step 1: Give `StatCard` stronger tablet structure**

Update `StatCard` so tablet surfaces can be taller and better segmented without affecting phone defaults.

Prefer an explicit prop or layout token driven path such as:

```tsx
<StatCard
  label="Assigned"
  value="08"
  accentColor={ds.colors.primary}
  minHeight={layout.queueSummaryCardMinHeight}
/>
```

or a small semantic variant if that reads better than a raw `minHeight` prop.

- [ ] **Step 2: Scale shared controls for tablet**

Update shared buttons/inputs/chips so tablet screens no longer look like enlarged phone UI.

Required outcomes:

- CTA buttons feel substantial inside larger cards
- chips do not look tiny relative to surrounding surfaces
- search fields feel deliberate rather than stretched
- phone heights remain unchanged

- [ ] **Step 3: Improve shared tablet hierarchy in `CollapsibleCard` and `QuestionCard`**

Refine card headings, support copy, spacing, and answer-button height so tablet forms feel more premium and less compressed.

Preserve current behavior:

- collapsible open/close state
- question-answer selection logic
- gated follow-up-scale behavior

- [ ] **Step 4: Run static validation for shared UI**

Run: `bun run typecheck`

Expected: exit code `0`

- [ ] **Step 5: Do not commit**

The user has not asked for a commit. Leave changes uncommitted.

## Task 3: Recompose The Dashboard For iPad

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Split the tablet dashboard into a main column and support rail**

On tablet, restructure the screen so:

- the main column contains the header, priority task, and active audits
- the support rail contains KPI cards, connectivity status, field priorities, and the quick-action cluster

On phone, preserve the current stacked structure.

- [ ] **Step 2: Increase the visual weight of KPI and priority surfaces**

Make dashboard summary cards and the priority task card taller on tablet and give them stronger internal spacing.

Avoid turning them into even wider shallow rows.

- [ ] **Step 3: Move quick actions into a more deliberate tablet support block**

Keep the current actions and navigation behavior, but on tablet render them as a compact support card or support section instead of a stretched three-button row.

Preserve route pushes to:

- `/places`
- `/execute`
- `/reports`

- [ ] **Step 4: Apply premium tablet hierarchy**

Use the existing font families more intentionally:

- stronger page/display heading treatment
- quieter secondary copy
- cleaner label-to-title spacing
- more deliberate section headings

Do not add a new font family in this task.

- [ ] **Step 5: Run a targeted static check**

Run: `bun run typecheck`

Expected: exit code `0`

## Task 4: Build The Tablet Queue Grid Utility And Update `Places`

**Files:**
- Create: `lib/ui/pair-grid.ts`
- Modify: `app/(tabs)/places.tsx`

- [ ] **Step 1: Create a small two-column row helper**

Write a utility that turns a one-dimensional list into stable two-item tablet rows.

Example shape:

```ts
interface PairGridRow<T> {
  readonly id: string;
  readonly left: T;
  readonly right: T | null;
}
```

Implementation should accept a stable ID builder so screens can reuse it without duplicating row-pair logic.

- [ ] **Step 2: Keep phone `FlashList` behavior intact**

Do not change phone behavior in `app/(tabs)/places.tsx`.

Phone requirements:

- single-column queue
- current search/filter/sort behavior
- current navigation behavior
- current empty/loading state behavior

- [ ] **Step 3: Render denser paired rows on tablet**

For tablet, derive paired rows from `filteredPlaces` and render them as two balanced cards in each row.

Each card should:

- have stronger min height
- break content into clearer title/meta/score/progress/footer zones
- avoid the current wide-and-short feel

- [ ] **Step 4: Preserve all current list behavior**

Keep these behaviors unchanged:

- `searchQuery`
- `statusFilter`
- `sortOption`
- `router.push("/place/...")`
- `FlashList` header and empty-state behavior

- [ ] **Step 5: Run a targeted static check**

Run: `bun run typecheck`

Expected: exit code `0`

## Task 5: Update `Reports` And `Execute` Queue Screens

**Files:**
- Modify: `app/(tabs)/reports.tsx`
- Modify: `app/(tabs)/execute/index.tsx`

- [ ] **Step 1: Apply the paired-row tablet pattern to `reports`**

Use the shared pair-grid helper so iPad report rows render as denser two-up tablet panels.

Preserve:

- analytics summary header
- search/filter/sort behavior
- report-detail navigation
- export preview footer
- bulk export controls

- [ ] **Step 2: Keep the tablet `reports` footer behavior intact**

Do not break:

- warning panel rendering
- export preview loading behavior
- bulk export action layout

If footer spacing needs adjustment on iPad, change spacing only, not behavior.

- [ ] **Step 3: Apply the paired-row tablet pattern to `execute/index`**

Keep the featured place full-width on tablet, and render the remaining queue items as paired rows beneath it.

Preserve:

- active/all filtering
- hydration-driven ordering
- start/resume CTA behavior
- route pushes into `/(tabs)/execute/${placeId}`

- [ ] **Step 4: Improve tablet queue typography**

On both screens, strengthen title/body/label/action hierarchy so cards feel more premium and less uniformly weighted.

- [ ] **Step 5: Run a targeted static check**

Run: `bun run typecheck`

Expected: exit code `0`

## Task 6: Recompose Detail And Workspace Screens

**Files:**
- Modify: `app/place/[placeId].tsx`
- Modify: `app/report/[auditId].tsx`
- Modify: `app/(tabs)/execute/[placeId]/index.tsx`

- [ ] **Step 1: Give `place/[placeId]` a hero-plus-support layout on tablet**

Keep the place hero/header full-width, then restructure the body into a stronger tablet composition:

- summary metrics in a denser grid
- primary narrative content in the main content region
- action/support content in a secondary panel or support block

- [ ] **Step 2: Give `report/[auditId]` the same balanced tablet structure**

Keep all export logic and metadata behavior unchanged, but make the body feel less shallow by redistributing summary, metadata, and export blocks across a more intentional tablet layout.

- [ ] **Step 3: Turn `execute/[placeId]/index.tsx` into a tablet workspace**

On tablet:

- main column = place header + section list
- support column = sync status + mode selection + pre-audit entry + submission/support state

Preserve:

- `ensurePlaceAudit`
- submission behavior
- section navigation
- current error/loading flows

- [ ] **Step 4: Increase vertical weight on tablet-only detail cards**

Make metric cards, metadata blocks, and support panels feel substantial rather than flat. Use min heights and stronger internal spacing where needed.

- [ ] **Step 5: Run a targeted static check**

Run: `bun run typecheck`

Expected: exit code `0`

## Task 7: Recompose Pre-Audit And Section Forms

**Files:**
- Modify: `app/(tabs)/execute/[placeId]/pre-audit.tsx`
- Modify: `app/(tabs)/execute/[placeId]/section/[sectionKey].tsx`
- Modify: `components/playspace-audit/question-card.tsx`

- [ ] **Step 1: Keep the main question flow focused**

On tablet, preserve a readable main form column. Do not let question text span too wide.

- [ ] **Step 2: Add tablet support structure**

Introduce a support panel or contextual support block where it helps fill the iPad layout without distracting from the main form flow.

Good candidates:

- progress/status context
- notes presence
- sync/help context

- [ ] **Step 3: Make form surfaces taller and more deliberate**

Update tablet-only form presentation so:

- pre-audit cards feel substantial
- question answer buttons are taller
- note editors gain more depth and presence
- primary action buttons feel correctly proportioned

- [ ] **Step 4: Preserve behavior exactly**

Do not change:

- pre-audit value persistence
- section note persistence
- question-answer application
- router back/replace behavior
- error/loading handling

- [ ] **Step 5: Run a targeted static check**

Run: `bun run typecheck`

Expected: exit code `0`

## Task 8: Static Checks And Screenshot/Simulator Verification

**Files:**
- Verify: `lib/responsive-layout.ts`
- Verify: `lib/ui/pair-grid.ts`
- Verify: `components/ui/stat-card.tsx`
- Verify: `components/ui/action-button.tsx`
- Verify: `components/ui/filter-chip.tsx`
- Verify: `components/ui/search-input.tsx`
- Verify: `components/ui/collapsible-card.tsx`
- Verify: `components/playspace-audit/question-card.tsx`
- Verify: `app/(tabs)/_layout.tsx`
- Verify: `app/(tabs)/index.tsx`
- Verify: `app/(tabs)/places.tsx`
- Verify: `app/(tabs)/reports.tsx`
- Verify: `app/(tabs)/execute/index.tsx`
- Verify: `app/place/[placeId].tsx`
- Verify: `app/report/[auditId].tsx`
- Verify: `app/(tabs)/execute/[placeId]/index.tsx`
- Verify: `app/(tabs)/execute/[placeId]/pre-audit.tsx`
- Verify: `app/(tabs)/execute/[placeId]/section/[sectionKey].tsx`

- [ ] **Step 1: Run static checks**

Run: `bun run typecheck && bun run lint`

Expected:

- exit code `0`
- no new errors

- [ ] **Step 2: Capture refreshed screenshots when simulators are available**

With a booted iPad simulator and a booted iPhone simulator, run:

```bash
./scripts/screenshots/capture_pages.sh --no-frame-iphone
```

Expected:

- updated screenshots saved under `screenshots/ipad/*/raw/`
- updated screenshots saved under `screenshots/iphone/*/raw/`

- [ ] **Step 3: Compare iPad screens against the pre-refresh pain points**

Review the refreshed iPad outputs for:

- `03-home.png`
- `04-places.png`
- `10-reports.png`
- `06-execute.png`
- `07-execute-place.png`
- `08-execute-pre-audit.png`
- `09-execute-section.png`
- `05-place-detail.png`
- `11-report-detail.png`

Success criteria:

- no dominant shallow wide cards
- noticeably better canvas usage
- clearer hierarchy
- less dead space

- [ ] **Step 4: Verify phone safety**

Review representative iPhone outputs or simulator views for the same routes and confirm:

- no tablet support rails/grid layouts leak into phone widths
- tap targets remain comfortable
- queue density remains readable
- form flows still feel like mobile flows

- [ ] **Step 5: Verify tablet loading, empty, and error states**

Check representative scoped screens for non-happy-path tablet presentation:

- list loading states
- list empty states
- detail/loading placeholder cards
- route-error or unavailable-state cards

Success criteria:

- these states remain centered and properly weighted on tablet
- they do not span awkwardly wide containers
- they do not leave obviously broken or stranded whitespace

- [ ] **Step 6: Record any verification gaps honestly**

If simulator or screenshot verification cannot be completed in the execution environment, report the exact gap instead of claiming success.

- [ ] **Step 7: Do not commit**

The user has not asked for a commit. Leave changes uncommitted.

## Completion Checklist

- [ ] `lib/responsive-layout.ts` distinguishes narrower and wider tablet behavior
- [ ] shared UI primitives support taller, more deliberate tablet surfaces
- [ ] dashboard uses a main-column plus support-rail tablet composition
- [ ] `places`, `reports`, and `execute/index` use denser paired tablet rows while preserving phone list behavior
- [ ] detail/workspace screens feel balanced and no longer stop visually too early on iPad
- [ ] pre-audit and section forms feel composed for tablet without hurting readability
- [ ] tablet typography has stronger hierarchy and more premium rhythm
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] iPad and iPhone verification is completed, or any gaps are explicitly reported
