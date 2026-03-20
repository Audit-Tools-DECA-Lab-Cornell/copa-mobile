import { useEffect, useRef } from "react";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/** Retry interval for background sync when dirty data exists (ms). */
const SYNC_INTERVAL_MS = 30000;

/**
 * Background sync hook that flushes locally-saved audit answers to the
 * backend whenever connectivity is available.
 *
 * Starts an immediate flush attempt when dirty data is detected, then
 * retries on a fixed interval until all dirty data is synced.
 *
 * Place this hook in a layout component that stays mounted for the duration
 * of the authenticated session (e.g. the main tab layout).
 */
export function useAuditSync(): void {
    const session = useAuthStore((state) => state.session);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const dirtySections = usePlayspaceAuditStore((state) => state.dirtySections);
    const dirtyPreAudit = usePlayspaceAuditStore((state) => state.dirtyPreAudit);
    const flushPendingChanges = usePlayspaceAuditStore((state) => state.flushPendingChanges);

    const hasDirtyData = Object.keys(dirtySections).length > 0 || dirtyPreAudit.length > 0;

    const sessionRef = useRef(session);
    sessionRef.current = session;

    useEffect(() => {
        if (!isHydrated || !hasDirtyData || session === null) {
            return;
        }

        void flushPendingChanges(session);

        const timer = setInterval(() => {
            const currentSession = sessionRef.current;
            if (currentSession !== null) {
                void flushPendingChanges(currentSession);
            }
        }, SYNC_INTERVAL_MS);

        return () => {
            clearInterval(timer);
        };
    }, [isHydrated, hasDirtyData, session, flushPendingChanges]);
}
