# Ghost-text artifacts — investigation notes (plan task 7.4)

Two artifacts were reported from the July 2026 screenshot review:

1. **iPhone, execute-place screen:** faint duplicated "ghost" text layered over
   the native header.
2. **iPad, dark theme:** ghost tab labels in the bottom tab bar.

## Code findings

- **No blur or gradient code exists** anywhere in the repo that could explain a
  translucent duplicated layer (confirmed by search; the only `headerBlurEffect`
  was the hardcoded `"light"` in the six execute-screen header option copies —
  now theme-aware via `lib/ui/themed-header.ts`).

- **Execute-place header (lead confirmed in code, fix shipped):** the execute
  screens called `navigation.setOptions` **twice in the same render commit** —
  once with a string `title`, then again with a `headerTitle` component. On
  iOS, native-stack header title views are swapped asynchronously; two options
  updates in one commit can momentarily layer the outgoing string title under
  the incoming custom title view, which matches the reported artifact exactly.
  Task 2.4 collapsed every double `setOptions` into a single merged call
  (`app/execute/[placeId]/index.tsx`, `overview.tsx`, `final-comments.tsx`,
  `section/[sectionKey].tsx`). This is the most probable root cause; needs a
  device re-verification pass (plan task 8.5) to close.

- **iPad-dark tab labels (probable theme-desync, mitigations shipped):** the
  tab bar takes colors from `useDesignSystem()` while the navigation container
  took its light/dark base theme from `resolvedTheme`. Before task 0.3 the
  resolved theme did **not** track live OS appearance changes, so after an OS
  theme flip the navigation theme and the design-system palette could disagree
  until an unrelated re-render — leaving previously rasterized label layers
  visible against the new background (reads as "ghost" labels, most visible in
  dark mode). Task 0.3 (single `Appearance` listener updating `resolvedTheme`
  in one store commit) removes the desync window. If the artifact survives
  0.3 + 2.4 on-device, the next suspect is the native tabs implementation
  (react-native-screens bottom-tabs label re-rasterization on trait-collection
  change) and should be reproduced with a minimal Tabs example before filing
  upstream.

## Status

- Fixes shipped: 2.4 (single merged `setOptions`), 0.3 (live theme tracking),
  theme-aware header blur (1.4).
- Remaining: live repro on iPhone + iPad-dark during the 8.5 manual matrix to
  confirm both artifacts are gone; if the tab-label ghost persists, capture it
  with `scripts/capture-screenshots.mjs` (iPad dark set) and escalate upstream.
