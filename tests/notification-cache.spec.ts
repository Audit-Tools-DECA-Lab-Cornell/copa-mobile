import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Notification } from "lib/notifications/api";
import {
    clearNotificationsCache,
    loadNotificationsCache,
    saveNotificationsCache,
} from "lib/storage/notification-cache";

/**
 * Avoid loading `react-native` via `lib/api-base-url` when the real notification-cache module loads.
 * Vitest hoists `vi.mock` above these imports at runtime.
 */
vi.mock("lib/api-base-url", () => ({
    getApiBaseUrl: () => "http://127.0.0.1:8000",
}));

const { mmkvStorageMock, resetStorage } = vi.hoisted(() => {
    const storage = new Map<string, string>();
    return {
        mmkvStorageMock: {
            set: vi.fn((key: string, value: string) => {
                storage.set(key, value);
            }),
            getString: vi.fn((key: string) => {
                return storage.get(key);
            }),
            remove: vi.fn((key: string) => {
                storage.delete(key);
            }),
        },
        resetStorage: (): void => {
            storage.clear();
        },
    };
});

vi.mock("lib/storage/mmkv", () => ({
    mmkvStorage: mmkvStorageMock,
}));

/**
 * Valid notification row for Zod round-trip through the cache.
 */
function sampleNotification(): Notification {
    return {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        message: "Cached message",
        notification_type: "ASSIGNMENT_CREATED",
        is_read: false,
        related_entity_type: "assignment",
        related_entity_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        created_at: "2024-01-01T00:00:00.000Z",
    };
}

describe("notification-cache (TASK-009)", () => {
    beforeEach(() => {
        resetStorage();
        vi.clearAllMocks();
    });

    it("round-trips notifications through MMKV JSON", async () => {
        const list = [sampleNotification()];
        await saveNotificationsCache(list);
        const loaded = await loadNotificationsCache();
        expect(loaded).toHaveLength(1);
        expect(loaded[0]?.id).toBe(list[0]?.id);
    });

    it("returns an empty list when the cache is missing", async () => {
        const loaded = await loadNotificationsCache();
        expect(loaded).toHaveLength(0);
    });

    it("clearNotificationsCache removes persisted data", async () => {
        await saveNotificationsCache([sampleNotification()]);
        await clearNotificationsCache();
        const loaded = await loadNotificationsCache();
        expect(loaded).toHaveLength(0);
        expect(mmkvStorageMock.remove).toHaveBeenCalled();
    });
});
