# CLAUDE.md — audit-tools-playspace-mobile

## Design System Implementation Brief

This file instructs Claude Code on how to implement the PVUA design system
update on the mobile app. Read it fully before writing any code.

-----

## Prerequisites — do not start until these are confirmed

1. The frontend repo (`audit-tools-playspace-frontend`) design system
   implementation is complete and verified.
1. You have read `PVUA_DESIGN_SYSTEM_PHASE1.md` and
   `PVUA_DESIGN_SYSTEM_PHASE2_UPDATED.md`.

The mobile implementation is a **translation** of verified frontend decisions
into Tamagui tokens and React Native patterns. It is not a redesign.

-----

## Repo context

- **Framework:** Expo + Expo Router
- **UI:** Tamagui v5
- **Language:** TypeScript
- **Package manager:** bun
- **Theme source:** `themes.ts` — palette arrays consumed by Tamagui's
  `createV5Theme`. This is the mobile equivalent of `design-system.ts`.
- **Tamagui config:** `tamagui.config.ts` — fonts, animations, media queries
- **State:** Legend State (audit runtime) + Zustand (auth/places/prefs)
- **Storage:** MMKV (on-device) + Expo Secure Store (auth)

-----

## Task sequence — do these in order, do not combine tasks

### Task 1 — Replace palette arrays in `themes.ts`

**File to touch:** `themes.ts` only.

Replace the existing `darkPalette` and `lightPalette` arrays with these
hue-locked ramps. The previous palette had an unintentional hue drift in
stops 5–7 (jumping to 110°, 188°, 135° hue — olive, teal, forest green).
The new arrays stay in the 26–30° warm-brown band throughout.

```typescript
const darkPalette = [
  "hsla(30, 22%, 10%, 1)",   // 1  canvas
  "hsla(30, 22%, 13%, 1)",   // 2  surface
  "hsla(30, 22%, 16%, 1)",   // 3  surface raised
  "hsla(29, 22%, 20%, 1)",   // 4  surface sunken / alt
  "hsla(29, 22%, 26%, 1)",   // 5  mid-dark (was 110° olive — fixed)
  "hsla(29, 22%, 33%, 1)",   // 6  mid (was 188° teal — fixed)
  "hsla(28, 23%, 41%, 1)",   // 7  mid-light (was 135° forest — fixed)
  "hsla(28, 24%, 51%, 1)",   // 8  (was 83° yellow-green — fixed)
  "hsla(27, 25%, 63%, 1)",   // 9  text muted
  "hsla(27, 27%, 76%, 1)",   // 10 text secondary
  "hsla(26, 30%, 88%, 1)",   // 11 text primary
  "hsla(26, 33%, 96%, 1)",   // 12 near-white
]

const lightPalette = [
  "hsla(33, 38%, 97%, 1)",   // 1  canvas
  "hsla(32, 35%, 93%, 1)",   // 2  surface
  "hsla(31, 32%, 89%, 1)",   // 3  surface raised
  "hsla(30, 29%, 84%, 1)",   // 4
  "hsla(29, 27%, 76%, 1)",   // 5
  "hsla(28, 26%, 66%, 1)",   // 6
  "hsla(27, 26%, 56%, 1)",   // 7
  "hsla(27, 26%, 46%, 1)",   // 8
  "hsla(26, 27%, 36%, 1)",   // 9
  "hsla(25, 28%, 26%, 1)",   // 10
  "hsla(24, 30%, 16%, 1)",   // 11
  "hsla(23, 32%, 9%, 1)",    // 12 near-black
]
```

Keep the `childrenThemes` block (warning/error/success with yellow/red/green)
exactly as-is. Do not modify it.

**Verification:** After this task, run `bun run typecheck`. The theme shape
must not have changed — only the palette values.

-----

### Task 2 — Update accent colors in `tamagui.config.ts`

**File to touch:** `tamagui.config.ts` only.

Tamagui's `createV5Theme` generates component themes from the palette arrays.
The custom semantic accent colors need to be registered separately.

