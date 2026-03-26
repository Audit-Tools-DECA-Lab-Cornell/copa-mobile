# iPad UI Refresh Design

**Date:** 2026-03-26

**Goal:** Redesign the tablet/iPad experience so it feels intentionally composed for a larger canvas, with denser screen usage, taller components, and more premium typography, while preserving the existing phone UX and all current field-audit behavior.

## Approved Scope

Implement an iPad-first visual refresh for the existing mobile app using the approved direction:

- denser grid composition as the layout system foundation: fuller screen usage, less dead horizontal space, and more intentional tablet structure
- premium typography refinement layered into that layout: stronger hierarchy, more refined headline/body/label contrast, and more editorial rhythm

The refresh applies to the following screen groups:

- `app/(tabs)/index.tsx`
- `app/(tabs)/places.tsx`
- `app/(tabs)/reports.tsx`
- `app/(tabs)/execute/index.tsx`
- `app/place/[placeId].tsx`
- `app/report/[auditId].tsx`
- `app/(tabs)/execute/[placeId]/index.tsx`
- `app/(tabs)/execute/[placeId]/pre-audit.tsx`
- `app/(tabs)/execute/[placeId]/section/[sectionKey].tsx`
- shared tablet presentation primitives in `components/ui/*`, `components/playspace-audit/question-card.tsx`, and `lib/responsive-layout.ts`

Minor tablet polish on auth/settings surfaces is allowed only if it supports consistency with the new tablet system. The primary focus is the field-auditor product flow.

Auth/settings polish should stay out of the initial implementation plan unless shared-primitive updates expose a clear tablet inconsistency that should be corrected in the same pass.

Do not change:

- phone layouts, spacing, or interaction behavior outside targeted tablet-specific rules
- stores, API contracts, route structure, deep-link shape, or offline/local-first behavior
- auth behavior, export logic, audit scoring logic, or execution-state semantics

## Current Context

The current iPad pass solved only the first problem: it introduced a responsive width/padding layer so the app no longer simply stretches edge-to-edge. That improved structure, but the screenshots still show a tablet UX that feels visually unresolved:

- cards remain proportioned like phone cards, so they read as very wide and too short
- many screens still use stacked mobile composition, which creates visible unused canvas on iPad
- summary surfaces feel shallow instead of substantial
- detail pages stop too early visually, leaving large dead areas below important content
- form screens retain large full-width blocks without enough supporting structure or spatial hierarchy
- typography is readable, but not yet deliberate enough to make the larger layout feel premium

This means the next iteration should not just adjust tokens again. It should change the tablet composition model.

## Chosen Approach

Use a **denser grid tablet layout with premium typography refinement**:

1. Keep the responsive-layout abstraction as the tablet presentation entry point.
2. Change tablet composition rules so iPad screens use the extra width intentionally rather than only centering content.
3. Make major cards and sections noticeably taller on tablet so they feel balanced against their width.
4. Introduce asymmetrical two-column and support-rail layouts on tablet where content benefits from it.
5. Upgrade typography on tablet by refining hierarchy, spacing, and role usage rather than by introducing an entirely new font stack.
6. Keep phone screens functionally and visually stable by scoping all major structural changes behind tablet width checks.

This is a **flagship polish** task, not an MVP responsive patch.

## Typography Direction

“Premium typography” in this scope means **hierarchy and rhythm**, not merely bigger text.

### Principles

- Use the existing loaded font families more intentionally:
  - `Space Grotesk` remains the expressive tablet heading face
  - `Geist` remains the body/UI workhorse
  - `JetBrains Mono` remains reserved for compact metrics and coded/status-like microcopy
- Increase the visual separation between:
  - page/display headings
  - section headings
  - card titles
  - supporting body copy
  - micro labels and metadata
- Reduce the feeling of “everything is medium-large text” by making support copy quieter and headlines more deliberate
- Make uppercase labels less shouty on tablet by giving them more space, not just more size

