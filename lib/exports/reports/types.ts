import { SCALE_ACCENT_COLORS, SCALE_SOFT_COLORS } from "lib/audit/scale-colors";
import { SOCIABILITY_EXPORT_HEADERS } from "lib/audit/sociability";
import { GENERATED_EXPORT_DOCUMENT_COLORS } from "lib/design-system.generated";
import type { ScaleKey } from "lib/audit/types";

/** File formats supported by the mobile export flow. */
export type AuditExportFormat = "pdf" | "csv" | "xlsx";

/** Optional place-level context not present on the audit session payload itself. */
export interface AuditExportContext {
    readonly projectName: string;
    readonly city: string | null;
    readonly province: string | null;
    readonly country: string | null;
}

/** Anonymous auditor metadata that is safe to include in exports. */
export interface ExportAuditorProfile {
    readonly auditorCode: string;
    readonly ageRange: string | null;
    readonly gender: string | null;
    readonly country: string | null;
    readonly role: string | null;
}

/** One submitted audit bundled with the extra context needed for exports. */
export interface ExportableAudit {
    readonly auditSession: import("lib/audit/types").AuditSession;
    readonly context: AuditExportContext | null;
    readonly auditorProfile: ExportAuditorProfile | null;
    /**
     * Play Value / Usability selection to apply. Omitted or default-valued
     * exports the whole audit, byte-for-byte as before this option existed.
     */
    readonly resultFilter?: import("lib/audit/report-filter").ReportResultFilter;
}

/** Lightweight workbook-style preview shown in the reports screen. */
export interface AuditExportPreview {
    readonly auditCode: string;
    readonly headers: readonly string[];
    readonly rows: readonly (readonly string[])[];
}

export type SpreadsheetCell = string | number;
export type SpreadsheetRow = readonly SpreadsheetCell[];

export interface WorkbookTable {
    readonly name: string;
    readonly title: string;
    readonly rows: readonly SpreadsheetRow[];
    readonly columnWidths?: readonly number[];
}

export interface WorkbookPayload {
    readonly fileBaseName: string;
    readonly title: string;
    readonly tables: readonly WorkbookTable[];
}

export const CSV_MIME_TYPE = "text/csv";
export const CSV_UTI = "public.comma-separated-values-text";
export const PDF_MIME_TYPE = "application/pdf";
export const PDF_UTI = "com.adobe.pdf";
export const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const XLSX_UTI = "org.openxmlformats.spreadsheetml.sheet";

export const INVALID_SHEET_NAME_CHARACTERS = [":", "\\", "/", "?", "*", "[", "]"] as const;

/**
 * Web-aligned audit response matrix headers.
 *
 * This replaces the older mobile-only labels (`ID_Number`, `Survey or Audit`,
 * `Auditor Comment`) so the mobile XLSX/CSV row shape matches the web audit
 * workbook styling contract.
 */
export const SINGLE_RESPONSE_HEADERS = [
    "Question Key",
    "Mode",
    "Constructs",
    "Domain",
    "Domain Description",
    "Instructions",
    "Prompt",
    "Provision",
    "Variety",
    "Sociability",
    ...SOCIABILITY_EXPORT_HEADERS,
    "Challenge",
    "PV Score",
    "U Score",
] as const;

export const PDF_RESPONSE_HEADERS = [
    "Question Key",
    "Mode",
    "Constructs",
    "Prompt",
    "Provision",
    "Variety",
    "Sociability",
    "Challenge",
    "PV Score",
    "U Score",
] as const;

export const PREVIEW_RESPONSE_COLUMN_INDEXES = [0, 1, 2, 3, 6, 7, 8, 9, 13] as const;

export const OVERVIEW_COLUMN_WIDTHS = [28, 56] as const;
export const SINGLE_PRE_AUDIT_COLUMN_WIDTHS = [42, 58] as const;
export const SINGLE_SPACE_AUDIT_COLUMN_WIDTHS = [42, 58] as const;
export const BULK_PRE_AUDIT_COLUMN_WIDTHS = [16, 24, 40, 56] as const;
export const BULK_SPACE_AUDIT_COLUMN_WIDTHS = [16, 24, 40, 56] as const;
export const GUIDANCE_COLUMN_WIDTHS = [24, 64, 56] as const;
export const SINGLE_RESPONSE_COLUMN_WIDTHS = [14, 14, 16, 24, 44, 42, 72, 22, 22, 22, 22, 22, 22, 24, 16, 16] as const;
export const BULK_RESPONSE_COLUMN_WIDTHS = SINGLE_RESPONSE_COLUMN_WIDTHS;

