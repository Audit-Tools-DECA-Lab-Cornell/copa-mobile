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

/**
 * File a new bug report from the mobile app. Online-only: the caller must
 * confirm connectivity before invoking this.
 */
export async function createBugReport(session: AuthSession, payload: BugReportCreateRequest): Promise<BugReport> {
    const parsed = bugReportCreateRequestSchema.parse(payload);
    const response = await requestJson(session, "/playspace/bug-reports", {
        method: "POST",
        body: JSON.stringify(parsed),
    });
    return bugReportSchema.parse(response);
}

/**
 * Return published known issues matching the reporter's query (deflection).
 */
export async function matchKnownIssues(session: AuthSession, query: string): Promise<KnownIssueMatch[]> {
    const params = new URLSearchParams({ q: query, surface: "mobile" });
    const response = await requestJson(session, `/playspace/known-issues/match?${params.toString()}`, {
        method: "GET",
    });
    return z.array(knownIssueMatchSchema).parse(response);
}
