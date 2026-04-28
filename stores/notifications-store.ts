import {
    getNotifications,
    getUnreadCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    type Notification,
} from "lib/notifications/api";
import { loadNotificationsCache, saveNotificationsCache } from "lib/storage/notification-cache";
import { create } from "zustand";
import type { AuthSession } from "lib/auth/types";

import { usePlayspaceAuditStore } from "stores/audit-store";
import { useAuthStore } from "stores/auth-store";
import { usePlacesStore } from "stores/places-store";
import { createModuleLogger } from "lib/logger";

const log = createModuleLogger("notifications-store");

let assignmentRefreshInFlight = false;

/**
 * Re-fetches assigned places and locally cached audit sessions when the server
 * reports more unread notifications (assignments / audits likely changed).
 */
async function refreshAssignmentsAfterNotificationSignal(session: AuthSession): Promise<void> {
    if (assignmentRefreshInFlight) {
        return;
    }

    assignmentRefreshInFlight = true;
    try {
        try {
            await usePlacesStore.getState().loadPlaces(session);
        } catch (error) {
            log.error(`loadPlaces after notification signal failed: ${String(error)}`);
        }
        try {
            await usePlacesStore.getState().loadDashboardSummary(session);
        } catch (error) {
            log.error(`loadDashboardSummary after notification signal failed: ${String(error)}`);
        }
        try {
            await usePlayspaceAuditStore.getState().refreshCachedAuditSessions(session);
        } catch (error) {
            log.error(`refreshCachedAuditSessions after notification signal failed: ${String(error)}`);
        }
    } finally {
        assignmentRefreshInFlight = false;
    }
}

/**
 * In-app notification list and badge state, with optimistic read updates.
 */
interface NotificationsState {
    readonly notifications: Notification[];
    readonly unreadCount: number;
    readonly isLoading: boolean;
    readonly error: string | null;
    /** Whether the notifications sheet is presented. */
    readonly panelOpen: boolean;

    fetchNotifications: () => Promise<void>;
    refreshUnreadCount: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearError: () => void;
    openNotificationsPanel: () => void;
    closeNotificationsPanel: () => void;
}

function errorMessageFromUnknown(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    panelOpen: false,

    openNotificationsPanel: () => {
        set({ panelOpen: true });
    },

    closeNotificationsPanel: () => {
        set({ panelOpen: false });
    },

    fetchNotifications: async () => {
        set({ isLoading: true, error: null });
        const session = useAuthStore.getState().session;
        if (session === null) {
            set({
                error: "Not signed in",
                isLoading: false,
            });
            return;
        }

        try {
            const cachedNotifications = await loadNotificationsCache();
            if (cachedNotifications.length > 0) {
                const cachedUnreadCount = cachedNotifications.filter((n) => !n.is_read).length;
                set({
                    notifications: cachedNotifications,
                    unreadCount: cachedUnreadCount,
                    isLoading: true,
                });
            }

            const beforeNetworkUnread = get().unreadCount;
            const notifications = await getNotifications(session, 50, 0, false);
            const unreadCount = notifications.filter((n) => !n.is_read).length;
            await saveNotificationsCache(notifications);
            set({
                notifications,
                unreadCount,
                isLoading: false,
            });
            if (unreadCount > beforeNetworkUnread) {
                await refreshAssignmentsAfterNotificationSignal(session);
            }
        } catch (error: unknown) {
            log.error(`Failed to fetch notifications: ${error}`);
            const { notifications } = get();
            if (notifications.length > 0) {
                set({ isLoading: false });
            } else {
                set({
                    error: errorMessageFromUnknown(error, "Failed to fetch notifications"),
                    isLoading: false,
                });
            }
        }
    },

    refreshUnreadCount: async () => {
        const session = useAuthStore.getState().session;
        if (session === null) {
            return;
        }

        const previousCount = get().unreadCount;

        try {
            const count = await getUnreadCount(session);
            set({ unreadCount: count });
            if (count > previousCount) {
                await refreshAssignmentsAfterNotificationSignal(session);
            }
        } catch (error: unknown) {
            log.error(`Failed to refresh unread count: ${error}`);
        }
    },

    markAsRead: async (notificationId: string) => {
        const session = useAuthStore.getState().session;
        if (session === null) {
            set({ error: "Not signed in" });
            return;
        }

        const { notifications } = get();
        const notification = notifications.find((n) => n.id === notificationId);
        if (notification === undefined || notification.is_read) {
            return;
        }

        const optimisticNotifications = notifications.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n,
        );
        const optimisticUnreadCount = optimisticNotifications.filter((n) => !n.is_read).length;

        set({
            notifications: optimisticNotifications,
            unreadCount: optimisticUnreadCount,
        });

        try {
            await markNotificationAsRead(session, notificationId);
        } catch (error: unknown) {
            log.error(`Failed to mark notification as read: ${error}`);
            set({
                notifications,
                unreadCount: notifications.filter((n) => !n.is_read).length,
                error: "Failed to mark notification as read",
            });
        }
    },

    markAllAsRead: async () => {
        const session = useAuthStore.getState().session;
        if (session === null) {
            set({ error: "Not signed in" });
            return;
        }

        const { notifications } = get();
        const optimisticNotifications = notifications.map((n) => ({ ...n, is_read: true }));

        set({
            notifications: optimisticNotifications,
            unreadCount: 0,
        });

        try {
            const count = await markAllNotificationsAsRead(session);
            log.info(`Marked ${String(count)} notifications as read`);
        } catch (error: unknown) {
            log.error(`Failed to mark all notifications as read: ${error}`);
            set({
                notifications,
                unreadCount: notifications.filter((n) => !n.is_read).length,
                error: "Failed to mark all notifications as read",
            });
        }
    },

    clearError: () => {
        set({ error: null });
    },
}));
