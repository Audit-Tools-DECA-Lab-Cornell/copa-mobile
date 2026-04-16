import { useCallback, useEffect, useMemo, useRef } from "react";
import * as Network from "expo-network";
import { AppState, type AppStateStatus } from "react-native";
import { runPendingAuditSyncAsync } from "lib/audit/background-sync";
import {
    buildSyncableAuditIds,
    shouldAttemptAutomaticSync,
    shouldRetrySubmitResolution,
    type AutomaticSyncTrigger,
} from "lib/audit/store-sync-core";
import type { AuditSession, AuditSyncStateByAuditId, DirtyMeta, DirtyPreAudit, DirtySections } from "lib/audit/types";
import type { AuthSession } from "lib/auth/types";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/**
 * Debounce window after local edits before a passive foreground sync (ms).
 * Long-form audits typically use ~1.5–2s; shorter intervals suit real-time collab.
 */
const FOREGROUND_SYNC_DEBOUNCE_MS = 1800;

interface AutomaticSyncSnapshot {
    readonly sessionsByAuditId: Record<string, AuditSession>;
    readonly dirtySections: DirtySections;
    readonly dirtyPreAudit: DirtyPreAudit;
    readonly dirtyMeta: DirtyMeta;
    readonly syncStateByAuditId: AuditSyncStateByAuditId;
}

/**
 * Build the audits currently eligible for automatic sync execution.
 *
 * @param snapshot Store snapshot fields required for phase-aware selection.
 * @returns Syncable audit ids whose effective phase is currently dirty.
 */
function buildAutomaticSyncAuditIds(snapshot: AutomaticSyncSnapshot): string[] {
    return buildSyncableAuditIds({
        sessionsByAuditId: snapshot.sessionsByAuditId,
        dirtySections: snapshot.dirtySections,
        dirtyPreAudit: snapshot.dirtyPreAudit,
        dirtyMeta: snapshot.dirtyMeta,
    }).filter((auditId) => shouldAttemptAutomaticSync(snapshot.syncStateByAuditId[auditId]?.phase ?? "dirty"));
}

/**
 * Determine whether the next normal trigger must retry submit-resolution work
 * even though ordinary draft auto-sync remains phase-`dirty` only.
 *
 * @param snapshot Store snapshot fields required for phase-aware selection.
 * @returns True when some audit still needs submit-resolution retry work.
 */
function hasPendingSubmitResolutionRetry(snapshot: AutomaticSyncSnapshot): boolean {
    return Object.entries(snapshot.syncStateByAuditId).some(([auditId, syncState]) =>
        shouldRetrySubmitResolution({
            currentPhase: syncState.phase,
            hasDirtyFragments:
                snapshot.dirtyMeta[auditId] !== undefined ||
                snapshot.dirtyPreAudit[auditId] !== undefined ||
                Object.keys(snapshot.dirtySections[auditId] ?? {}).length > 0,
        }),
    );
}

/**
 * Determine whether the next ordinary sync pass should run because either
 * draft autosync or submit-resolution retry work is still pending.
 *
 * @param snapshot Store snapshot fields required for phase-aware selection.
 * @returns True when an ordinary sync pass should be scheduled.
 */
function hasPendingNormalSyncWork(snapshot: AutomaticSyncSnapshot): boolean {
    return buildAutomaticSyncAuditIds(snapshot).length > 0 || hasPendingSubmitResolutionRetry(snapshot);
}

/**
 * Reopen trigger-eligible blocked audits when applicable, then enqueue one
 * sync pass if any audit still has normal sync work.
 *
 * @param session Authenticated session for the API flush.
 * @param trigger What caused this immediate attempt (checkpoint or lifecycle).
 */
function runImmediateForegroundSync(session: AuthSession, trigger: AutomaticSyncTrigger): void {
    usePlayspaceAuditStore.getState().prepareAutomaticSyncAudits(trigger);
    const currentState = usePlayspaceAuditStore.getState();
    if (
        !hasPendingNormalSyncWork({
            sessionsByAuditId: currentState.sessionsByAuditId,
            dirtySections: currentState.dirtySections,
            dirtyPreAudit: currentState.dirtyPreAudit,
            dirtyMeta: currentState.dirtyMeta,
            syncStateByAuditId: currentState.syncStateByAuditId,
        })
    ) {
        return;
    }

    runPendingAuditSyncAsync({ session }).catch(() => undefined);
}

/**
 * Run one non-debounced sync after a user checkpoint (blur, section change) or
 * when invoked from app background. Safe to call from any module; no-ops when
 * the audit store is not hydrated for the signed-in user.
 *
 * @param trigger Checkpoint or lifecycle reason for this flush attempt.
 */
