import type { PlayspaceInstrument } from "lib/audit/types";

import {
    escapeHtml,
    formatExecutionModeLabel,
    formatLocality,
    formatTimestampForDisplay,
} from "lib/exports/reports/format-utils";
import { WEB_AUDIT_EXPORT_PALETTE } from "lib/exports/reports/types";
import type { SpreadsheetCell, SpreadsheetRow, WorkbookPayload } from "lib/exports/reports/types";

import {
    COMMENT_ROW_SENTINEL,
    PENDING_PLACEHOLDER,
    SECTION_NOTE_RESPONSE_SENTINEL,
    SECTION_NOTE_SENTINEL,
    UNANSWERED_CELL_PALETTE,
    UNANSWERED_PLACEHOLDER,
    type InProgressExportableAudit,
} from "./types";

const palette = WEB_AUDIT_EXPORT_PALETTE;

/** Build the in-progress audit PDF used by Expo Print. */
export function buildInProgressAuditPdfHtml(
    exportableAudit: InProgressExportableAudit,
    instrument: PlayspaceInstrument,
    workbook: WorkbookPayload,
): string {
    const { auditSession, context, auditorProfile } = exportableAudit;
    const progress = auditSession.progress;
    const location = formatLocality(context);
    const executionModeLabel = formatExecutionModeLabel(auditSession, instrument);
    const startedAt = formatTimestampForDisplay(auditSession.started_at);
    const finalComments = auditSession.meta.final_comments?.trim() ?? "";

    const detailsRows: [string, SpreadsheetCell][] = [
        ["Place", auditSession.place_name],
        ["Project", auditSession.project_name],
        ["Status", "In progress"],
        ["Mode", executionModeLabel.length > 0 ? executionModeLabel : PENDING_PLACEHOLDER],
        ["Started", startedAt.length > 0 ? startedAt : PENDING_PLACEHOLDER],
        ["Questions Answered", `${progress.answered_visible_questions} of ${progress.total_visible_questions}`],
        ["Sections Completed", `${progress.completed_section_count} of ${progress.visible_section_count}`],
    ];
    if (location.length > 0) {
        detailsRows.push(["Location", location]);
    }
    if (finalComments.length > 0) {
        detailsRows.push(["Final Comments", finalComments]);
    }

    const profileRows: readonly (readonly [string, SpreadsheetCell])[] = auditorProfile
        ? [
              ["Auditor Code", auditorProfile.auditorCode],
              ["Age Range", auditorProfile.ageRange ?? PENDING_PLACEHOLDER],
              ["Gender", auditorProfile.gender ?? PENDING_PLACEHOLDER],
              ["Country", auditorProfile.country ?? PENDING_PLACEHOLDER],
              ["Role", auditorProfile.role ?? PENDING_PLACEHOLDER],
          ]
        : [["Auditor", "Not available"]];

    const renderedTables = workbook.tables
        .filter((table) => table.name !== "Overview")
        .map(
            (table, index) =>
                `<section class="generic-page${index === 0 ? "" : " page-break"}"><h2>${escapeHtml(
                    table.title,
                )}</h2>${renderInProgressTable(table.rows)}</section>`,
        )
        .join("");

    return [
        "<!doctype html>",
        "<html>",
        "<head>",
        '<meta charset="utf-8" />',
        `<title>${escapeHtml(`${auditSession.audit_code} Audit Export (In Progress)`)}</title>`,
        "<style>",
        buildPdfCss(),
        "</style>",
        "</head>",
        "<body>",
        '<section class="summary-page">',
        '<header class="audit-header">',
        "<div>",
        "<h1>Playspace Audit - In Progress</h1>",
        `<p>${escapeHtml(auditSession.audit_code)}</p>`,
        "</div>",
        "</header>",
        '<div class="summary-grid">',
        renderKeyValuePanel("Audit Details", detailsRows),
        renderKeyValuePanel("Auditor Profile", profileRows),
        "</div>",
        "</section>",
        renderedTables,
        "</body>",
        "</html>",
    ].join("");
}

function renderKeyValuePanel(title: string, rows: readonly (readonly [string, SpreadsheetCell])[]): string {
    return [
        '<table class="info-table">',
        `<thead><tr><th colspan="2">${escapeHtml(title)}</th></tr></thead>`,
        "<tbody>",
        rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join(""),
        "</tbody>",
        "</table>",
    ].join("");
}

