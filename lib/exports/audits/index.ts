import type { PlayspaceInstrument } from "lib/audit/types";

import { stringifyCell } from "lib/exports/reports/format-utils";

import { buildInProgressAuditResponseRows, buildInProgressAuditWorkbook } from "./row-builders";
import { shareInProgressAuditCsv, shareInProgressAuditPdf, shareInProgressAuditXlsx } from "./share";
import {
    IN_PROGRESS_PREVIEW_COLUMN_INDEXES,
    IN_PROGRESS_RESPONSE_HEADERS,
    type InProgressAuditExportFormat,
    type InProgressAuditExportPreview,
    type InProgressExportableAudit,
} from "./types";

export type { InProgressAuditExportFormat, InProgressAuditExportPreview, InProgressExportableAudit } from "./types";

export { buildInProgressExportableAudit } from "./helpers";

/**
 * Build a small workbook-style preview table for one in-progress audit.
 *
 * Useful for showing a glimpse of what will be exported before the share sheet
 * opens.  Only rows that already have an answer recorded are surfaced.
 */
export function buildInProgressAuditPreview(
    exportableAudit: InProgressExportableAudit,
    instrument: PlayspaceInstrument,
    limit = 5,
): InProgressAuditExportPreview {
    const headerRow = IN_PROGRESS_PREVIEW_COLUMN_INDEXES.map(
        (columnIndex) => IN_PROGRESS_RESPONSE_HEADERS[columnIndex],
    );
    const detailRows = buildInProgressAuditResponseRows(exportableAudit, instrument)
        .filter((row) => {
            const idCell = row[0];
            const modeCell = row[1];
            return (
                typeof idCell === "string" &&
                idCell.trim().length > 0 &&
                !/^\d+$/u.test(idCell) &&
                typeof modeCell === "string" &&
                modeCell.trim().length > 0
            );
        })
        .slice(0, limit)
        .map((row) => IN_PROGRESS_PREVIEW_COLUMN_INDEXES.map((columnIndex) => row[columnIndex] ?? ""));

    return {
        auditCode: exportableAudit.auditSession.audit_code,
        headers: headerRow.map((cell) => stringifyCell(cell)),
        rows: detailRows.map((row) => row.map((cell) => stringifyCell(cell))),
    };
}

/** Generate and share one in-progress audit export file. */
export async function shareInProgressAuditExport(
    exportableAudit: InProgressExportableAudit,
    instrument: PlayspaceInstrument,
    format: InProgressAuditExportFormat,
): Promise<string> {
    const workbook = buildInProgressAuditWorkbook(exportableAudit, instrument);

    if (format === "pdf") {
        return await shareInProgressAuditPdf(exportableAudit, instrument, workbook);
    }
    if (format === "csv") {
        return await shareInProgressAuditCsv(workbook);
    }
    if (format === "xlsx") {
        return await shareInProgressAuditXlsx(workbook);
    }

    throw new Error("Unsupported export format.");
}