export function requestImmediateAuditSync(trigger: AutomaticSyncTrigger): void {
    const authSession = useAuthStore.getState().session;
    const { currentUserId, isHydrated } = usePlayspaceAuditStore.getState();
    if (authSession === null || !isHydrated || authSession.user.id !== currentUserId) {
        return;
    }
    runImmediateForegroundSync(authSession, trigger);
}

/**
 * Event-driven foreground sync hook that flushes locally-saved audit answers
 * when the authenticated tab tree is active.
 *
 * Sync attempts are triggered by:
 * - app startup once the authenticated user's audit store is hydrated
 * - debounced local edits (~1.5–2s after the last change)
 * - connectivity restoration
 * - app foregrounding
 * - leaving the active app state (background / inactive), for a forced flush
 */
export function useAuditSync(): void {
    const session = useAuthStore((state) => state.session);
    const currentUserId = usePlayspaceAuditStore((state) => state.currentUserId);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const sessionsByAuditId = usePlayspaceAuditStore((state) => state.sessionsByAuditId);
    const dirtySections = usePlayspaceAuditStore((state) => state.dirtySections);
    const dirtyPreAudit = usePlayspaceAuditStore((state) => state.dirtyPreAudit);
    const dirtyMeta = usePlayspaceAuditStore((state) => state.dirtyMeta);
    const syncStateByAuditId = usePlayspaceAuditStore((state) => state.syncStateByAuditId);
    const isSyncing = usePlayspaceAuditStore((state) => state.isSyncing);
    const localChangeCounter = usePlayspaceAuditStore((state) => state.localChangeCounter);

    const hasPendingNormalWork = useMemo(
        () =>
            hasPendingNormalSyncWork({
                sessionsByAuditId,
                dirtySections,
                dirtyPreAudit,
                dirtyMeta,
                syncStateByAuditId,
            }),
        [dirtyMeta, dirtyPreAudit, dirtySections, sessionsByAuditId, syncStateByAuditId],
    );

    const sessionRef = useRef(session);
    sessionRef.current = session;
    const isCurrentUserHydrated = session?.user.id === currentUserId;

    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    /**
     * Reopen trigger-eligible blocked audits, then run one sync pass only when
     * some audit is now phase-dirty.
     *
     * @param trigger Automatic trigger that may reopen retryable blocked phases.
     */
    const runTriggeredSync = useCallback((trigger: AutomaticSyncTrigger) => {
        const currentSession = sessionRef.current;
        if (currentSession === null) {
            return;
        }

        runImmediateForegroundSync(currentSession, trigger);
    }, []);

    useEffect(() => {
        if (!isHydrated || !hasPendingNormalWork || !isCurrentUserHydrated || session === null) {
            return;
        }

        const timer = setTimeout(() => {
            runPendingAuditSyncAsync({ session }).catch(() => undefined);
        }, FOREGROUND_SYNC_DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
        };
    }, [hasPendingNormalWork, isCurrentUserHydrated, isHydrated, isSyncing, localChangeCounter, session]);

    useEffect(() => {
        if (!isHydrated || !isCurrentUserHydrated || session === null) {
            return;
        }

        const timer = setTimeout(() => {
            runTriggeredSync("auth_restore");
        }, FOREGROUND_SYNC_DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
        };
    }, [isCurrentUserHydrated, isHydrated, session, runTriggeredSync]);

    useEffect(() => {
        if (!isHydrated || !isCurrentUserHydrated || session === null) {
            return;
        }

        const networkSubscription = Network.addNetworkStateListener((networkState) => {
            const isOnline = networkState.isConnected !== false && networkState.isInternetReachable !== false;
            if (!isOnline) {
                return;
            }

            runTriggeredSync("network_restore");
        });

        return () => {
            networkSubscription.remove();
        };
    }, [isCurrentUserHydrated, isHydrated, session, runTriggeredSync]);

    useEffect(() => {
        if (!isHydrated || !isCurrentUserHydrated || session === null) {
            return;
        }

        appStateRef.current = AppState.currentState;

        const appStateSubscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
            const previousState = appStateRef.current;
            appStateRef.current = nextAppState;

            if (previousState === "active" && nextAppState !== "active") {
                runTriggeredSync("app_background");
            }

            if (nextAppState === "active") {
                runTriggeredSync("foreground");
            }
        });

        return () => {
            appStateSubscription.remove();
        };
    }, [isCurrentUserHydrated, isHydrated, session, runTriggeredSync]);
}
