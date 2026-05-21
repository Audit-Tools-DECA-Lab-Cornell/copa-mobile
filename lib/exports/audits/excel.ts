import * as XLSX from "xlsx-js-style";

import { sanitizeSheetName, stringifyCell } from "lib/exports/reports/format-utils";
import type { SpreadsheetRow, WorkbookPayload, WorkbookTable } from "lib/exports/reports/types";

import {
    COMMENT_ROW_SENTINEL,
    SECTION_NOTE_RESPONSE_SENTINEL,
    SECTION_NOTE_SENTINEL,
    UNANSWERED_CELL_PALETTE,
    UNANSWERED_PLACEHOLDER,
} from "./types";

type StyledCell = XLSX.CellObject & { s?: Record<string, unknown> };

/**
 * Build a styled XLSX workbook for an in-progress audit export.
 *
 * The styling is intentionally simpler than the submitted-report export — no
 * score totals, no scale-coloured columns — but it adds one important
 * affordance: any cell whose value matches `UNANSWERED_PLACEHOLDER` gets a
 * pale red fill and italic muted text so the reader can spot incomplete
 * questions at a glance.
 */
export function buildInProgressAuditXlsxBase64(workbook: WorkbookPayload): string {
    const excelWorkbook = XLSX.utils.book_new();

    for (const table of workbook.tables) {
        const sheet = XLSX.utils.aoa_to_sheet(table.rows.map((row) => [...row]));
        sheet["!cols"] = table.columnWidths
            ? table.columnWidths.map((width) => ({ wch: width }))
            : calculateDynamicColumnWidths(table.rows);
        styleSheet(sheet, table);
        XLSX.utils.book_append_sheet(excelWorkbook, sheet, sanitizeSheetName(table.name));
    }

    return XLSX.write(excelWorkbook, {
        type: "base64",
        bookType: "xlsx",
        cellStyles: true,
    });
}

/** Serialize every workbook table into one CSV document, separated by blank rows. */
export function buildInProgressAuditCsvText(workbook: WorkbookPayload): string {
    const rows: SpreadsheetRow[] = workbook.tables.flatMap((table, tableIndex) => {
        const separator: SpreadsheetRow[] = tableIndex > 0 ? [[], []] : [];
        return [...separator, [table.title], [], ...table.rows];
    });
    return rows
        .map((row) =>
            row
                .map((cell) => {
                    const text = stringifyCell(cell).replaceAll('"', '""');
                    return `"${text}"`;
                })
                .join(","),
        )
        .join("\n");
}

function calculateDynamicColumnWidths(rows: readonly SpreadsheetRow[]): { wch: number }[] {
    const minWidth = 12;
    const maxWidth = 60;
    const widths: number[] = [];

    for (const row of rows) {
        for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
            const cellText = String(row[colIndex] ?? "");
            const longestLine = cellText.split("\n").reduce((max, line) => Math.max(max, line.length), 0);
            const estimated = longestLine + 2;
            if (widths[colIndex] === undefined || estimated > widths[colIndex]!) {
                widths[colIndex] = Math.min(Math.max(estimated, minWidth), maxWidth);
            }
        }
    }

    return widths.map((width) => ({ wch: width }));
}