Find where custom color tokens are defined (or add them if they don't exist).
Update/add the following custom token values:

```typescript
// In the createTamagui config, tokens.color section:
accentTerracotta: "#c58a5c",
accentMoss:       "#5e9470",   // was #6f9a7f — deepened
accentSlate:      "#7a90b7",
accentViolet:     "#9b86b2",

// Surface tints (for badge backgrounds, block tints)
accentTerracottaSurface: "rgba(197, 138, 92, 0.12)",
accentMossSurface:       "rgba(94, 148, 112, 0.12)",
accentSlateSurface:      "rgba(122, 144, 183, 0.12)",
accentVioletSurface:     "rgba(155, 134, 178, 0.12)",

// Accent borders
accentTerracottaBorder: "rgba(197, 138, 92, 0.28)",
accentMossBorder:       "rgba(94, 148, 112, 0.28)",
accentSlateBorder:      "rgba(122, 144, 183, 0.28)",
accentVioletBorder:     "rgba(155, 134, 178, 0.28)",
```

If Tamagui token registration differs from the pattern above due to the
installed version, adapt to the correct Tamagui v5 token registration pattern
while preserving these values.

-----

### Task 3 — Add typography font variants to `tamagui.config.ts`

**File to touch:** `tamagui.config.ts` only.

Add new named font variants for the typography roles defined in the design
system. These use fonts already loaded — no new font assets needed.

**New font roles:**

```typescript
// Eyebrow labels (domain names, section headers)
// Uses Space Grotesk — already loaded as headingMedium/headingBold
// Create a small-size heading variant
headingEyebrow: createStaticFont("SpaceGrotesk-Medium", {
  ...defaultConfig.fonts.heading,
  // Override sizes to eyebrow scale
  size: { true: 11 },     // 11px
  weight: { true: '500' },
  letterSpacing: { true: 0.48 },  // 0.03em at 16px base
}),

// Score dimension labels (PV, U, S)
// Uses Space Grotesk — small, slightly heavier
headingScoreDim: createStaticFont("SpaceGrotesk-Medium", {
  ...defaultConfig.fonts.heading,
  size: { true: 10 },
  weight: { true: '600' },
  letterSpacing: { true: 0.2 },   // subtle
}),

// Badge / status labels
// Uses Geist — warm, approachable
bodyBadge: createStaticFont("Geist-Medium", {
  ...defaultConfig.fonts.body,
  size: { true: 11 },
  weight: { true: '500' },
  letterSpacing: { true: 0.22 },  // 0.02em
}),

// Counter text ("Question 7 of 12")
// Uses Geist Regular
bodyCounter: createStaticFont("Geist-Regular", {
  ...defaultConfig.fonts.body,
  size: { true: 12 },
  weight: { true: '400' },
}),

// Metadata / coded values only (auditor codes, timestamps, raw totals)
// Uses JetBrains Mono — strictly for opaque coded data
monoMeta: createStaticFont("JetBrainsMono-Regular", {
  ...defaultConfig.fonts.body,
  size: { true: 11 },
  weight: { true: '400' },
  letterSpacing: { true: 0.44 },  // 0.04em
}),
```

Add these to the `fonts` object in `createTamagui`. Use the same
`createStaticFont` helper pattern already present in the file.

**Verification:** `bun run typecheck` must pass. Font names must match
exactly what is loaded via `expo-font` — check existing font loading to
confirm `SpaceGrotesk-Medium`, `Geist-Medium`, `Geist-Regular`,
`JetBrainsMono-Regular` are the correct family names.

-----

### Task 4 — Create `SyncStatusIsland` component

**File to create:** `components/ui/sync-status-island.tsx`

Floating pill that shows the current sync state. Appears at the top of
the execute screen when sync state is not idle.

```typescript
type SyncState = 'offline' | 'syncing' | 'synced' | 'idle'

interface SyncStatusIslandProps {
  state: SyncState
  onPress?: () => void
}
```

**Visual spec:**

```
Container: XStack, borderRadius 24, paddingH 14, paddingV 8
           Background: dark canvas with 95% opacity
           Border: 0.5px, color by state (see below)
           Shadow: soft elevation

State colors:
  offline:  border accentWarning (amber)  · dot amber · label amber
  syncing:  border accentTerracotta       · dot terracotta · label terracotta
  synced:   border accentMoss             · dot moss · label moss
  idle:     return null (render nothing)

Dot: 7px circle, Tamagui View with borderRadius
     offline: slow breathing animation (2s)
     syncing: pulse animation (1.2s)
     synced:  no animation

Label font: bodyBadge (Geist 11px 500)
Label text:
  offline: "Offline"
  syncing: "Syncing..."
  synced:  "Synced"

Transition: spring animation between states
  type: "spring", stiffness: 180, damping: 20

Entrance: spring from translateY(-8) + opacity 0 → translateY(0) + opacity 1

Auto-dismiss for 'synced':
  After 1500ms, call a callback or trigger state change to 'idle'
  Implement via useEffect with cleanup
```

Use Tamagui's `Animated` or React Native's `Animated` API for the dot
animations. Use the Tamagui spring animation preset for transitions.

**Breathing animation (offline dot):**

```typescript
useEffect(() => {
  if (state !== 'offline') return
  const anim = Animated.loop(
    Animated.sequence([
      Animated.timing(opacity, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ])
  )
  anim.start()
  return () => anim.stop()
}, [state])
```

-----

### Task 5 — Create `AuditProgressDots` component

**File to create:** `components/ui/audit-progress-dots.tsx`

Domain progress indicator for the execute tab header.

```typescript
interface AuditProgressDotsProps {
  placeName: string
  auditLabel: string          // e.g. "Audit #3"
  totalDomains: number
  completedDomains: number    // domains fully completed
  activeDomain: number        // 1-indexed, currently in progress
  progressPercent: number     // overall % for the text label
}
```

**Visual spec:**

```
Stack (vertical):
  Row 1: "{placeName} · {auditLabel}"
         Geist 13px 600, textPrimary

  Row 2: "Domain {activeDomain} of {totalDomains} · {progressPercent}% complete"
         Geist 11px 400, textMuted

  Row 3: Dot row (XStack, gap 6)
         {totalDomains} dots, 8px circles

         Dot states:
           index < completedDomains:  moss fill, full opacity
           index === completedDomains (active): terracotta fill, full opacity
           index > completedDomains:  edge color, opacity 0.4

         Dot transitions (spring, stiffness 200, damping 18):
           On domain advance:
             Previous active dot: terracotta → moss (400ms)
             Next dot becomes active: edge → terracotta (300ms, 100ms delay)
```

Use Tamagui `Circle` or `View` with `borderRadius` for dots.
Animate via Tamagui's `animate` prop or `@legendapp/motion` if available.

-----

### Task 6 — Create mobile `AuditSectionBlock` component

**File to create:** `components/ui/audit-section-block.tsx`

Mobile equivalent of the web AuditSectionBlock. Same structure, Tamagui
implementation.

```typescript
interface AuditSectionBlockProps {
  domainNumber: number
  domainName: string
  sectionHeading: string
  questionNumber: number
  totalQuestions: number
  sectionNumber: number
  totalSections: number
  questionText: string
  progressPercent: number
  hasProvisionScale?: boolean
  onProvisionSelect?: (value: 0 | 1 | 2 | 3) => void
  provisionValue?: 0 | 1 | 2 | 3 | null
  autoSaveStatus?: 'idle' | 'saving' | 'saved'
}
```

**Domain eyebrow:**

```
Font: headingEyebrow (Space Grotesk 11px 500, tracking 0.03em)
Color: accentViolet token
Text: `Domain {n} · {domainName}`
```

**Progress bar:**

```
Height: 2, borderRadius: 1
Background: edge color
Fill: accentViolet, animated width via spring
transition: spring, stiffness 120, damping 20
```

**Question text:**

```
Font: body (Geist) 13px, textSecondary, lineHeight 1.6
```

**Provision scale toggle:**

```
Button: borderRadius 8, border 0.5px edge color
Label: bodyBadge (Geist 11px 500)
Icon: ▶ rotates 90deg on open via spring
Expanded body: animated height (Tamagui Collapsible or Animated.View)
Scale buttons: 4 items (0–3), violet active state
```

**Auto-save indicator:**

```
Absolutely positioned (or last item in column)
Font: bodyCounter (Geist 12px 400), textMuted
idle:   render null
saving: "Saving..."
saved:  "Saved locally", fades out after 2000ms via Animated.timing opacity
```

-----

### Task 7 — Add tactile press feedback to all interactive elements

**Files to touch:** Any component in `components/` that uses `Pressable`,
Tamagui `Button`, or similar touchable primitives.

Add to all interactive elements:

```typescript
// Tamagui Button/Pressable
pressStyle={{ scale: 0.97 }}
animation="fast"  // uses the existing fast spring preset
```

This creates the physical press feeling. Apply consistently — every button,
every pressable card, every toggle. This is a global change across all
interactive components.

Check the existing Tamagui animation config (`animations` in
`tamagui.config.ts`) — the `fast` preset (damping 20, stiffness 250) is
already defined and is the correct one for press feedback.

-----

### Task 8 — Formalize or remove `EXPO_PUBLIC_GLASS_UI_ENABLED`

**Files to touch:** Search the codebase for `EXPO_PUBLIC_GLASS_UI_ENABLED`
and find all usage sites.

Two options — choose based on what you find:

**If glass UI is used in active, working components:**
Define it as a proper design system variant. Create
`lib/design/glass-config.ts`:

```typescript
export const GLASS_UI_ENABLED = process.env.EXPO_PUBLIC_GLASS_UI_ENABLED === 'true'

export const glassSurface = {
  backgroundColor: 'rgba(26, 22, 18, 0.85)',
  borderColor: 'rgba(255, 255, 255, 0.08)',
  // Tamagui doesn't support backdrop-filter natively on RN
  // Use @react-native-community/blur if available, otherwise approximate
}
```

**If glass UI is commented out, unused, or behind dead code:**
Remove the feature flag and all associated code. Dead feature flags are
technical debt. Leave a comment: `// Glass UI removed — see PVUA design system Phase 2`.

Report which path you took in a code comment at the top of any file changed.

-----

## Global constraints — read before every task

**Never:**

- Hardcode hex values in component files — always use Tamagui token references
  (`$accentMoss`, `$accentTerracotta`, etc.) or the registered custom tokens
- Use JetBrains Mono for human-readable labels — only for coded data
  (auditor codes, timestamps, raw numeric totals)
- Combine multiple tasks in one session
- Modify the semantic child themes (warning/error/success yellow/red/green)
- Touch the audit execution state logic (Legend State store) — design only
- Touch MMKV persistence logic — design only
- Touch sync logic (`lib/audit/background-sync.ts`, `lib/audit/use-audit-sync.ts`)
  — the sync STATUS is displayed by the new component, but the sync logic
  itself is not modified

**Always:**

- Run `bun run typecheck` after each task
- Use the Tamagui animation system for all transitions — not raw
  React Native `Animated` unless Tamagui doesn't support the specific
  animation type
- Preserve the existing font loading in `tamagui.config.ts` — add, don't replace
- Keep the existing `createStaticFont` pattern for new font variants
- Use `@media (prefers-reduced-motion: reduce)` equivalent: check if Tamagui
  exposes `useReducedMotion` or check `AccessibilityInfo.isReduceMotionEnabled`
  and disable animations accordingly

-----

## Font name verification

Before Task 3, verify these font family names are correctly loaded by
running a grep across the codebase:

```bash
grep -r "SpaceGrotesk\|Geist\|JetBrains" tamagui.config.ts
```

The exact strings passed to `createStaticFont` must match the font family
names registered with `expo-font`. Common discrepancies:

- `"SpaceGrotesk-Medium"` vs `"Space Grotesk Medium"`
- `"Geist-Regular"` vs `"GeistRegular"`

Use whatever exact strings are already working in the existing font config.

-----

## Verification checklist after all tasks

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run check` passes (typecheck + lint + format)
- [ ] Dark palette has no visible green/teal/olive hue in mid-range stops
- [ ] Light palette is warm cream throughout
- [ ] Moss accent is visibly deeper/more saturated than before
- [ ] All status/badge text uses Geist or Space Grotesk — not JetBrains Mono
- [ ] Domain eyebrows use Space Grotesk — not JetBrains Mono
- [ ] JetBrains Mono only appears in auditor codes, timestamps, raw totals
- [ ] SyncStatusIsland correctly cycles through offline/syncing/synced
- [ ] AuditProgressDots spring-animates on domain advance
- [ ] All interactive elements have `pressStyle={{ scale: 0.97 }}`
- [ ] Glass UI either properly defined or cleanly removed
- [ ] OpenDyslexic font switching still works
- [ ] iOS build succeeds (`bun run ios`)
- [ ] Android build succeeds (`bun run android`)
