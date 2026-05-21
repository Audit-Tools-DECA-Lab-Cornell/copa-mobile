import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import type { PlayspaceInstrument } from "lib/audit/types";
import {
    CSV_MIME_TYPE,
    CSV_UTI,
    PDF_MIME_TYPE,
    PDF_UTI,
    XLSX_MIME_TYPE,
    XLSX_UTI,
    type WorkbookPayload,
} from "lib/exports/reports/types";

import { buildInProgressAuditCsvText, buildInProgressAuditXlsxBase64 } from "./excel";
import { buildInProgressAuditPdfHtml } from "./pdf";
import type { InProgressExportableAudit } from "./types";

/** Write the workbook CSV and open the platform share sheet. */
export async function shareInProgressAuditCsv(workbook: WorkbookPayload): Promise<string> {
    const fileName = `${workbook.fileBaseName}.csv`;
    const fileUri = buildCacheFileUri(fileName);
    await FileSystem.writeAsStringAsync(fileUri, buildInProgressAuditCsvText(workbook), {
        encoding: FileSystem.EncodingType.UTF8,
    });
    await shareLocalFile(fileUri, fileName, CSV_MIME_TYPE, CSV_UTI);
    return fileName;
}

/** Write the styled workbook XLSX and open the platform share sheet. */
export async function shareInProgressAuditXlsx(workbook: WorkbookPayload): Promise<string> {
    const fileName = `${workbook.fileBaseName}.xlsx`;
    const fileUri = buildCacheFileUri(fileName);
    await FileSystem.writeAsStringAsync(fileUri, buildInProgressAuditXlsxBase64(workbook), {
        encoding: FileSystem.EncodingType.Base64,
    });
    await shareLocalFile(fileUri, fileName, XLSX_MIME_TYPE, XLSX_UTI);
    return fileName;
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