function styleSheet(sheet: XLSX.WorkSheet, table: WorkbookTable): void {
    const ref = sheet["!ref"];
    if (typeof ref !== "string" || ref.length === 0) {
        return;
    }

    const range = XLSX.utils.decode_range(ref);
    const headerFill = { patternType: "solid", fgColor: { rgb: "1F2937" } } as const;
    const sectionFill = { patternType: "solid", fgColor: { rgb: "E2E8F0" } } as const;
    const altRowFill = { patternType: "solid", fgColor: { rgb: "F8FAFC" } } as const;
    const noFill = { patternType: "none" } as const;
    const unansweredFill = { patternType: "solid", fgColor: { rgb: UNANSWERED_CELL_PALETTE.fillHex } } as const;
    const lightBorder = { style: "thin", color: { rgb: "E2E8F0" } } as const;
    const heavyBorder = { style: "medium", color: { rgb: "94A3B8" } } as const;
    const merges: XLSX.Range[] = [];

    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
        const row = table.rows[rowIndex];
        if (row === undefined) continue;

        const isHeaderRow = rowIndex === 0;
        const isCommentRow = row[1] === COMMENT_ROW_SENTINEL;
        const isSectionNoteRow = row[1] === SECTION_NOTE_SENTINEL;
        const isSectionNoteResponseRow = row[1] === SECTION_NOTE_RESPONSE_SENTINEL;
        const isSectionHeaderRow =
            !isHeaderRow && typeof row[0] === "string" && /^\d+$/u.test(row[0]) && row[1] === "" && row[2] === "";
        const isEvenRow = rowIndex % 2 === 0;

        if (isSectionNoteRow || isSectionNoteResponseRow) {
            merges.push({ s: { r: rowIndex, c: range.s.c }, e: { r: rowIndex, c: range.e.c } });
        }

        for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
            const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
            const cell = sheet[address] as StyledCell | undefined;
            if (cell === undefined) continue;

            const baseStyle = {
                alignment: { vertical: "top" as const, wrapText: true, horizontal: "left" as const },
                font: { name: "Arial", sz: 10, color: { rgb: "334155" } },
                border: { bottom: lightBorder },
            };

            if (isHeaderRow) {
                cell.s = {
                    ...baseStyle,
                    fill: headerFill,
                    font: { ...baseStyle.font, bold: true, sz: 11, color: { rgb: "FFFFFF" } },
                    alignment: { ...baseStyle.alignment, horizontal: "center", vertical: "center" },
                    border: { bottom: heavyBorder },
                };
            } else if (isSectionHeaderRow) {
                cell.s = {
                    ...baseStyle,
                    fill: sectionFill,
                    font: { ...baseStyle.font, bold: true, color: { rgb: "0F172A" } },
                    border: { top: heavyBorder, bottom: heavyBorder },
                };
            } else if (isCommentRow) {
                cell.s = {
                    ...baseStyle,
                    fill: sectionFill,
                    font: { ...baseStyle.font, italic: true, color: { rgb: "475569" } },
                };
            } else if (isSectionNoteRow) {
                cell.s = {
                    ...baseStyle,
                    fill: sectionFill,
                    font: { ...baseStyle.font, bold: true, color: { rgb: "0F172A" } },
                    border: { top: lightBorder },
                };
            } else if (isSectionNoteResponseRow) {
                cell.s = {
                    ...baseStyle,
                    fill: sectionFill,
                    font: { ...baseStyle.font, color: { rgb: "475569" } },
                };
            } else if (typeof cell.v === "string" && cell.v === UNANSWERED_PLACEHOLDER) {
                cell.s = {
                    ...baseStyle,
                    fill: unansweredFill,
                    font: {
                        ...baseStyle.font,
                        italic: true,
                        color: { rgb: UNANSWERED_CELL_PALETTE.textHex },
                    },
                };
            } else {
                cell.s = { ...baseStyle, fill: isEvenRow ? altRowFill : noFill };
            }
        }
    }

    if (merges.length > 0) {
        const existing = sheet["!merges"] ?? [];
        sheet["!merges"] = [...existing, ...merges];
    }

    sheet["!rows"] = table.rows.map((row, rowIndex) => {
        const isHeaderRow = rowIndex === 0;
        let maxLines = 1;
        for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
            const cellText = String(row[colIndex] ?? "");
            const colWidth = (sheet["!cols"]?.[colIndex] as { wch?: number } | undefined)?.wch ?? 20;
            const explicitLines = cellText.split("\n").length;
            const wrappedLines = Math.max(1, Math.ceil(cellText.length / colWidth));
            maxLines = Math.max(maxLines, explicitLines, wrappedLines);
        }
        const calculatedHeight = maxLines * 14 + 8;
        if (isHeaderRow) return { hpt: Math.max(28, calculatedHeight) };
        return { hpt: Math.max(20, calculatedHeight) };
    });
}
