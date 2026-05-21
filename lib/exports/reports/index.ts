import type { DesignSystemTheme } from "lib/design-system";
import type { PlayspaceInstrument } from "lib/audit/types";

import { shareCsvWorkbook, shareSingleAuditPdf, shareWorkbookPdf, shareXlsxWorkbook } from "./share";
import { buildBulkAuditWorkbook, buildSingleAuditResponseRows, buildSingleAuditWorkbook } from "./row-builders";
import {
    PREVIEW_RESPONSE_COLUMN_INDEXES,
    SINGLE_RESPONSE_HEADERS,
    type AuditExportFormat,
    type AuditExportPreview,
    type ExportAuditorProfile,
    type ExportableAudit,
} from "./types";
import { stringifyCell } from "./format-utils";

export type {
    AuditExportContext,
    AuditExportFormat,
    AuditExportPreview,
    ExportAuditorProfile,
    ExportableAudit,
    SpreadsheetCell,
    SpreadsheetRow,
    WorkbookPayload,
    WorkbookTable,
} from "./types";

export { MOBILE_EXPORT_PALETTE, SINGLE_RESPONSE_HEADERS, WEB_AUDIT_EXPORT_PALETTE } from "./types";

/**
 * Build a small workbook-like preview table for one submitted audit.
 *
 * The preview now reads from the same web-aligned response rows used by the
 * XLSX/PDF exports, so the Reports screen does not drift from downloaded files.
 */
export function buildAuditExportPreview(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
    limit = 5,
): AuditExportPreview {
    const headerRow = PREVIEW_RESPONSE_COLUMN_INDEXES.map((columnIndex) => SINGLE_RESPONSE_HEADERS[columnIndex]);
    const detailRows = buildSingleAuditResponseRows(exportableAudit, instrument)
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
        .map((row) => PREVIEW_RESPONSE_COLUMN_INDEXES.map((columnIndex) => row[columnIndex] ?? ""));

    return {
        auditCode: exportableAudit.auditSession.audit_code,
        headers: headerRow.map((cell) => stringifyCell(cell)),
        rows: detailRows.map((row) => row.map((cell) => stringifyCell(cell))),
    };
}

/** Generate and share one audit export file. */
export async function shareSingleAuditExport(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
    format: AuditExportFormat,
    colors: DesignSystemTheme["colors"],
): Promise<string> {
    validateExportableAudit(exportableAudit);

    if (format === "pdf") {
        return await shareSingleAuditPdf(exportableAudit, instrument, colors);
    }

    const workbook = buildSingleAuditWorkbook(exportableAudit, instrument);
    if (format === "csv") {
        return await shareCsvWorkbook(workbook);
    }
    if (format === "xlsx") {
        return await shareXlsxWorkbook(workbook, colors);
    }

    throw new Error("Unsupported export format.");
}

/** Generate and share a bulk export across multiple submitted audits. */
export async function shareBulkAuditExport(
    exportableAudits: readonly ExportableAudit[],
    auditorProfile: ExportAuditorProfile | null,
    instrument: PlayspaceInstrument,
    format: AuditExportFormat,
    colors: DesignSystemTheme["colors"],
): Promise<string> {
    if (exportableAudits.length === 0) {
        throw new Error("At least one submitted audit is required for bulk export.");
    }

    for (const exportableAudit of exportableAudits) {
        validateExportableAudit(exportableAudit);
    }

    const workbook = buildBulkAuditWorkbook(exportableAudits, instrument, auditorProfile ?? null);
    if (format === "csv") {
        return await shareCsvWorkbook(workbook);
    }
    if (format === "pdf") {
        return await shareWorkbookPdf(workbook, colors);
    }
    if (format === "xlsx") {
        return await shareXlsxWorkbook(workbook, colors);
    }

    throw new Error("Unsupported export format.");
}

/** Ensure the export pipeline only handles complete submitted audits. */
function validateExportableAudit(exportableAudit: ExportableAudit): void {
    if (exportableAudit.auditSession.status !== "SUBMITTED") {
        throw new Error("Only submitted audits can be exported from the reports screen.");
    }
}
