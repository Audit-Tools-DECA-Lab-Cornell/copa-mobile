import { fetchAuditSession } from "lib/audit/api";
import type { ExportAuditorProfile, ExportableAudit } from "lib/exports/reports";
import type { AuditorPlace } from "lib/audit/places-api";
import { fetchMyAuditorProfile, type MyAuditorProfile } from "lib/audit/profile-api";
import type { AuditSession } from "lib/audit/types";
import type { AuthSession } from "lib/auth/types";

interface BuildExportableAuditForPlaceParams {
    readonly session: AuthSession | null;
    readonly place: AuditorPlace;
    readonly cachedAudit: AuditSession | undefined;
    readonly exportSessionRequiredMessage: string;
    readonly exportAuditMissingMessage: string;
    readonly auditorProfile?: ExportAuditorProfile | null;
}

/**
 * Convert the backend auditor profile payload into the anonymous export shape.
 *
 * @param profile Raw auditor profile returned by the backend.
 * @returns Export-safe auditor metadata.
 */
function mapAuditorProfileToExportProfile(profile: MyAuditorProfile): ExportAuditorProfile {
    return {
        auditorCode: profile.auditor_code,
        ageRange: profile.age_range,
        gender: profile.gender,
        country: profile.country,
        role: profile.role,
    };
}

/**
 * Best-effort loader for export-safe auditor metadata.
 *
 * Exports should still work offline or when the profile endpoint is unavailable,
 * so failures intentionally fall back to `null` instead of surfacing an error.
 *
 * @param session Authenticated mobile session.
 * @returns Anonymous auditor metadata when available.
 */
export async function loadOptionalExportAuditorProfile(
    session: AuthSession | null,
): Promise<ExportAuditorProfile | null> {
    if (session === null) {
        return null;
    }

    try {
        const profile = await fetchMyAuditorProfile(session);
        return mapAuditorProfileToExportProfile(profile);
    } catch {
        return null;
    }
}

/**
 * Build the export payload for one place row.
 *
 * Always fetches the latest session from the server to guarantee the
 * responses_json snapshot is present and current.  The in-store cached
 * session is used only as an offline fallback when the fetch fails - the
 * store's copy can lag behind the server for audits submitted before the
 * responses_json snapshot was introduced, leading to an empty Responses
 * table in the export.
 *
 * @param params Auth session, place summary, cached audit, and localized error messages.
 * @returns Exportable audit payload for share/export helpers.
 */
export async function buildExportableAuditForPlace({
    session,
    place,
    cachedAudit,
    exportSessionRequiredMessage,
    exportAuditMissingMessage,
    auditorProfile = null,
}: Readonly<BuildExportableAuditForPlaceParams>): Promise<ExportableAudit> {
    if (session === null) {
        throw new Error(exportSessionRequiredMessage);
    }
    if (place.audit_id === null) {
        throw new Error(exportAuditMissingMessage);
    }

    // Prefer a fresh server fetch so that the responses_json snapshot is
    // always included.  Fall back to the cached SUBMITTED session only when
    // the network is unavailable so offline exports still work.
    let auditSession: AuditSession;
    try {
        auditSession = await fetchAuditSession(session, place.audit_id);
    } catch {
        if (cachedAudit?.status === "SUBMITTED") {
            auditSession = cachedAudit;
        } else {
            throw new Error(exportAuditMissingMessage);
        }
    }

    return {
        auditSession,
        context: {
            projectName: auditSession.project_name,
            city: place.city,
            province: place.province,
            country: place.country,
        },
        auditorProfile,
    };
}
