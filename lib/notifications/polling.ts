/**
 * Base interval for polling the unread notification count.
 * Jitter is applied so staggered clients do not synchronize requests.
 */
export const NOTIFICATION_POLL_BASE_INTERVAL_MS = 30000;

/**
 * Maximum jitter added to the base interval (milliseconds).
 */
export const NOTIFICATION_POLL_JITTER_MAX_MS = 5000;

/**
 * Computes the next poll interval with a pseudo-random jitter in [0, {@link NOTIFICATION_POLL_JITTER_MAX_MS}).
 */
export function computeNotificationPollIntervalMs(): number {
    return NOTIFICATION_POLL_BASE_INTERVAL_MS + Math.random() * NOTIFICATION_POLL_JITTER_MAX_MS;
}
