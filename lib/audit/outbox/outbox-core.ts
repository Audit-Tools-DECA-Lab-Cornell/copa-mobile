import { DEFAULT_OUTBOX_BACKOFF, type OutboxBackoffConfig, type SubmitOutboxOp } from "lib/audit/outbox/types";

/**
 * Pure domain logic for the submit outbox. No persistence or React Native
 * imports so it can be exhaustively unit-tested in the node environment; the
 * MMKV-backed storage adapter and the store wiring depend on these helpers.
 */

/**
 * Build a fresh submit op for an audit.
 *
 * @param auditId Audit the auditor committed to submitting.
 * @param nowIso Creation timestamp.
 */
export function createSubmitOp(auditId: string, nowIso: string): SubmitOutboxOp {
    return {
        audit_id: auditId,
        created_at: nowIso,
        attempts: 0,
        last_attempt_at: null,
        last_error: null,
    };
}

/**
 * Return a copy of the op with one more recorded delivery attempt.
 *
 * @param op Op that was just attempted.
 * @param nowIso Attempt timestamp.
 * @param error Human-readable failure, or null on a non-error attempt.
 */
export function registerAttempt(op: SubmitOutboxOp, nowIso: string, error: string | null): SubmitOutboxOp {
    return {
        ...op,
        attempts: op.attempts + 1,
        last_attempt_at: nowIso,
        last_error: error,
    };
}

/**
 * Exponential backoff (capped) for the next automatic retry after `attempts`
 * failures. Attempt 0 has no delay so the first drain fires immediately.
 */
export function retryDelayMs(attempts: number, config: OutboxBackoffConfig = DEFAULT_OUTBOX_BACKOFF): number {
    if (attempts <= 0) {
        return 0;
    }
    const uncapped = config.baseDelayMs * 2 ** (attempts - 1);
    return Math.min(uncapped, config.capDelayMs);
}

/**
 * Whether an op is still inside its backoff window and should be skipped by an
 * automatic drain. A never-attempted op is always eligible.
 */
export function isInBackoff(
    op: SubmitOutboxOp,
    nowIso: string,
    config: OutboxBackoffConfig = DEFAULT_OUTBOX_BACKOFF,
): boolean {
    if (op.last_attempt_at === null || op.attempts <= 0) {
        return false;
    }
    const readyAt = Date.parse(op.last_attempt_at) + retryDelayMs(op.attempts, config);
    return Date.parse(nowIso) < readyAt;
}

/**
 * Select ops eligible to drain now: those not currently in backoff, oldest
 * first so submissions are delivered in the order the auditor made them.
 */
export function selectDrainableOps(
    ops: readonly SubmitOutboxOp[],
    nowIso: string,
    config: OutboxBackoffConfig = DEFAULT_OUTBOX_BACKOFF,
): SubmitOutboxOp[] {
    return ops
        .filter((op) => !isInBackoff(op, nowIso, config))
        .slice()
        .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));
}

/**
 * Classify a drain failure: retryable transient failures keep the op for a
 * later attempt; terminal failures (the audit is not in a submittable state, a
 * bad payload, or a permission problem) drop the op because retrying cannot
 * succeed - the never-arrived detector and in-app surfaces cover the auditor.
 *
 * Defaults to retryable: an unknown error is treated as transient so work is
 * never dropped on a guess.
 */
export function isRetryableSubmitError(error: unknown): boolean {
    // Duck-type the status code (PlayspaceAuditApiError carries `statusCode`)
    // rather than importing the error class, so this stays free of the React
    // Native import chain and unit-testable in node.
    const status = readStatusCode(error);
    if (status === null) {
        return true;
    }
    // 0 = network/unreachable (retry). 5xx = server (retry). 408/429 (retry).
    // 400/403/404/409/422 = terminal for an automatic submit retry.
    if (status === 0 || status === 408 || status === 429) {
        return true;
    }
    return status >= 500;
}

function readStatusCode(error: unknown): number | null {
    if (typeof error !== "object" || error === null) {
        return null;
    }
    const candidate = (error as { statusCode?: unknown }).statusCode;
    return typeof candidate === "number" ? candidate : null;
}
