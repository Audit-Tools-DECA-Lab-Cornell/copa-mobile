import { notificationSchema, type Notification } from "lib/notifications/api";
import { mmkvStorage } from "lib/storage/mmkv";
import { z } from "zod";
import { createModuleLogger } from "lib/logger";

const log = createModuleLogger("notification-cache");

/**
 * MMKV key for the serialized notifications list (same role as AsyncStorage in the spec).
 */
const CACHE_KEY = "notifications_cache";

const notificationsCacheSchema = z.array(notificationSchema);

/**
 * Persist the latest notifications snapshot for offline display.
 */
export async function saveNotificationsCache(notifications: Notification[]): Promise<void> {
    try {
        mmkvStorage.set(CACHE_KEY, JSON.stringify(notifications));
        log.info(`Cached ${String(notifications.length)} notifications`);
    } catch (error: unknown) {
        log.error(`Failed to save notifications cache: ${error}`);
    }
}

/**
 * Restore notifications from disk. Returns an empty list when missing or invalid.
 */
export async function loadNotificationsCache(): Promise<Notification[]> {
    try {
        const jsonData = mmkvStorage.getString(CACHE_KEY);
        if (jsonData === undefined || jsonData.length === 0) {
            return [];
        }

        const parsed: unknown = JSON.parse(jsonData);
        const decoded = notificationsCacheSchema.safeParse(parsed);
        if (!decoded.success) {
            log.error(`Failed to parse notifications cache: ${decoded.error}`);
            return [];
        }

        log.info(`Loaded ${String(decoded.data.length)} notifications from cache`);
        return decoded.data;
    } catch (error: unknown) {
        log.error(`Failed to load notifications cache: ${error}`);
        return [];
    }
}

/**
 * Remove cached notifications (e.g. on logout).
 */
export async function clearNotificationsCache(): Promise<void> {
    try {
        mmkvStorage.remove(CACHE_KEY);
        log.info("Notifications cache cleared");
    } catch (error: unknown) {
        log.error(`Failed to clear notifications cache: ${error}`);
    }
}
