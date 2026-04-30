import type { AuditorPlace } from "lib/audit/places-api";
import type { LocalizedPlaceStatus } from "lib/i18n/format";

/** Axis statuses that represent terminal (completed) work on a place. */
const axisTerminal = (value: string): boolean => value === "submitted" || value === "complete";

/**
 * Resolve a single axis status into a display-ready LocalizedPlaceStatus.
 *
 * Place-wide axis statuses aggregate contributions from all auditors, so the
 * resolved value is capped against the current auditor's own session timestamps.
 * This prevents another auditor's terminal submission from being surfaced as
 * the current auditor's personal completion.
 *
 * @param axisStatus Raw axis status from the place summary payload.
 * @param hasStarted Whether the current auditor has an active session (started_at ≠ null).
 * @param hasSubmitted Whether the current auditor has submitted their session.
 * @returns Display-ready status bounded by the current auditor's session state.
 */
function resolveAxisStatus(
    axisStatus: "not_started" | "in_progress" | "submitted" | "complete",
    hasStarted: boolean,
    hasSubmitted: boolean,
): LocalizedPlaceStatus {
    if (axisTerminal(axisStatus)) {
        if (hasSubmitted) {
            return "submitted";
        }
        // Terminal place-wide status but this auditor has not submitted —
        // likely driven by a different auditor's submission.
        return hasStarted ? "in_progress" : "not_started";
    }
    if (axisStatus === "in_progress") {
        // Only surface in_progress if this auditor has at least started a session.
        return hasStarted ? "in_progress" : "not_started";
    }
    return "not_started";
}

/**
 * Derive the UI status for a place card scoped to the current auditor's
 * selected execution mode and their own session state.
 *
 * - `"audit"` mode  → only the audit axis is considered.
 * - `"survey"` mode → only the survey axis is considered.
 * - `"both"` or `null` → both axes must reach terminal status.
 *
 * Each axis result is capped by the current auditor's session timestamps
 * (`started_at` / `submitted_at`) so that a place-wide axis status advanced
 * by any other auditor cannot appear as this auditor's own completion.
 *
 * @param place Place summary from the auditor API including session timestamps.
 * @returns Localized status for the place card UI.
 */
export function derivePlaceRequirementStatus(
    place: Pick<
        AuditorPlace,
        "place_audit_status" | "place_survey_status" | "selected_execution_mode" | "started_at" | "submitted_at"
    >,
): LocalizedPlaceStatus {
    const mode = place.selected_execution_mode;
    const hasStarted = place.started_at !== null;
    const hasSubmitted = place.submitted_at !== null;

    if (mode === "audit") {
        return resolveAxisStatus(place.place_audit_status, hasStarted, hasSubmitted);
    }

    if (mode === "survey") {
        return resolveAxisStatus(place.place_survey_status, hasStarted, hasSubmitted);
    }

    // "both" mode or no mode selected: both axes must reach "submitted" for the
    // place to be considered complete for this auditor.
    const resolvedAuditStatus = resolveAxisStatus(place.place_audit_status, hasStarted, hasSubmitted);
    const resolvedSurveyStatus = resolveAxisStatus(place.place_survey_status, hasStarted, hasSubmitted);

    if (resolvedAuditStatus === "submitted" && resolvedSurveyStatus === "submitted") {
        return "submitted";
    }
    if (resolvedAuditStatus === "in_progress" || resolvedSurveyStatus === "in_progress") {
        return "in_progress";
    }
    return "not_started";
}

/**
 * Build a readable locality label from place location fields.
 *
 * @param place Place summary fields from the auditor API.
 * @param fallbackLabel Label shown when no locality fields are available.
 * @returns Comma-separated locality string.
 */
export function deriveLocality(
    place: Pick<AuditorPlace, "city" | "province" | "country">,
    fallbackLabel: string,
): string {
    const parts = [place.city, place.province, place.country].filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
    );
    return parts.length > 0 ? parts.join(", ") : fallbackLabel;
}

/**
 * Resolve the latest known audit activity timestamp for a place.
 *
 * @param place Place summary from the auditor API.
 * @returns Unix timestamp in milliseconds or zero when unavailable.
 */
export function getPlaceLastActivityTimestamp(place: Pick<AuditorPlace, "started_at" | "submitted_at">): number {
    const timestamp = place.submitted_at ?? place.started_at;
    if (timestamp === null) {
        return 0;
    }

    const parsedTimestamp = Date.parse(timestamp);
    return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp;
}

/**
 * Match a place against a simple free-text query.
 *
 * @param place Place summary from the auditor API.
 * @param query Raw search query from the UI.
 * @returns True when any searchable place field includes the query.
 */
export function matchesPlaceSearch(place: AuditorPlace, query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
        return true;
    }

    const searchFields = [
        place.place_name,
        place.project_name,
        place.place_type,
        place.postal_code,
        place.address,
        place.city,
        place.province,
        place.country,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    return searchFields.join(" ").toLowerCase().includes(normalizedQuery);
}
