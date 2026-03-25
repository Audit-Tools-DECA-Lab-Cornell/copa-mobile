import type { AuthSession } from "lib/auth/types";
import { parsePayload, requestJson } from "lib/audit/api";
import { auditScoreTotalsSchema, createPaginatedResponseSchema } from "lib/audit/types";
import type { PaginatedResponse } from "lib/audit/types";
import { z } from "zod";
import { t } from "i18next";

/**
 * Audit lifecycle statuses returned by the backend.
 */
const auditStatusSchema = z.enum(["IN_PROGRESS", "PAUSED", "SUBMITTED"]);

/**
 * Zod schema for the auditor place response returned by
 * `GET /playspace/auditor/me/places`.
 */
const auditorPlaceSchema = z.object({
    place_id: z.uuid(),
    place_name: z.string(),
    place_type: z.string().nullable(),
    project_id: z.uuid(),
    project_name: z.string(),
    city: z.string().nullable(),
    province: z.string().nullable(),
    country: z.string().nullable(),
    audit_status: auditStatusSchema.nullable(),
    audit_id: z.uuid().nullable(),
    started_at: z.string().nullable(),
    submitted_at: z.string().nullable(),
    summary_score: z.number().nullable(),
    score_totals: auditScoreTotalsSchema.nullable(),
    progress_percent: z.number().nullable(),
});

/**
 * Typed representation of a place assigned to the current auditor,
 * including audit progress metadata.
 */
export type AuditorPlace = z.infer<typeof auditorPlaceSchema>;

/**
 * Typed paginated response returned for the current auditor's places list.
 */
export type AuditorPlacesResponse = PaginatedResponse<AuditorPlace>;

/**
 * Schema for the top-level paginated response object.
 */
const auditorPlacesResponseSchema = createPaginatedResponseSchema(auditorPlaceSchema);

/**
 * Fetch all places assigned to the currently authenticated auditor.
 *
 * @param session Authenticated mobile session.
 * @returns Validated paginated response of assigned auditor places.
 * @throws {PlayspaceAuditApiError} On network, auth, or validation failures.
 */
export async function fetchAssignedPlaces(session: AuthSession): Promise<AuditorPlacesResponse> {
    const payload = await requestJson(session, "/playspace/auditor/me/places", {
        method: "GET",
    });
    return parsePayload<AuditorPlacesResponse>(
        payload,
        auditorPlacesResponseSchema,
        t("assignedPlacesResponseShapeIsInvalid", "Assigned places response shape is invalid."),
    );
}
