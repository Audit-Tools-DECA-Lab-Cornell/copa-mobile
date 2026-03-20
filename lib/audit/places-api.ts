import type { AuthSession } from "lib/auth/types";
import { parsePayload, requestJson } from "lib/audit/api";
import { auditScoreTotalsSchema } from "lib/audit/types";
import { z } from "zod";

/**
 * Assignment roles an auditor can hold for a place.
 */
const assignmentRoleSchema = z.enum(["auditor", "place_admin"]);

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
    assignment_roles: z.array(assignmentRoleSchema),
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
 * Schema for the top-level response array.
 */
const auditorPlacesResponseSchema = z.array(auditorPlaceSchema);

/**
 * Fetch all places assigned to the currently authenticated auditor.
 *
 * @param session Authenticated mobile session.
 * @returns Validated array of assigned auditor places.
 * @throws {PlayspaceAuditApiError} On network, auth, or validation failures.
 */
export async function fetchAssignedPlaces(session: AuthSession): Promise<AuditorPlace[]> {
    const payload = await requestJson(session, "/playspace/auditor/me/places", {
        method: "GET",
    });
    return parsePayload(
        payload,
        auditorPlacesResponseSchema,
        "Assigned places response shape is invalid.",
    );
}
