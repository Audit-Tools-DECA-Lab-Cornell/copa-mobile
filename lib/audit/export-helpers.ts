import { fetchAuditSession } from "lib/audit/api";
import { fetchMyAuditorProfile, type MyAuditorProfile } from "lib/audit/profile-api";
import type { ExportAuditorProfile, ExportableAudit } from "lib/audit/export";
import type { AuditorPlace } from "lib/audit/places-api";
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
 * Build the export payload for one place row using cached audit state when possible.
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

    const auditSession =
        cachedAudit?.status === "SUBMITTED"
            ? cachedAudit
            : await fetchAuditSession(session, place.audit_id);

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
