import type { AuthSession } from "lib/auth/types";
import { t } from "i18next";
import { parsePayload, requestJson } from "lib/audit/api";
import {
    auditScoreTotalsSchema,
    auditStatusSchema,
    createPaginatedResponseSchema,
    executionModeSchema,
} from "lib/audit/types";
import { z } from "zod";

import { type PaginatedResponse, playspaceTypeSchema } from "lib/audit/types";

const placeAxisStatusSchema = z.enum(["not_started", "in_progress", "submitted", "complete"]);
const scorePairSchema = z.object({
    pv: z.number(),
    u: z.number(),
});

/**
 * Accept coordinates when present while remaining backward compatible with
 * older payloads until the mobile client and backend ship together.
 */
const nullableCoordinateSchema = z
    .number()
    .nullable()
    .optional()
    .transform((value): number | null => value ?? null);

/**
 * Zod schema for the auditor place response returned by
 * `GET /playspace/auditor/me/places`.
 */
const auditorPlaceSchema = z.object({
    place_id: z.uuid(),
    place_name: z.string(),
    place_type: playspaceTypeSchema.nullable(),
    project_id: z.uuid(),
    project_name: z.string(),
    address: z.string().nullable(),
    postal_code: z.string().nullable(),
    city: z.string().nullable(),
    province: z.string().nullable(),
    country: z.string().nullable(),
    lat: nullableCoordinateSchema,
    lng: nullableCoordinateSchema,
    status: auditStatusSchema.nullable(),
    audit_id: z.uuid().nullable(),
    started_at: z.string().nullable(),
    submitted_at: z.string().nullable(),
    due_date: z.iso.datetime().nullable().optional().default(null),
    summary_score: z.number().nullable(),
    score_totals: auditScoreTotalsSchema.nullable(),
    progress_percent: z.number().nullable(),
    selected_execution_mode: executionModeSchema.nullable().default(null),
    place_audit_status: placeAxisStatusSchema.optional().default("not_started"),
    place_survey_status: placeAxisStatusSchema.optional().default("not_started"),
    audit_scores: scorePairSchema.nullable().optional().default(null),
    survey_scores: scorePairSchema.nullable().optional().default(null),
    overall_scores: scorePairSchema.nullable().optional().default(null),
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
 * Maximum number of places the backend allows per page.
 * Matches the `le=100` constraint on the backend Query parameter.
 */
const PLACES_MAX_PAGE_SIZE = 100;

/**
 * Fetch one page of places assigned to the currently authenticated auditor.
 *
 * @param session Authenticated mobile session.
 * @param page 1-based page number to request.
 * @param pageSize Number of items per page (capped at 100 by the backend).
 * @returns Validated paginated response for the requested page.
 * @throws {PlayspaceAuditApiError} On network, auth, or validation failures.
 */
export async function fetchAssignedPlacesPage(
    session: AuthSession,
    page: number,
    pageSize: number,
): Promise<AuditorPlacesResponse> {
    const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
    });
    const payload = await requestJson(session, `/playspace/auditor/me/places?${params.toString()}`, {
        method: "GET",
    });
    return parsePayload<AuditorPlacesResponse>(
        payload,
        auditorPlacesResponseSchema,
        t("assignedPlacesResponseShapeIsInvalid", "Assigned places response shape is invalid."),
    );
}

/**
 * Fetch ALL places assigned to the currently authenticated auditor by
 * exhausting all available pages and merging results into a single flat list.
 *
 * The backend caps `page_size` at 100. When the auditor has more than 100
 * places we fan out concurrent requests for the remaining pages so the round
 * trip count is kept to a minimum (1 + ceil((total_pages - 1) / batch) calls).
 *
 * @param session Authenticated mobile session.
 * @returns Flat array of every assigned auditor place.
 * @throws {PlayspaceAuditApiError} On network, auth, or validation failures.
 */
export async function fetchAllAssignedPlaces(session: AuthSession): Promise<AuditorPlace[]> {
    const firstPage = await fetchAssignedPlacesPage(session, 1, PLACES_MAX_PAGE_SIZE);
    const allItems: AuditorPlace[] = [...firstPage.items];

    if (firstPage.total_pages <= 1) {
        return allItems;
    }

    const remainingPageNumbers = Array.from({ length: firstPage.total_pages - 1 }, (_, index) => index + 2);

    const remainingPages = await Promise.all(
        remainingPageNumbers.map((pageNumber) => fetchAssignedPlacesPage(session, pageNumber, PLACES_MAX_PAGE_SIZE)),
    );

    for (const page of remainingPages) {
        allItems.push(...page.items);
    }

    return allItems;
}
