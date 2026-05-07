import * as BackgroundTask from "expo-background-task";
import * as Network from "expo-network";
import * as TaskManager from "expo-task-manager";
import { readAuthSession } from "lib/auth/storage";
import { usePlayspaceAuditStore } from "stores/audit-store";

import type { AuthSession } from "lib/auth/types";
const AUDIT_BACKGROUND_TASK_NAME = "playspace-audit-background-sync";
const AUDIT_BACKGROUND_MINIMUM_INTERVAL_MINUTES = 15;

let activeSyncPromise: Promise<boolean> | null = null;

if (!TaskManager.isTaskDefined(AUDIT_BACKGROUND_TASK_NAME)) {
    TaskManager.defineTask(AUDIT_BACKGROUND_TASK_NAME, async () => {
        const wasSuccessful = await runPendingAuditSyncAsync();
        return wasSuccessful ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed;
    });
}

interface RunPendingAuditSyncOptions {
    readonly session?: AuthSession | null;
}

/**
 * Register the best-effort background audit sync task when the platform allows
 * background processing for this build.
 */
export async function registerAuditBackgroundTaskAsync(): Promise<void> {
    const isTaskManagerAvailable = await TaskManager.isAvailableAsync();
    if (!isTaskManagerAvailable) {
        return;
    }

    const taskStatus = await BackgroundTask.getStatusAsync();
    if (taskStatus !== BackgroundTask.BackgroundTaskStatus.Available) {
        return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(AUDIT_BACKGROUND_TASK_NAME);
    if (isRegistered) {
        return;
    }

    await BackgroundTask.registerTaskAsync(AUDIT_BACKGROUND_TASK_NAME, {
        minimumInterval: AUDIT_BACKGROUND_MINIMUM_INTERVAL_MINUTES,
    });
}

/**
 * Unregister the background audit sync task, for example after logout.
 */
export async function unregisterAuditBackgroundTaskAsync(): Promise<void> {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(AUDIT_BACKGROUND_TASK_NAME);
    if (!isRegistered) {
        return;
    }

    await BackgroundTask.unregisterTaskAsync(AUDIT_BACKGROUND_TASK_NAME);
}

/**
 * Execute one serialized sync pass for locally saved audit changes.
 *
 * @param options Optional caller-provided authenticated session.
 * @returns True when the sync pass finished without API failures.
 */
export async function runPendingAuditSyncAsync(options: Readonly<RunPendingAuditSyncOptions> = {}): Promise<boolean> {
    if (activeSyncPromise !== null) {
        return activeSyncPromise;
    }

    const nextSyncPromise = runPendingAuditSyncInternalAsync(options);
    activeSyncPromise = nextSyncPromise;
    try {
        return await nextSyncPromise;
    } finally {
        if (activeSyncPromise === nextSyncPromise) {
            activeSyncPromise = null;
        }
    }
}

/**
 * Resolve auth and connectivity, hydrate the audit store for the active user,
 * and flush pending audit edits to the backend.
 *
 * @param options Optional caller-provided authenticated session.
 * @returns True when the sync pass finished without API failures.
 */
async function runPendingAuditSyncInternalAsync(options: Readonly<RunPendingAuditSyncOptions>): Promise<boolean> {
    const session = options.session ?? (await readAuthSession());
    if (session === null) {
        return true;
    }

    const isNetworkAvailable = await isNetworkAvailableAsync();
    if (!isNetworkAvailable) {
        return true;
    }

    await usePlayspaceAuditStore.getState().hydrate(session.user.id);
    const hydratedStore = usePlayspaceAuditStore.getState();
    const flushResult = await hydratedStore.flushPendingChanges(session);
    await hydratedStore.processQueuedSubmits(session);
    await hydratedStore.refreshInstrument();
    return flushResult.failedAuditIds.length === 0;
}

/**
 * Check whether the device currently appears online enough to attempt a sync.
 *
 * @returns True when the network is available or its status is unknown.
 */
async function isNetworkAvailableAsync(): Promise<boolean> {
    try {
        const networkState = await Network.getNetworkStateAsync();
        return networkState.isConnected !== false && networkState.isInternetReachable !== false;
    } catch {
        return true;
    }
}
