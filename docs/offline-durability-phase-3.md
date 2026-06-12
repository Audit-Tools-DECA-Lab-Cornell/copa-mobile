# Offline Durability — Phase 3 (Delivery Depth) Implementation Spec

Status as of 2026-06-12: drain triggers (foreground/hydrate/network) landed in
Phase 0; `pendingUploadCount` selector landed in Phase 2; the **pending-uploads
banner** is implemented (see `components/playspace-audit/pending-uploads-banner.tsx`).
This spec covers the remaining, native/infra-bound pieces that need an
`expo-notifications` dependency and an EAS rebuild, so they are **not** in the
live tree yet (importing a missing native module would break the build).

Principle: the server-side never-arrived detector (Phase 1) is the real delivery
**guarantee**. Everything here is timeliness / UX — getting the auditor to reopen
on wifi sooner, or waking the app to drain without the user.

---

## 3a. Local notification when uploads stay pending

Goal: if `pendingUploadCount > 0` and the oldest pending submit is older than N
hours, post a local notification reminding the auditor to open the app on wifi.

### Dependencies (require EAS rebuild)

```
bun add expo-notifications expo-device
```

`app.config.js` → add to `plugins`:

```js
[
  "expo-notifications",
  { icon: "./assets/notification-icon.png", color: "#0d9488" },
],
```

### New module: `lib/notifications/pending-upload-reminder.ts`

```ts
import * as Notifications from "expo-notifications";

import { createModuleLogger } from "lib/logger";
import { usePlayspaceAuditStore } from "stores/audit-store";

const log = createModuleLogger("pending-upload-reminder");
const REMINDER_IDENTIFIER = "playspace.pending-upload-reminder";

/**
 * Post (or clear) a single local reminder reflecting the current pending-upload
 * count. Idempotent: it always cancels the prior reminder first, so repeated
 * calls never stack. Call from the foreground/app-background handlers.
 */
export async function syncPendingUploadReminder(): Promise<void> {
    const pending = usePlayspaceAuditStore.getState().pendingUploadCount;
    try {
        await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => undefined);
        if (pending <= 0) {
            return;
        }
        const granted = await ensurePermission();
        if (!granted) {
            return;
        }
        await Notifications.scheduleNotificationAsync({
            identifier: REMINDER_IDENTIFIER,
            content: {
                title: "Audits waiting to upload",
                body:
                    pending === 1
                        ? "1 audit hasn't uploaded yet. Open Playspace on wifi to finish."
                        : `${pending} audits haven't uploaded yet. Open Playspace on wifi to finish.`,
            },
            // Fire a few hours out; if the app reopens and drains, the handler
            // cancels it first so it never fires for already-sent work.
            trigger: { seconds: 6 * 60 * 60 },
        });
    } catch (error) {
        log.withError(error).warn("failed to sync pending-upload reminder");
    }
}

async function ensurePermission(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
        return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
}
```

### Wiring (`app/_layout.tsx`)

In the existing AppState/foreground effect that drains queued submits, after a
drain attempt and on `app_background`, call `void syncPendingUploadReminder();`.
Cancel on successful full drain (pending === 0 path already handled inside).

### Tests

`syncPendingUploadReminder` is mostly side-effecting; unit-test the message
selection by extracting `buildReminderBody(pending: number): string` into a pure
helper and asserting singular/plural. The scheduling itself needs a device.

---

## 3b. Silent push-triggered drain (strongest background path)

Goal: the server's never-arrived detector sends a **silent** (content-available)
push; the app wakes in the background and runs `processQueuedSubmits`. This is
the most reliable background mechanism on iOS because it is event-driven, not
interval-scheduled.

### Client: push-token registration — `lib/notifications/push-registration.ts`

```ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { getApiBaseUrl } from "lib/api-base-url";
import { createModuleLogger } from "lib/logger";
import type { AuthSession } from "lib/auth/types";

const log = createModuleLogger("push-registration");

/** Register for push and upload the Expo push token for the signed-in auditor. */
export async function registerPushTokenAsync(session: AuthSession): Promise<void> {
    if (!Device.isDevice) {
        return; // simulators cannot receive push
    }
    try {
        const perm = await Notifications.getPermissionsAsync();
        const granted = perm.granted || (await Notifications.requestPermissionsAsync()).granted;
        if (!granted) {
            return;
        }
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await fetch(`${getApiBaseUrl()}/playspace/me/push-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `${session.tokenType} ${session.accessToken}`,
            },
            body: JSON.stringify({ token, platform: "expo" }),
        });
    } catch (error) {
        log.withError(error).warn("push token registration failed");
    }
}
```

### Client: background notification task

Register a TaskManager task that drains on a silent push. In `app/_layout.tsx`
top-level (module scope), alongside the existing background task:

```ts
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";

const PUSH_DRAIN_TASK = "playspace-push-drain";
TaskManager.defineTask(PUSH_DRAIN_TASK, async () => {
    const { runPendingAuditSyncAsync } = await import("lib/audit/background-sync");
    await runPendingAuditSyncAsync();
});
Notifications.registerTaskAsync(PUSH_DRAIN_TASK);
```

`app.config.js` → `ios.infoPlist.UIBackgroundModes` must include
`"remote-notification"` (and keep `"fetch"`/`"processing"`).

### Backend: store token + send silent push

- **Migration** (playspace, `ps_0006`): table `playspace_push_tokens`
  (`id`, `auditor_profile_id` FK, `token` unique, `platform`, `created_at`,
  `updated_at`).
- **Model** `PlayspacePushToken` with `lazy="raise"` relationship.
- **Route** `POST /playspace/me/push-token` (auditor-only) → upsert token by
  `(auditor_profile_id, token)`.
- **Send**: in `notify_stalled_submissions` (or a sibling), before/instead of the
  email for recently-stalled audits, POST to Expo Push API
  `https://exp.host/--/api/v2/push/send` with
  `{ to: token, _contentAvailable: true, data: { auditId } }`. Keep the email as
  the fallback when no token / push fails.
- **Tests**: token upsert idempotency; push-send invoked for stalled audits with
  a token (mock the HTTP call).

### Contract / cross-repo

New route `POST /playspace/me/push-token` → add to `testing/contracts` if the
shape is asserted; web client unaffected (mobile-only). Follow
`cross-repo-contract-change`.

---

## 3c. BGAppRefresh (opportunistic bonus)

`expo-background-task` already registers a background task (Phase 0/earlier). To
also use the shorter iOS BGAppRefresh window:

- `app.config.js` → `ios.infoPlist.UIBackgroundModes` include `"fetch"`.
- The existing `registerAuditBackgroundTaskAsync` already sets a 15-min minimum
  interval; no code change beyond ensuring the background modes are present.
- Treat as best-effort only — never the guarantee.

---

## Acceptance / verification (needs simulator + device)

- Maestro: airplane → submit → background → reconnect → audit delivered; banner
  shows count then clears.
- Device: silent push wakes the app and drains (cannot be done in CI/simulator
  for APNs; use a real device + EAS dev build).
- Local notification fires after the window when pending remains, and is
  cancelled when the queue drains.
