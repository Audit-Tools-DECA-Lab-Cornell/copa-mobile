import { t } from "i18next";
import { parsePayload, requestJson } from "lib/audit/api";
import type { AuthSession } from "lib/auth/types";
import { z } from "zod";

/**
 * Zod schema for top-level auditor dashboard metrics.
 */
const auditorDashboardSummarySchema = z.object({
    total_assigned_places: z.number().int().nonnegative(),
    in_progress_audits: z.number().int().nonnegative(),
    submitted_audits: z.number().int().nonnegative(),
    pending_places: z.number().int().nonnegative(),
    average_submitted_score: z.number().nullable(),
});

/**
 * Typed dashboard summary metrics for the mobile home screen.
 */
export type AuditorDashboardSummary = z.infer<typeof auditorDashboardSummarySchema>;

/**
 * Fetch top-level auditor dashboard metrics.
 *
 * @param session Authenticated mobile session.
 * @returns Validated dashboard summary payload.
 */
export async function fetchAuditorDashboardSummary(session: AuthSession): Promise<AuditorDashboardSummary> {
    const payload = await requestJson(session, "/playspace/auditor/me/dashboard-summary", {
        method: "GET",
    });
    return parsePayload(
        payload,
        auditorDashboardSummarySchema,
        t("dashboardSummaryResponseShapeIsInvalid", "Dashboard summary response shape is invalid."),
    );
}
