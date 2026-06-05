# Offline instrument loading - problem and fix

## Problem

Field auditors reported that **the PVUA instrument (questionnaire definition) would not load without internet**. Once they went online and loaded it once, they could complete audits offline afterward. **Expected:** auditors should still be able to use the questionnaire shell offline on first use where possible.

### Why it broke

- **Global instrument** in the audit store (`auditData$.instrument`) drives `useLocalizedInstrument()` and every execute screen (`instrument!` for preamble, sections, pre-audit questions, etc.). If it stays `null`, **the UI cannot render the form**.

- **`hydrate()`** restored sessions from MMKV but **did not guarantee an instrument** before setting `isHydrated = true`. The instrument came only from:
    - Persisted audit snapshot (`instrument` field in `persistedAuditStateSchema`), or
    - A **later** async `syncInstrument()` call.

- **`syncInstrument()`** (in `lib/services/instrument-sync.ts`) tried the API when “online,” then fell back to **MMKV instrument cache** (`playspace.instrument_cache`). On **first launch offline** (or cache cleared), **both were empty → returned `null`**.

- **Race:** Even when cache existed, there was a window after hydrate where `instrument` could still be `null` until `syncInstrument()` resolved, so **first paint could still fail or block on loading** depending on screen logic.

**Summary:** The bug was **no embedded fallback** and **no synchronous guarantee** that `instrument` was non-null after hydrate when there was no prior sync/cache.

---

## Fix (what was implemented)

### 1. Bundled instrument asset

- **`assets/bundled-instrument.json`** - English PVUA **v5.2** payload extracted from the repo’s canonical `instruments/instrument.json` (**`en` branch only**). ~394 KB in the app bundle.

### 2. Validated loader module

- **`lib/audit/bundled-instrument.ts`**
    - Imports the JSON (**Metro + `resolveJsonModule`**).
    - **`getBundledInstrument()`** - first call runs `playspaceInstrumentSchema.safeParse(...)`; result **cached in module state**; returns `null` only if validation fails (bad build).
    - **`BUNDLED_INSTRUMENT_VERSION`** - convenience constant from JSON `instrument_version` for future mismatch UX.

### 3. `syncInstrument()` last-resort fallback

- **`lib/services/instrument-sync.ts`**: after API (when online) and after MMKV cache, if still nothing → **`getBundledInstrument()`** so any caller of `syncInstrument()` gets a usable instrument offline **without** cache.

### 4. Eager instrument during `hydrate()`

- **`stores/audit-store.ts`** - after MMKV restore (or empty snapshot), **before** `setupAutoSave` / `auditUI$.isHydrated.set(true)`:
    - If `auditData$.instrument.peek() === null`, set **`getBundledInstrument()`** into `auditData$.instrument`.

- Then **`syncInstrument()`** still runs async and **overwrites** with API-fetched + MMKV-cached server instrument when available.

**Effect:** execute flows see a **non-null instrument immediately** on first offline launch; online sync **upgrades** to server truth when possible.

### 5. Documentation

- **`MOBILE_OFFLINE_FLOW.mmd`** - added nodes for “instrument still null?” → bundled fallback → best-effort `syncInstrument`.

---

## Relevant files

Paths are relative to the **workspace root** (`playspace/`).

