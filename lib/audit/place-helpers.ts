import type { AuditorPlace } from "lib/audit/places-api";
import type { LocalizedPlaceStatus } from "lib/i18n/format";

const axisTerminal = (value: string): boolean => value === "submitted" || value === "complete";

/**
 * Combine audit-axis and survey-axis place status into one UI status
 * (both axes must be terminal for "submitted").
 */
export function derivePlaceRequirementStatus(
    place: Pick<AuditorPlace, "place_audit_status" | "place_survey_status">,
): LocalizedPlaceStatus {
    if (axisTerminal(place.place_audit_status) && axisTerminal(place.place_survey_status)) {
        return "submitted";
    }
    if (place.place_audit_status === "in_progress" || place.place_survey_status === "in_progress") {
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
