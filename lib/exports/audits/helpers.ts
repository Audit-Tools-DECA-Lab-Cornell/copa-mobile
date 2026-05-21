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
 * Build the export payload for an in-progress audit using on-device data only.
 *
 * Unlike the submitted-audit export, this never reaches the network: the whole
 * point is to let the auditor save a copy when the submit step is failing.
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
