import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import type { PlayspaceInstrument } from "lib/audit/types";
import { shareCsvWorkbook, shareXlsxWorkbook } from "lib/exports/reports/share";
import { PDF_MIME_TYPE, PDF_UTI, type WorkbookPayload } from "lib/exports/reports/types";

import { buildInProgressAuditPdfHtml } from "./pdf";
import type { InProgressExportableAudit } from "./types";

/** Write the workbook CSV and open the platform share sheet. */
export async function shareInProgressAuditCsv(workbook: WorkbookPayload): Promise<string> {
    return await shareCsvWorkbook(workbook);
}

/** Write the styled workbook XLSX and open the platform share sheet. */
export async function shareInProgressAuditXlsx(workbook: WorkbookPayload): Promise<string> {
    return await shareXlsxWorkbook(workbook);
}

/** Render the in-progress audit PDF and open the platform share sheet. */
export async function shareInProgressAuditPdf(
    exportableAudit: InProgressExportableAudit,
    instrument: PlayspaceInstrument,
    workbook: WorkbookPayload,
): Promise<string> {
    const html = buildInProgressAuditPdfHtml(exportableAudit, instrument, workbook);
    const fileName = `${workbook.fileBaseName}.pdf`;
    const printResult = await Print.printToFileAsync({ html });
    const fileUri = buildCacheFileUri(fileName);
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    await FileSystem.moveAsync({ from: printResult.uri, to: fileUri });
    await shareLocalFile(fileUri, fileName, PDF_MIME_TYPE, PDF_UTI);
    return fileName;
}

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

function buildCacheFileUri(fileName: string): string {
    if (typeof FileSystem.cacheDirectory !== "string" || FileSystem.cacheDirectory.length === 0) {
        throw new Error("The export cache directory is unavailable on this device.");
    }
    return `${FileSystem.cacheDirectory}${fileName}`;
}