| Path                                                                          | Role                                                                                                                                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `instruments/instrument.json`                                                 | Canonical instrument bundle (multi-locale wrapper); English payload under `en` is what gets extracted into the mobile bundled asset.                                 |
| `audit-tools-playspace-mobile/assets/bundled-instrument.json`                 | App-shipped PVUA definition (~394 KB); offline fallback when API + MMKV cache are unavailable.                                                                       |
| `audit-tools-playspace-mobile/lib/audit/bundled-instrument.ts`                | Imports bundled JSON, validates with `playspaceInstrumentSchema`, exposes `getBundledInstrument()` and `BUNDLED_INSTRUMENT_VERSION`.                                 |
| `audit-tools-playspace-mobile/lib/services/instrument-sync.ts`                | `syncInstrument()` - network fetch, MMKV keys `playspace.instrument_cache` / `playspace.instrument_cache_ts`, then bundled fallback.                                 |
| `audit-tools-playspace-mobile/stores/audit-store.ts`                          | `hydrate()` applies MMKV snapshot then eagerly sets bundled instrument when `instrument` is still null; async `syncInstrument()` upgrades store state.               |
| `audit-tools-playspace-mobile/lib/audit/types.ts`                             | `playspaceInstrumentSchema`, `persistedAuditStateSchema` (persisted `instrument`), session shapes carrying optional `instrument`.                                    |
| `audit-tools-playspace-mobile/lib/i18n/instrument-translations.ts`            | `useLocalizedInstrument()` - merges i18n overlays onto store `instrument`; depends on non-null base instrument.                                                      |
| `audit-tools-playspace-mobile/lib/audit/api.ts`                               | `createOrResumeAudit` / `fetchAuditSession` - server responses can carry session-scoped `instrument` (does not replace bundled fallback for global store hydration). |
| `audit-tools-playspace-mobile/app/execute/[placeId]/index.tsx`                | Execute entry / preamble / mode selection - typical first consumer of `useLocalizedInstrument()`.                                                                    |
| `audit-tools-playspace-mobile/app/execute/[placeId]/overview.tsx`             | Section overview - uses instrument for visible sections and progress.                                                                                                |
| `audit-tools-playspace-mobile/app/execute/[placeId]/pre-audit.tsx`            | Pre-audit fields driven by `instrument.pre_audit_questions`.                                                                                                         |
| `audit-tools-playspace-mobile/app/execute/[placeId]/section/[sectionKey].tsx` | Per-section questions from instrument sections.                                                                                                                      |
| `audit-tools-playspace-mobile/app/execute/[placeId]/space-audit.tsx`          | Space-setup step - instrument-driven matrix / pre-audit where applicable.                                                                                            |
| `audit-tools-playspace-mobile/MOBILE_OFFLINE_FLOW.mmd`                        | High-level offline persistence / sync diagram including bundled-instrument branch.                                                                                   |

---

## Behavior reviewers should verify

| Scenario                              | Expected                                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| First open, **offline**, no MMKV      | Instrument from **bundle**; form should render (**creating/resuming audit via API may still need network** - separate from instrument loading). |
| Had synced before; **offline**        | Prefer **MMKV instrument cache / persisted snapshot** over bundle when present.                                                                 |
| **Online**                            | API fetch wins; cache updated; store instrument updated when **`syncInstrument` resolves**.                                                     |
| Bundled JSON corrupted / schema drift | `getBundledInstrument()` returns `null`; instrument may stay null unless session/cache supplies one - **edge case to watch**.                   |

---

## Files to read when debugging

- **`stores/audit-store.ts`** - `hydrate()` bundle injection + `syncInstrument().then(...)`.
- **`lib/services/instrument-sync.ts`** - API → cache → bundled chain.
- **`lib/audit/bundled-instrument.ts`** - validation + caching.
- **`lib/i18n/instrument-translations.ts`** - `useLocalizedInstrument()` reads **store** `instrument`; **`null` still breaks UI**.
- **`MOBILE_OFFLINE_FLOW.mmd`** - intended lifecycle.

---

## Possible follow-up bugs / gaps

- **`ensurePlaceAudit`** still needs network to **create/resume server draft**; bundled instrument **does not** replace that.
- **Large bundle:** ~400 KB JSON increases app size; acceptable tradeoff for offline-first.

---

## Instrument live-update (added)

`syncInstrument()` is now triggered beyond hydrate:

- **Network reconnect** - `Network.addNetworkStateListener` in `_layout.tsx` fires `refreshInstrument()` (exposed from the audit store) whenever `isConnected + isInternetReachable` become true during an active session. This means an auditor who opens the app offline and later regains connectivity gets the latest server instrument without restarting the app.
- **Background task** - `runPendingAuditSyncAsync` (15-min background task) also calls `refreshInstrument()` after flush so the MMKV cache is kept warm for future offline sessions.

---

## Offline submit queue (added)

### New phase: `”queued_submit”`

Added to `auditSyncPhaseSchema` in `lib/audit/types.ts`. Semantics:

| State                      | Meaning                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `queued_submit`            | Auditor confirmed submit while offline; will be delivered automatically when online |
| Transitions to `submitted` | Background submit succeeded                                                         |
| Transitions to `blocked_*` | Background submit failed permanently                                                |

### Flow

1. Auditor taps **Submit** while offline.
2. `submitAuditSessionInternal` detects `isOnline === false`, sets phase to `”queued_submit”`, and returns the current session (no throw). The UI navigates to the section overview normally.
3. Editing is locked (`canApplyLocalDraftEdits` blocks `”queued_submit”`) - consistent with “submitting” UX.
4. On **network restore** (or background task): `processQueuedSubmits(session)` finds all `”queued_submit”` audits, resets their phase to `”dirty”/”idle”`, and runs the normal `submitAuditSession` path.
5. On **success**: phase → `”submitted”`, auditor sees the submitted state.
6. On **permanent failure**: phase → `”blocked_*”`. A `SubmitFailureNotification` is appended to `playspace.submit_failure_notifications` in MMKV. `notifySubmitFailureAsync` is called (best-effort, requires backend endpoint `POST /playspace/audits/{id}/notify-submit-failure`).
7. Next time the app comes to **foreground** while authenticated: `popSubmitFailureNotifications()` reads+clears the MMKV list and shows an `Alert` per failure.

