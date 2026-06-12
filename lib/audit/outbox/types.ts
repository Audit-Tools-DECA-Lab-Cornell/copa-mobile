import { z } from "zod";

/**
 * Durable, append-only record that an audit must be submitted to the server.
 *
 * The outbox is the delivery source of truth for submissions, decoupled from
 * the editing store: it is keyed independently of `audit.state.v4.<user>`, so
 * it survives sign-out, a persisted-schema migration that resets the editing
 * snapshot, and conflict recovery. One op per audit (the op id is the audit
 * id), so enqueuing is naturally idempotent and there is never a duplicate
 * pending submit for the same audit.
 */
export const submitOutboxOpSchema = z.object({
    audit_id: z.string().min(1),
    created_at: z.string().min(1),
    attempts: z.number().int().nonnegative(),
    last_attempt_at: z.string().min(1).nullable(),
    last_error: z.string().nullable(),
});

export type SubmitOutboxOp = z.infer<typeof submitOutboxOpSchema>;

/**
 * Minimal key-value surface the outbox needs from its backing store.
 *
 * Structurally satisfied by the shared MMKV instance. Each op is stored under
 * its own key so a single unreadable op cannot discard the rest of the queue.
 */
export interface OutboxKeyValueStorage {
    getString(key: string): string | undefined;
    set(key: string, value: string): void;
    remove(key: string): void;
    getAllKeys(): string[];
}

/**
 * Tunables for retry backoff between automatic drain attempts.
 */
export interface OutboxBackoffConfig {
    readonly baseDelayMs: number;
    readonly capDelayMs: number;
}

export const DEFAULT_OUTBOX_BACKOFF: OutboxBackoffConfig = {
    baseDelayMs: 5_000,
    capDelayMs: 5 * 60_000,
};