/**
 * Shared export palette for generated PDF/XLSX documents.
 *
 * Values resolve from `brand/tokens.json`. The comment this block used to carry
 * claimed these were "matched to the web audit export", but the web pipeline
 * derives its colours from the theme palette instead - the two were never
 * actually tied. That divergence is recorded under `knownDrift`.
 */
export const WEB_AUDIT_EXPORT_PALETTE = {
    headerFill: GENERATED_EXPORT_DOCUMENT_COLORS.headerFill,
    headerText: GENERATED_EXPORT_DOCUMENT_COLORS.headerText,
    sectionFill: GENERATED_EXPORT_DOCUMENT_COLORS.sectionFill,
    sectionTitleText: GENERATED_EXPORT_DOCUMENT_COLORS.sectionTitleText,
    sectionText: GENERATED_EXPORT_DOCUMENT_COLORS.sectionText,
    sectionInstructionText: GENERATED_EXPORT_DOCUMENT_COLORS.sectionInstructionText,
    sectionNotesText: GENERATED_EXPORT_DOCUMENT_COLORS.sectionNotesText,
    rowEven: GENERATED_EXPORT_DOCUMENT_COLORS.rowEven,
    rowOdd: GENERATED_EXPORT_DOCUMENT_COLORS.rowOdd,
    bodyText: GENERATED_EXPORT_DOCUMENT_COLORS.bodyText,
    sheetBodyText: GENERATED_EXPORT_DOCUMENT_COLORS.sheetBodyText,
    mutedText: GENERATED_EXPORT_DOCUMENT_COLORS.mutedText,
    border: GENERATED_EXPORT_DOCUMENT_COLORS.border,
    borderStrong: GENERATED_EXPORT_DOCUMENT_COLORS.borderStrong,
    summaryFill: GENERATED_EXPORT_DOCUMENT_COLORS.summaryFill,
    summaryText: GENERATED_EXPORT_DOCUMENT_COLORS.summaryText,
    summaryNeutralFill: GENERATED_EXPORT_DOCUMENT_COLORS.summaryNeutralFill,
    scoreAccentText: GENERATED_EXPORT_DOCUMENT_COLORS.scoreAccentText,
    subtitleText: GENERATED_EXPORT_DOCUMENT_COLORS.subtitleText,
    scaleFill: SCALE_SOFT_COLORS,
    scaleAccent: SCALE_ACCENT_COLORS,
} as const;

export type ExportScaleKey = Extract<ScaleKey, "provision" | "variety" | "sociability" | "challenge">;

/** Responses-sheet scale column indexes, matching `SINGLE_RESPONSE_HEADERS`. */
export const SCALE_COLUMN_MAP: Partial<Record<number, ExportScaleKey>> = {
    7: "provision",
    8: "variety",
    9: "sociability",
    10: "sociability",
    11: "sociability",
    12: "sociability",
    13: "challenge",
};

/** PDF response matrix scale column indexes, matching `PDF_RESPONSE_HEADERS`. */
export const PDF_SCALE_COLUMN_MAP: Partial<Record<number, ExportScaleKey>> = {
    4: "provision",
    5: "variety",
    6: "sociability",
    7: "challenge",
};

/** Sentinel placed in col 1 so the XLSX/PDF styler can identify per-question auditor comment rows. */
export const COMMENT_ROW_SENTINEL = "__comment__" as const;

/** Sentinel placed in col 1 for the bold Notes Prompt banner row. */
export const SECTION_NOTE_SENTINEL = "__section_note__" as const;

/** Sentinel placed in col 1 for the normal-weight Auditor Note response row. */
export const SECTION_NOTE_RESPONSE_SENTINEL = "__section_note_response__" as const;

/** Sentinel placed in col 2 so the XLSX/PDF styler can identify score summary rows. */
export const SCORE_ROW_SENTINEL = "Summary" as const;

/** Col index that holds the score row kind label (`Raw Scores`, `Max Possible`, `Final Percentage`). */
export const SCORE_ROW_KIND_COL = 1;

export type ScoreRowKind = "raw" | "maximum" | "percentage";