### Backend work required

The mobile calls `POST /playspace/audits/{auditId}/notify-submit-failure` when a queued submit fails. The backend should handle this by sending the auditor an email. The mobile silently ignores 404/errors from this endpoint so it degrades gracefully before the backend implements it.

---

## Simulator + Device QA checklist (BUG-07)

Use this checklist when verifying the stale-instrument fix on both a simulator/emulator and a physical device.

### Test data / setup

Before starting, prepare the following:

- A backend whose active Playspace instrument contains a **known recent change** you can visually verify (for example, updated question wording or a renamed item).
- At least one existing/historical audit session whose `instrument_version` is **older** than the current active instrument.
- A test account that can open both:
    - a normal current audit flow, and
    - an older existing audit/report tied to the historical instrument version.
- One simulator/emulator and one physical device running the current mobile build.

### Backend sanity check

Do this once before device testing:

- Call `GET /playspace/instrument` against the same backend the mobile app is using.
- Confirm the response shows the **latest active** `instrument_version`, not the old canonical/static version.
- Confirm the changed item text in the payload matches the version you expect to see in the app.

### Simulator / emulator checklist

#### 1. Fresh online bootstrap

- [ ] Start with a clean install or cleared app storage.
- [ ] Launch the app **online**.
- [ ] Sign in and open a new/current audit flow.
- [ ] Verify the updated instrument item text is shown.
- [ ] Kill the app and reopen it while still online.
- [ ] Verify the same updated item still appears after relaunch.

#### 2. Stale cache upgrade path

- [ ] First load the app against an **older** active instrument so MMKV stores the old definition.
- [ ] Change the backend active instrument to the newer version.
- [ ] Relaunch the app **online**.
- [ ] Open a current audit flow.
- [ ] Verify the app now shows the **new** item version, not the stale cached one.
- [ ] Kill and reopen the app again.
- [ ] Verify the newer item remains visible and the old text does not reappear.

#### 3. Offline relaunch after upgrade

- [ ] After confirming the new instrument has been fetched once, put the simulator/emulator offline.
- [ ] Fully close the app.
- [ ] Reopen the app offline.
- [ ] Open a current audit flow or any screen that depends on the active instrument.
- [ ] Verify the latest fetched instrument still renders offline.
- [ ] Verify the app does not regress to the older cached wording.

#### 4. Offline startup with no recent network

- [ ] Clear app storage again.
- [ ] Keep the simulator/emulator offline before opening the app.
- [ ] Launch the app and reach an instrument-driven screen.
- [ ] Verify the app still renders from the bundled fallback instead of crashing or hanging on a null instrument.
- [ ] Bring the simulator/emulator back online.
- [ ] Verify reconnect upgrades the app to the backend's latest active instrument.

### Physical-device checklist

#### 5. Current-audit active instrument

- [ ] Launch the app on the physical device while online.
- [ ] Open a current audit flow.
- [ ] Verify the same updated item text seen on the simulator/emulator appears on device.
- [ ] Background the app, foreground it again, and reopen the same flow.
- [ ] Verify the updated item does not revert.

#### 6. Historical audit isolation

- [ ] Open a historical audit/report that is tied to an older `instrument_version`.
- [ ] Verify that screen renders correctly using the audit session's own instrument version.
- [ ] Leave that historical audit/report and return to:
    - a current audit flow, or
    - another screen that should use the latest active instrument.
- [ ] Verify the app returns to the **latest active** instrument there.
- [ ] Verify opening the old audit did **not** cause stale items to reappear elsewhere in the app.

#### 7. Reconnect behavior on device

- [ ] Put the physical device offline.
- [ ] Open the app and navigate to an instrument-driven screen.
- [ ] Restore connectivity.
- [ ] Wait for the reconnect-driven instrument refresh.
- [ ] Reopen the current audit flow.
- [ ] Verify the latest active instrument appears without reinstalling or clearing the app.

### Pass criteria

The fix should be considered verified only if all of the following are true:

- [ ] Current audit flows consistently show the latest active backend instrument after a successful sync.
- [ ] Older session-specific instruments stay scoped to their own historical audit/report screens.
- [ ] Opening a historical audit does **not** overwrite the app-wide active instrument used elsewhere.
- [ ] Offline relaunch uses the best available local instrument and does **not** resurrect older stale wording once a newer version has already been fetched.
- [ ] `/playspace/instrument` matches the latest active backend instrument that the mobile app should be converging to.
