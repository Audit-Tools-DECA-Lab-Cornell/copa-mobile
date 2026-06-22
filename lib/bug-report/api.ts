import { requestJson } from "lib/audit/api";
import type { AuthSession } from "lib/auth/types";
import { z } from "zod";

import {
    type BugReport,
    bugReportCreateRequestSchema,
    bugReportSchema,
    type BugReportCreateRequest,
    type KnownIssueMatch,
    knownIssueMatchSchema,
} from "lib/bug-report/types";

/** Per-call options forwarded to the underlying `requestJson` transport. */
export interface BugReportApiOptions {
    /** Override the request timeout. Defaults to `DEFAULT_REQUEST_TIMEOUT_MS`. */
    timeoutMs?: number;
}

/**
 * File a new bug report from the mobile app. Online-only: the caller must
 * confirm connectivity before invoking this.
 */
export async function createBugReport(
    session: AuthSession,
    payload: BugReportCreateRequest,
    options?: BugReportApiOptions,
): Promise<BugReport> {
    const parsed = bugReportCreateRequestSchema.parse(payload);
    const response = await requestJson(
        session,
        "/playspace/bug-reports",
        {
            method: "POST",
            body: JSON.stringify(parsed),
        },
        options?.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : undefined,
    );
    return bugReportSchema.parse(response);
}

/**
 * Return published known issues matching the reporter's query (deflection).
 */
export async function matchKnownIssues(
    session: AuthSession,
    query: string,
    options?: BugReportApiOptions,
): Promise<KnownIssueMatch[]> {
    const params = new URLSearchParams({ q: query, surface: "mobile" });
    const response = await requestJson(
        session,
        `/playspace/known-issues/match?${params.toString()}`,
        {
            method: "GET",
        },
        options?.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : undefined,
    );
    return z.array(knownIssueMatchSchema).parse(response);
}