function renderInProgressTable(rows: readonly SpreadsheetRow[]): string {
    const [headerRow, ...bodyRows] = rows;
    const headerHtml = (headerRow ?? []).map((cell) => `<th>${escapeHtml(cell)}</th>`).join("");
    const bodyHtml = bodyRows
        .map((row) => {
            const rowClass = getRowClass(row);
            const classAttribute = rowClass.length > 0 ? ` class="${rowClass}"` : "";
            const cells = row.map((cell) => renderCell(cell, rowClass)).join("");
            return `<tr${classAttribute}>${cells}</tr>`;
        })
        .join("");

    return [
        '<table class="generic-table">',
        `<thead><tr>${headerHtml}</tr></thead>`,
        `<tbody>${bodyHtml}</tbody>`,
        "</table>",
    ].join("");
}

function renderCell(cell: SpreadsheetCell, rowClass: string): string {
    if (typeof cell === "string" && cell === UNANSWERED_PLACEHOLDER && rowClass === "") {
        return `<td class="unanswered-cell">${escapeHtml(cell)}</td>`;
    }
    return `<td>${escapeHtml(cell)}</td>`;
}

function getRowClass(row: SpreadsheetRow): string {
    const isCommentRow = row[1] === COMMENT_ROW_SENTINEL;
    const isSectionNoteRow = row[1] === SECTION_NOTE_SENTINEL;
    const isSectionNoteResponseRow = row[1] === SECTION_NOTE_RESPONSE_SENTINEL;
    const isSectionHeaderRow = typeof row[0] === "string" && /^\d+$/u.test(row[0]) && row[1] === "" && row[2] === "";

    if (isSectionHeaderRow) return "section-row";
    if (isCommentRow) return "comment-row";
    if (isSectionNoteRow) return "section-note-row";
    if (isSectionNoteResponseRow) return "section-note-response-row";
    return "";
}

function buildPdfCss(): string {
    return `
@page { size: A4 portrait; margin: 14mm; }
:root {
  --header-fill: ${palette.headerFill};
  --header-text: ${palette.headerText};
  --section-fill: ${palette.sectionFill};
  --section-title-text: ${palette.sectionTitleText};
  --section-text: ${palette.sectionText};
  --row-even: ${palette.rowEven};
  --row-odd: ${palette.rowOdd};
  --body-text: ${palette.bodyText};
  --muted-text: ${palette.mutedText};
  --border: ${palette.border};
}
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: var(--body-text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 10px; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.summary-page { page: auto; }
.generic-page { break-before: page; }
.audit-header { background: var(--header-fill); color: var(--header-text); margin: -14mm -14mm 8mm; padding: 7mm 14mm 5mm; }
.audit-header h1 { margin: 0 0 2mm; font-size: 18px; }
.audit-header p { margin: 0; color: #cbd5e1; font-size: 10px; }
h2 { margin: 0 0 5mm; color: var(--header-fill); font-size: 13px; }
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-bottom: 8mm; }
table { border-collapse: collapse; width: 100%; table-layout: fixed; }
th, td { border: 1px solid var(--border); padding: 2.5mm 3mm; vertical-align: top; text-align: left; overflow-wrap: anywhere; white-space: pre-wrap; }
thead th { background: var(--header-fill); color: var(--header-text); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; font-size: 9px; }
.info-table thead th { background: var(--section-fill); color: var(--section-title-text); text-transform: none; letter-spacing: 0; font-size: 10px; }
.info-table tbody th { width: 38%; color: var(--muted-text); font-weight: 700; }
.info-table tbody td { color: var(--body-text); }
.generic-table { font-size: 8.5px; margin-bottom: 6mm; }
.generic-table tbody tr:nth-child(even) td { background: var(--row-even); }
.generic-table .section-row td { background: var(--section-fill) !important; font-weight: 700; color: var(--section-title-text); }
.generic-table .comment-row td, .generic-table .section-note-response-row td { background: var(--row-even) !important; color: var(--muted-text); font-style: italic; }
.generic-table .section-note-row td { background: var(--section-fill) !important; color: var(--section-title-text); font-weight: 700; }
.generic-table td.unanswered-cell { background: #${UNANSWERED_CELL_PALETTE.fillHex} !important; color: #${UNANSWERED_CELL_PALETTE.textHex}; font-style: italic; }
`;
}
