import type { AuditorPlace } from "lib/audit/places-api";
import type { AuditSession } from "lib/audit/types";
import type { ExportAuditorProfile } from "lib/exports/reports/types";

import type { InProgressExportableAudit } from "./types";

interface BuildInProgressExportableAuditParams {
    readonly auditSession: AuditSession;
    readonly place: AuditorPlace | null;
    readonly auditorProfile: ExportAuditorProfile | null;
}

/**
 * Build the export payload for an in-progress audit from on-device data only.
 *
 * The caller passes the `AuditSession` it already pulled from the audit store
 * (`sessionsByPairKey[pairKey]`), which is the same source the section UI
 * reads from. Local-only edits made via `applyLocalQuestionAnswer` are written
 * back into that session before any sync happens, so the exported file always
 * reflects what the auditor currently sees in the app - even when the device
 * is offline or a submit attempt has failed.
 */
export function buildInProgressExportableAudit({
    auditSession,
    place,
    auditorProfile,
}: Readonly<BuildInProgressExportableAuditParams>): InProgressExportableAudit {
    return {
        auditSession,
        context: {
            projectName: auditSession.project_name,
            city: place?.city ?? null,
            province: place?.province ?? null,
            country: place?.country ?? null,
        },
        auditorProfile,
    };
}
