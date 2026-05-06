# Playspace Audit Tool — Design System

## Phase 4: Motion & Feedback

---

## Motion philosophy

Motion earns its place by communicating state, not decorating interaction.
Every animation answers one of three questions:

1. Where am I? — spatial transitions, progress feedback
2. Did that work? — confirmation, save feedback, submission
3. What changed? — state transitions, score reveals

Any animation that doesn't answer one of these is removed.

---

## 1. Domain transition (execute flow)

When the auditor advances from one domain to the next, it should feel like
turning a page in a physical instrument — not a page navigation.

Trigger: auditor taps "Next →" on the last question of a domain

Sequence:

1. Current section block: translateX(0)→(-24px), opacity 1→0
   Duration: 220ms, ease-in-fast

2. AuditProgressDots: active dot terracotta→moss (spring 400ms)
   Next dot: edge→terracotta (spring 300ms, 100ms delay)

3. New section block: translateX(24px)→(0), opacity 0→1
   Duration: 280ms, ease-spring
   Delay: 160ms (overlaps step 1 — feels continuous)

Total perceived: ~380ms

The 24px offset is small — not a dramatic swipe. Just "you moved forward."

Reduced motion fallback: opacity fade only, no translate. Instant dot change.

---

## 2. Auto-save feedback (mobile)

Save feedback must be ambient — present but never demanding attention.

On input blur / answer commit:
→ "Saving..." appears, Geist 11px textMuted, fade in 150ms

After 600ms (MMKV write confirmed):
→ Cross-fade to "Saved locally", 200ms

After 2000ms:
→ Fades out, 300ms. Returns to empty.

On server sync confirmation:
→ SyncStatusIsland shows "Synced" (moss), fades after 1500ms
→ Does NOT show "Saved locally" again

Rules:
No toast notifications for save events.
No success checkmarks.
"Saved" is never an achievement — it's ambient infrastructure.

---

## 3. Score reveal (submission → report)

When an audit is submitted, the score reveal should feel like a result
being uncovered — not just data loading.

Web (report page load):

1. Score cards mount: scale 0.96→1.0 (200ms spring), opacity 0→1
2. After 300ms delay: count-up 0→final score, 900ms spring
   PV and U count up simultaneously
3. Domain bars grow 0→final width, staggered 60ms per bar
   Each bar 500ms spring, triggered 200ms after count-up starts

Mobile: same sequence, 700ms count-up, 40ms stagger.

---

## 4. Audit submission moment

The most significant moment in the auditor's workflow. Research-appropriate —
not confetti, not celebration modals. The work is done and it has been received.

Sequence:

1. Submit button: press scale 0.97 (150ms spring), then terracotta spinner
2. On success: button resolves to moss checkmark
   Scale 1.0→1.04→1.0 (spring overshoot, 400ms)
   Color: terracotta→moss (300ms)
3. After 600ms: navigate to report view, score reveal begins
4. SyncStatusIsland: Syncing→Synced (or "Saved locally" if offline)

The moss checkmark and immediate transition to the score report IS the reward.
No modal. No stars. No "Great job!"

---

## 5. Offline → online sync transition

1. Island: offline (amber)→syncing (terracotta), spring 450ms
   Dot: breathing stops, starts pulsing
2. During sync: "Syncing..." with pulse dot, no other UI changes
3. On complete: syncing→synced (moss), dot settles, spring 450ms
4. After 1500ms: island fades out (400ms ease-in-fast), returns to idle

The whole sequence: brief acknowledgment, then gets out of the way.

---

## 6. Progress bar fill (AuditSectionBlock)

On question answer commit:
Width: current%→new%, 600ms cubic-bezier(0.32,0.72,0,1)
Spring easing gives slight overshoot — bar "lands" into position.

On domain entry (restoring existing progress):
Instant — no animation. Only animate forward progress.

---

## 7. Reduced motion — complete spec

@media (prefers-reduced-motion: reduce):
Domain transition: fade only, no translate
Count-up: skip, show final value immediately
Progress bars: instant width change
Score bars: instant width
Breathing dots: no animation
Submission moment: no scale, just color change
SyncStatusIsland: instant state change

React Native: check AccessibilityInfo.isReduceMotionEnabled() and pass
reduceMotion prop to all animated components.

---

## 8. Response time targets

Press feedback (scale): < 16ms
Hover state: < 50ms
State / badge change: 150ms
Card hover: 200ms
Collapse / expand: 300ms
Page transition: 350ms
Score count-up (first paint→done): 1200ms max
Sync island transition: 450ms

---

## Phase 4 Checklist

Web:

- [ ] Domain section transition (slide+fade, 380ms total)
- [ ] Score count-up on report page load (900ms, IntersectionObserver)
- [ ] Domain bar stagger animation on report (500ms, 60ms stagger)
- [ ] Submission moment: press→loading→moss checkmark→report
- [ ] prefers-reduced-motion overrides on all animation CSS

Mobile:

- [ ] Auto-save feedback: Saving→Saved locally→fade
- [ ] SyncStatusIsland: offline→syncing→synced full sequence
- [ ] Progress bar spring fill on question answer
- [ ] AuditProgressDots spring on domain advance
- [ ] Score count-up on report screen (700ms)
- [ ] AccessibilityInfo.isReduceMotionEnabled() in all animated components
- [ ] Submission: moss checkmark→navigate to report
