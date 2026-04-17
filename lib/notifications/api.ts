/**
 * Authenticated Playspace API helpers for in-app notifications.
 *
 * Paths align with ``notifications_router`` mounted at ``/playspace`` in the backend.
 */

import { parsePayload, requestJson } from "lib/audit/api";
import type { AuthSession } from "lib/auth/types";
import { z } from "zod";

/**
 * One notification row returned by ``GET /playspace/api/notifications``.
 */
export const notificationSchema = z.object({
    id: z.string().uuid(),
    message: z.string(),
    notification_type: z.enum(["ASSIGNMENT_CREATED", "ASSIGNMENT_UPDATED", "AUDIT_COMPLETED"]),
    is_read: z.boolean(),
    related_entity_type: z.string().nullable(),
    related_entity_id: z.string().uuid().nullable(),
    created_at: z.string(),
});

export type Notification = z.infer<typeof notificationSchema>;

const notificationsListSchema = z.array(notificationSchema);

const unreadCountResponseSchema = z.object({
    count: z.number(),
});

const markReadResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

const markAllReadResponseSchema = z.object({
    success: z.boolean(),
    count: z.number(),
    message: z.string(),
});

/**
 * List notifications for the signed-in user (newest first).
 *
 * @param session Authenticated session (Playspace bearer token).
 * @param limit Page size (server clamps to 1–100).
 * @param offset Pagination offset.
 * @param unreadOnly When true, only unread rows are returned.
 */
export async function getNotifications(
    session: AuthSession,
    limit = 50,
    offset = 0,
    unreadOnly = false,
): Promise<Notification[]> {
    const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        unread_only: String(unreadOnly),
    });
    const payload = await requestJson(session, `/playspace/api/notifications?${params}`, {
        method: "GET",
    });
    return parsePayload(payload, notificationsListSchema, "Notifications list response shape is invalid.");
}

/**
 * Return the unread notification count for the signed-in user.
 */
export async function getUnreadCount(session: AuthSession): Promise<number> {
    const payload = await requestJson(session, "/playspace/api/notifications/unread/count", {
        method: "GET",
    });
    const validated = parsePayload(payload, unreadCountResponseSchema, "Unread count response shape is invalid.");
    return validated.count;
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(session: AuthSession, notificationId: string): Promise<void> {
    const payload = await requestJson(
        session,
        `/playspace/api/notifications/${encodeURIComponent(notificationId)}/read`,
        {
            method: "POST",
            body: JSON.stringify({}),
        },
    );
    parsePayload(payload, markReadResponseSchema, "Mark notification read response shape is invalid.");
}

/**
 * Mark all notifications as read for the signed-in user.
 *
 * @returns Number of rows updated on the server.
 */
export async function markAllNotificationsAsRead(session: AuthSession): Promise<number> {
    const payload = await requestJson(session, "/playspace/api/notifications/read-all", {
        method: "POST",
        body: JSON.stringify({}),
    });
    const validated = parsePayload(
        payload,
        markAllReadResponseSchema,
        "Mark all notifications read response shape is invalid.",
    );
    return validated.count;
}
