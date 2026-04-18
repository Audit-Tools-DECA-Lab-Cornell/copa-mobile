import {
    getNotifications,
    getUnreadCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    type Notification,
} from "lib/notifications/api";
import { loadNotificationsCache, saveNotificationsCache } from "lib/storage/notification-cache";
import { create } from "zustand";

import { useAuthStore } from "stores/auth-store";
import { createModuleLogger } from "lib/logger";

const log = createModuleLogger("notifications-store");

/**
 * In-app notification list and badge state, with optimistic read updates.
 */
interface NotificationsState {
    readonly notifications: Notification[];
    readonly unreadCount: number;
    readonly isLoading: boolean;
    readonly error: string | null;
    /** Whether the notifications sheet is presented (TASK-011). */
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

            const notifications = await getNotifications(session, 50, 0, false);
            const unreadCount = notifications.filter((n) => !n.is_read).length;
            await saveNotificationsCache(notifications);
            set({
                notifications,
                unreadCount,
                isLoading: false,
            });
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

        try {
            const count = await getUnreadCount(session);
            set({ unreadCount: count });
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
