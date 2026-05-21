import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import type { DesignSystemTheme } from "lib/design-system";
import type { PlayspaceInstrument } from "lib/audit/types";

import { buildWorkbookCsvText, buildXlsxWorkbookBase64 } from "./excel";
import { buildSingleAuditPdfHtml, buildWorkbookPdfHtml } from "./pdf";
import {
    CSV_MIME_TYPE,
    CSV_UTI,
    PDF_MIME_TYPE,
    PDF_UTI,
    XLSX_MIME_TYPE,
    XLSX_UTI,
    type ExportableAudit,
    type WorkbookPayload,
} from "./types";

/** Write the workbook CSV and open the platform share sheet. */
export async function shareCsvWorkbook(workbook: WorkbookPayload): Promise<string> {
    const fileName = `${workbook.fileBaseName}.csv`;
    const fileUri = buildCacheFileUri(fileName);
    await FileSystem.writeAsStringAsync(fileUri, buildWorkbookCsvText(workbook), {
        encoding: FileSystem.EncodingType.UTF8,
    });
    await shareLocalFile(fileUri, fileName, CSV_MIME_TYPE, CSV_UTI);
    return fileName;
}

/** Write the styled workbook XLSX and open the platform share sheet. */
export async function shareXlsxWorkbook(
    workbook: WorkbookPayload,
    _colors?: DesignSystemTheme["colors"],
): Promise<string> {
    const fileName = `${workbook.fileBaseName}.xlsx`;
    const fileUri = buildCacheFileUri(fileName);
    await FileSystem.writeAsStringAsync(fileUri, buildXlsxWorkbookBase64(workbook), {
        encoding: FileSystem.EncodingType.Base64,
    });
    await shareLocalFile(fileUri, fileName, XLSX_MIME_TYPE, XLSX_UTI);
    return fileName;
}

/** Render a single audit with the web-style PDF layout and open the share sheet. */
export async function shareSingleAuditPdf(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
    _colors?: DesignSystemTheme["colors"],
): Promise<string> {
    const html = buildSingleAuditPdfHtml(exportableAudit, instrument);
    const fileName = `${exportableAudit.auditSession.project_name}-${exportableAudit.auditSession.audit_code}`
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return await sharePdfHtml(html, `${fileName.length > 0 ? fileName : "pvua-audit"}.pdf`);
}

/** Render a generic workbook PDF, primarily for bulk exports. */
export async function shareWorkbookPdf(
    workbook: WorkbookPayload,
    _colors?: DesignSystemTheme["colors"],
): Promise<string> {
    return await sharePdfHtml(buildWorkbookPdfHtml(workbook), `${workbook.fileBaseName}.pdf`);
}

async function sharePdfHtml(html: string, fileName: string): Promise<string> {
    const printResult = await Print.printToFileAsync({ html });
    const fileUri = buildCacheFileUri(fileName);
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    await FileSystem.moveAsync({ from: printResult.uri, to: fileUri });
    await shareLocalFile(fileUri, fileName, PDF_MIME_TYPE, PDF_UTI);
    return fileName;
}

/** Share one local file through the platform share sheet. */
async function shareLocalFile(fileUri: string, fileName: string, mimeType: string, uti: string): Promise<void> {
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
        throw new Error(`File sharing is unavailable for ${fileName}.`);
    }

    await Sharing.shareAsync(fileUri, {
        mimeType,
        UTI: uti,
        dialogTitle: fileName,
    });
}

/** Build one cache URI for a generated export file. */
function buildCacheFileUri(fileName: string): string {
    if (typeof FileSystem.cacheDirectory !== "string" || FileSystem.cacheDirectory.length === 0) {
        throw new Error("The export cache directory is unavailable on this device.");
    }
    return `${FileSystem.cacheDirectory}${fileName}`;
}