### Tablet Typography Decisions

- Page titles should scale up and get more deliberate spacing on tablet
- Section titles and important card titles should shift slightly toward editorial rhythm: larger, calmer, less cramped
- Supporting copy should stay readable but visually quieter to prevent the interface from feeling uniformly heavy
- KPI values and summary metrics should feel anchored inside taller cards rather than floating inside shallow slabs
- Long-value cards such as project names and metadata should use improved line breaks and vertical spacing so they look intentional rather than stretched

### Font Constraint

Do not add a new font family unless implementation proves the current `Space Grotesk` + `Geist` pairing is fundamentally insufficient. The preferred design path is to improve role usage first.

## Screen-Level Design

### `app/(tabs)/index.tsx` — Dashboard

The dashboard should become an intentionally asymmetrical tablet composition.

#### Layout

- Use a two-column iPad layout rather than a long stacked single column
- Primary column contains:
  - page header
  - priority task
  - active audits
- Secondary/support column contains:
  - KPI summary cards
  - connectivity status
  - field priorities
  - quick action cluster where appropriate

#### Visual Behavior

- KPI cards become taller and more substantial
- priority task card grows in height and internal spacing
- support sections stop reading like repeated thin rows
- screen should feel full without looking crowded

### `app/(tabs)/places.tsx`, `app/(tabs)/reports.tsx`, `app/(tabs)/execute/index.tsx` — Queue/List Screens

These screens should stop using very wide single-row list cards on iPad.

#### Layout

- Keep title, summary tiles, search, and filters as a top tablet header block
- Use a denser tablet card grid for list content:
  - prefer 2-column grid behavior on iPad where card readability remains strong
  - if virtualization or layout stability makes a literal grid undesirable, use a composed tablet row layout that still reads as two balanced panels
- Keep featured or priority cards full-width only when they truly deserve special emphasis

#### Card Design

- Increase min height of list cards on tablet
- Add stronger internal vertical segmentation:
  - title/meta cluster
  - metric/summary area
  - progress row
  - footer action row
- Avoid large uninterrupted horizontal stripes

#### Intended Outcome

- card widths feel intentional rather than stretched
- more of the tablet canvas is actively used
- scrolling feels like browsing a tablet interface, not enlarged phone cards

### `app/place/[placeId].tsx` and `app/report/[auditId].tsx` — Detail Screens

These screens currently feel especially shallow on iPad and leave too much unused space below the fold.

#### Layout

- Keep the hero/header block full-width
- After the header, split the body into balanced tablet sections:
  - summary metrics in a grid
  - primary narrative content in the main column
  - metadata/actions/export/supporting detail in a secondary column or support panel

#### Visual Behavior

- summary cards become taller
- metadata cards should not read as flat rectangles
- action areas should feel like a deliberate side panel rather than another repeated stacked card
- the page should carry visual weight further down the viewport

### `app/(tabs)/execute/[placeId]/index.tsx` — Execute Overview

This page should feel like an operational workspace on iPad.

#### Layout

- main column:
  - place header
  - section list
- support column:
  - sync status
  - mode selection
  - pre-audit entry point
  - submission state if useful

#### Visual Behavior

- section cards become taller and less cramped
- the column balance should make better use of width without harming scanability
- the “work to do” side of the page should remain visually dominant

### `app/(tabs)/execute/[placeId]/pre-audit.tsx` and `app/(tabs)/execute/[placeId]/section/[sectionKey].tsx` — Form Screens

Form screens need to stay readable, but should not remain giant shallow stacks on iPad.

#### Layout

- keep the main input/question reading flow in a focused main column
- add a support rail or secondary panel on tablet where appropriate for:
  - progress
  - context/help
  - notes
  - sync state
- do not make question text lines too long

#### Visual Behavior

- field cards become taller and more substantial
- option buttons should scale vertically on iPad
- notes/editor areas should gain more depth and presence
- pre-audit should feel like a composed tablet form, not repeated mobile blocks

