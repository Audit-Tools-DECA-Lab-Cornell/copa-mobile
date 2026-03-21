import { useEffect, useRef } from "react";
import * as Network from "expo-network";
import { AppState, type AppStateStatus } from "react-native";
import { runPendingAuditSyncAsync } from "lib/audit/background-sync";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/** Debounce bursty local edits before attempting a foreground sync (ms). */
const FOREGROUND_SYNC_DEBOUNCE_MS = 400;

/**
 * Event-driven foreground sync hook that flushes locally-saved audit answers
 * when the authenticated tab tree is active.
 *
 * Sync attempts are triggered by:
 * - app startup once the authenticated user's audit store is hydrated
 * - debounced local edits
 * - connectivity restoration
 * - app foregrounding
 */
export function useAuditSync(): void {
    const session = useAuthStore((state) => state.session);
    const currentUserId = usePlayspaceAuditStore((state) => state.currentUserId);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const dirtySections = usePlayspaceAuditStore((state) => state.dirtySections);
    const dirtyPreAudit = usePlayspaceAuditStore((state) => state.dirtyPreAudit);
    const localChangeCounter = usePlayspaceAuditStore((state) => state.localChangeCounter);

    const hasDirtyData =
        Object.keys(dirtySections).length > 0 || Object.keys(dirtyPreAudit).length > 0;

    const sessionRef = useRef(session);
    sessionRef.current = session;
    const hasDirtyDataRef = useRef(hasDirtyData);
    hasDirtyDataRef.current = hasDirtyData;
    const isCurrentUserHydrated = session?.user.id === currentUserId;

    useEffect(() => {
        if (!isHydrated || !hasDirtyData || !isCurrentUserHydrated || session === null) {
            return;
        }

        const timer = setTimeout(() => {
            void runPendingAuditSyncAsync({ session });
        }, FOREGROUND_SYNC_DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
        };
    }, [hasDirtyData, isCurrentUserHydrated, isHydrated, localChangeCounter, session]);

    useEffect(() => {
        if (!isHydrated || !isCurrentUserHydrated || session === null) {
            return;
        }

        const networkSubscription = Network.addNetworkStateListener((networkState) => {
            const isOnline =
                networkState.isConnected !== false && networkState.isInternetReachable !== false;
            if (!isOnline || !hasDirtyDataRef.current) {
                return;
            }

            const currentSession = sessionRef.current;
            if (currentSession !== null) {
                void runPendingAuditSyncAsync({ session: currentSession });
            }
        });

        return () => {
            networkSubscription.remove();
        };
    }, [isCurrentUserHydrated, isHydrated, session]);

    useEffect(() => {
        if (!isHydrated || !isCurrentUserHydrated || session === null) {
            return;
        }

        const appStateSubscription = AppState.addEventListener(
            "change",
            (nextAppState: AppStateStatus) => {
                if (nextAppState !== "active" || !hasDirtyDataRef.current) {
                    return;
                }

                const currentSession = sessionRef.current;
                if (currentSession !== null) {
                    void runPendingAuditSyncAsync({ session: currentSession });
                }
            },
        );

        return () => {
            appStateSubscription.remove();
        };
    }, [isCurrentUserHydrated, isHydrated, session]);
}