### `components/ui/*` and `components/playspace-audit/question-card.tsx`

Shared tablet surfaces must support the new composition model.

#### Required updates

- cards need tablet min-height and padding behavior that matches the screen compositions
- buttons and chips need improved tablet proportions so they stop looking undersized inside larger panels
- search inputs should feel deliberate, not like magnified phone fields
- question cards need better tablet spacing and answer-button height

## Responsive System Design

The current `lib/responsive-layout.ts` abstraction is the correct starting point, but it should evolve from simple spacing tokens into a more expressive tablet composition layer.

### Extend the shared tablet model with values for:

- content width tiers
- form-focused width tiers
- card min heights by use case
- tablet column spacing
- support-rail sizing
- taller control heights
- tablet-specific section spacing

The implementation plan should explicitly distinguish between narrower tablet widths and wider tablet widths where composition meaningfully changes, so portrait and landscape decisions stay consistent.

### Constraint

Do not let shared tablet tokens become so generic that they force every screen into the same layout. The abstraction should support composition, not flatten it.

## Data Flow

This redesign is presentational only.

- existing stores remain the source of truth
- local-first/offline behavior remains unchanged
- search, filter, sort, export, sync, scoring, and execution state remain unchanged
- responsive branching lives in the presentation layer only
- no new duplicated screen-local data models should be introduced

## Error, Empty, And Loading States

Behavior should stay the same, but tablet presentation should improve.

- loading and error cards should be centered and properly weighted on tablet
- empty states should not span awkwardly wide containers
- if a support rail has nothing meaningful to show, the screen may collapse back to a single-column tablet layout rather than rendering decorative emptiness
- every layout must degrade cleanly between phone and tablet without leaving stranded whitespace

## Risks

### Overfilling the iPad canvas

If the redesign simply adds more columns without stronger hierarchy, the result could feel busier rather than better. Density must be paired with clear information priority.

### Phone regressions

Because shared UI primitives will change, the implementation must keep phone defaults intact and ensure tablet-only sizing does not leak into mobile layouts.

### Uneven card heights

On queue screens, mixed content length can create ragged grids. The design should use min heights and consistent internal structure so cards still feel aligned.

### Form readability degradation

Tablet forms can become harder to read if questions are allowed to span too wide or if too much support content competes with the main form column.

### Typography becoming louder instead of better

Tablet typography should feel more premium, not merely bigger or heavier. The implementation must improve contrast between roles instead of inflating every text size.

## Testing And Verification

Verification must explicitly cover both tablet improvement and phone safety.

### Static checks

- `bun run typecheck`
- `bun run lint`

### Manual iPad verification

- use the iPad screenshot flow or simulator validation on the scoped screens
- compare before/after composition on:
  - dashboard
  - places
  - reports
  - execute index
  - place detail
  - report detail
  - pre-audit
  - execute section
- confirm the screens no longer feel dominated by shallow wide cards or dead space

### Manual phone regression verification

- check representative iPhone screens for the same routes
- confirm list density, tap targets, form flows, and navigation feel unchanged or improved
- confirm tablet-specific support rails or grid layouts do not leak into phone widths

### Visual quality checks

- stronger hierarchy on tablet headings and card titles
- support copy remains readable but visually quieter
- action buttons look proportionate inside larger cards
- no major empty vertical zones after the key content blocks

## Success Criteria

- iPad screens use the canvas intentionally rather than presenting centered mobile stacks
- major cards and list rows are taller and better balanced against their width
- dashboard, list, detail, and form screens all feel intentionally designed for tablet
- tablet typography has stronger hierarchy and more premium rhythm
- phone layouts remain safe and functionally unchanged
- no store, route, sync, export, or audit-state behavior regresses
- changed files pass targeted verification before the task is declared complete

## Implementation Boundary

This spec defines the iPad/tablet visual refresh only. The implementation plan should decompose it into focused tasks by screen group and shared UI primitives, with explicit phone-regression verification steps.
