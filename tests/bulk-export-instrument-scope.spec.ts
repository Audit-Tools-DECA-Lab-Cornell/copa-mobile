import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DesignSystemTheme } from "lib/design-system";
import { createDefaultReportFilter, setDomainOverride } from "lib/audit/report-filter";
import { calculateQuestionScores } from "lib/audit/score-helpers";
import type { AuditSession, PlayspaceInstrument, QuestionResponsePayload } from "lib/audit/types";
import { shareBulkAuditExport, type AuditExportFormat } from "lib/exports/reports";
import { buildWorkbookCsvText, buildXlsxWorkbookBase64 } from "lib/exports/reports/excel";
import { buildWorkbookPdfHtml } from "lib/exports/reports/pdf";
import { buildBulkAuditWorkbook } from "lib/exports/reports/row-builders";
import {
    SINGLE_RESPONSE_HEADERS,
    type ExportableAudit,
    type SpreadsheetRow,
    type WorkbookPayload,
    type WorkbookTable,
} from "lib/exports/reports/types";

import { buildSociabilityInstrument, buildSociabilitySession } from "./support/sociability-fixtures";

// The share layer wraps the native print/file/share modules; record the
// workbook each format would hand to the device instead.
const sharedWorkbooks = vi.hoisted(() => new Map<AuditExportFormat, WorkbookPayload>());

vi.mock("lib/exports/reports/share", () => {
    const record = (format: AuditExportFormat, workbook: WorkbookPayload): string => {
        sharedWorkbooks.set(format, workbook);
        return `${workbook.fileBaseName}.${format}`;
    };
    return {
        shareCsvWorkbook: async (workbook: WorkbookPayload) => record("csv", workbook),
        shareXlsxWorkbook: async (workbook: WorkbookPayload) => record("xlsx", workbook),
        shareWorkbookPdf: async (workbook: WorkbookPayload) => record("pdf", workbook),
        shareSingleAuditPdf: async () => "unused.pdf",
    };
});

/** The mocked share layer never reads the theme colors. */
const UNUSED_COLORS = {} as DesignSystemTheme["colors"];

/** Sociability recorded as one scalar choice, as instrument versions up to 5.31 store it. */
const LEGACY_ANSWERS: QuestionResponsePayload = { provision: "some", sociability: "a_pair" };

/** Sociability recorded as a category list, as instrument versions from 5.32 store it. */
const MULTI_ANSWERS: QuestionResponsePayload = { provision: "some", sociability: ["play_alone", "large_group"] };

/** App-wide active instrument: multi-select Sociability, newer than both audits below. */
const activeInstrument: PlayspaceInstrument = {
    ...buildSociabilityInstrument("multiple"),
    instrument_name: "Active instrument",
    instrument_version: "5.41",
    preamble: ["Guidance from the active instrument."],
};

function buildSubmittedAudit(
    selectionMode: "single" | "multiple",
    auditCode: string,
    answers: QuestionResponsePayload,
): ExportableAudit {
    const session = buildSociabilitySession(answers, selectionMode);
    const question = session.instrument?.sections[0]?.questions[0];
    if (question === undefined) {
        throw new Error("Expected fixture question.");
    }
    const totals = calculateQuestionScores(question, answers);

    return {
        auditSession: {
            ...session,
            audit_code: auditCode,
            status: "SUBMITTED",
            submitted_at: "2026-08-06T13:00:00.000Z",
            scores: {
                ...session.scores,
                audit: totals,
                overall: totals,
                by_section: { section_a: totals },
                by_domain: { Movement: totals },
            },
        },
        context: null,
        auditorProfile: null,
    };
}

/**
 * Model a cached session whose payload carries no embedded instrument.
 *
 * @param recordedVersion Instrument version the session says it was recorded with.
 */
function withoutEmbeddedInstrument(
    exportableAudit: ExportableAudit,
    recordedVersion = exportableAudit.auditSession.instrument_version,
): ExportableAudit {
    const auditSession: AuditSession = { ...exportableAudit.auditSession, instrument_version: recordedVersion };
    delete auditSession.instrument;
    return { ...exportableAudit, auditSession };
}

/** Move the fixture question, and its stored domain score, into another domain. */
function withQuestionDomain(exportableAudit: ExportableAudit, domain: string): ExportableAudit {
    const { auditSession } = exportableAudit;
    const instrument = auditSession.instrument;
    if (instrument === undefined) {
        throw new Error("Expected an embedded fixture instrument.");
    }
    const overall = auditSession.scores.overall;

    return {
        ...exportableAudit,
        auditSession: {
            ...auditSession,
            instrument: {
                ...instrument,
                sections: instrument.sections.map((section) => ({
                    ...section,
                    questions: section.questions.map((question) => ({ ...question, domains: [domain] })),
                })),
            },
            scores: { ...auditSession.scores, by_domain: overall === null ? {} : { [domain]: overall } },
        },
    };
}

function findTable(workbook: WorkbookPayload, name: string): WorkbookTable {
    const table = workbook.tables.find((candidate) => candidate.name === name);
    if (table === undefined) {
        throw new Error(`Expected a ${name} table.`);
    }
    return table;
}

/** Response-matrix question rows in audit order (each fixture audit has one audit-mode question). */
function findQuestionRows(workbook: WorkbookPayload): readonly SpreadsheetRow[] {
    return findTable(workbook, "Responses").rows.filter((row) => row[1] === "Audit");
}

function readSharedWorkbook(format: AuditExportFormat): WorkbookPayload {
    const workbook = sharedWorkbooks.get(format);
    if (workbook === undefined) {
        throw new Error(`Expected a shared ${format} workbook.`);
    }
    return workbook;
}

const legacyAudit = buildSubmittedAudit("single", "SOC-531", LEGACY_ANSWERS);
const multiAudit = buildSubmittedAudit("multiple", "SOC-532", MULTI_ANSWERS);

describe("bulk export instrument versions", () => {
    beforeEach(() => {
        sharedWorkbooks.clear();
    });

    it("reads a legacy single-choice audit and a multi-select audit against their own instruments", () => {
        expect(legacyAudit.auditSession.instrument?.instrument_version).toBe("5.31");
        expect(multiAudit.auditSession.instrument?.instrument_version).toBe("5.32");

        const workbook = buildBulkAuditWorkbook([legacyAudit, multiAudit], activeInstrument, null);
        const [legacyRow, multiRow] = findQuestionRows(workbook);

        expect(legacyRow?.[9]).toContain("Yes - a pair");
        expect(legacyRow?.slice(10, 13)).toEqual(["Not captured", "Not captured", "Not captured"]);
        expect(multiRow?.[9]).toContain("Play on their own");
        expect(multiRow?.slice(10, 13)).toEqual(["Selected", "Not selected", "Selected"]);
        expect(
            findTable(workbook, "Overview")
                .rows.slice(1)
                .map((row) => row[0]),
        ).toEqual(["SOC-531", "SOC-532"]);
    });

    it("refuses to read an audit against an active instrument of a different version", () => {
        // Without its own instrument, the 5.31 audit would be read against the
        // active 5.41 multi-select scales; the export names the audit instead.
        expect(() =>
            buildBulkAuditWorkbook([multiAudit, withoutEmbeddedInstrument(legacyAudit)], activeInstrument, null),
        ).toThrow("Audit SOC-531 is not available for export yet.");
    });

    it("falls back to the active instrument for a session without its own that recorded the active version", () => {
        const workbook = buildBulkAuditWorkbook(
            [legacyAudit, withoutEmbeddedInstrument(multiAudit, "5.41")],
            activeInstrument,
            null,
        );
        const [legacyRow, multiRow] = findQuestionRows(workbook);

        expect(legacyRow?.slice(10, 13)).toEqual(["Not captured", "Not captured", "Not captured"]);
        expect(multiRow?.slice(10, 13)).toEqual(["Selected", "Not selected", "Selected"]);
    });

    it("keeps every audit's response rows under one header when the filter applies differently per version", () => {
        // The Movement override filters the 5.31 audit; the 5.32 audit's question
        // sits in another domain, so it exports unfiltered with both score columns.
        const resultFilter = setDomainOverride(createDefaultReportFilter(), "movement", {
            playValue: true,
            usability: false,
        });
        const workbook = buildBulkAuditWorkbook(
            [
                { ...legacyAudit, resultFilter },
                { ...withQuestionDomain(multiAudit, "Nature"), resultFilter },
            ],
            activeInstrument,
            null,
        );
        const [header, ...rows] = findTable(workbook, "Responses").rows;
        const [legacyRow] = findQuestionRows(workbook);

        expect(header).toEqual([...SINGLE_RESPONSE_HEADERS]);
        expect(rows.every((row) => row.length === header?.length)).toBe(true);
        expect(typeof legacyRow?.[14]).toBe("number");
        expect(legacyRow?.[15]).toBe("");
    });

    it("labels guidance for each instrument version in the file and titles the workbook with the active one", () => {
        const workbook = buildBulkAuditWorkbook([legacyAudit, multiAudit, legacyAudit], activeInstrument, null);
        const guidanceRows = findTable(workbook, "Guidance").rows;

        expect(workbook.title).toBe("Active instrument Bulk Export");
        expect(guidanceRows.filter((row) => row[0] === "Instrument").map((row) => row[1])).toEqual([
            "Sociability test instrument v5.31",
            "Sociability test instrument v5.32",
        ]);
        expect(guidanceRows.some((row) => row[1] === "Guidance from the active instrument.")).toBe(false);
    });

    it("describes the active instrument's guidance when the export holds no audits", () => {
        const guidanceRows = findTable(buildBulkAuditWorkbook([], activeInstrument, null), "Guidance").rows;

        expect(guidanceRows.find((row) => row[0] === "Instrument")?.[1]).toBe("Active instrument v5.41");
        expect(guidanceRows.find((row) => row[0] === "Instrument Overview")?.[1]).toBe(
            "Guidance from the active instrument.",
        );
    });

    it("builds from the audits' own instruments before an active instrument is loaded", () => {
        const workbook = buildBulkAuditWorkbook([legacyAudit, multiAudit], null, null);

        expect(workbook.title).toBe("Sociability test instrument Bulk Export");
        expect(findQuestionRows(workbook)).toHaveLength(2);
    });

    it("names the audit that has no instrument to read it against", () => {
        expect(() => buildBulkAuditWorkbook([multiAudit, withoutEmbeddedInstrument(legacyAudit)], null, null)).toThrow(
            "Audit SOC-531 is not available for export yet.",
        );
    });

    it("shares CSV, XLSX, and PDF bulk exports that mix instrument versions", async () => {
        for (const format of ["csv", "xlsx", "pdf"] as const) {
            const fileName = await shareBulkAuditExport(
                [legacyAudit, multiAudit],
                null,
                activeInstrument,
                format,
                UNUSED_COLORS,
            );
            const workbook = readSharedWorkbook(format);
            const [legacyRow, multiRow] = findQuestionRows(workbook);

            expect(fileName).toBe(`${workbook.fileBaseName}.${format}`);
            expect(legacyRow?.[9]).toContain("Yes - a pair");
            expect(multiRow?.slice(10, 13)).toEqual(["Selected", "Not selected", "Selected"]);
        }

        expect(buildWorkbookCsvText(readSharedWorkbook("csv"))).toContain("Yes - a pair");
        expect(buildXlsxWorkbookBase64(readSharedWorkbook("xlsx")).length).toBeGreaterThan(100);
        expect(buildWorkbookPdfHtml(readSharedWorkbook("pdf"))).toContain("Yes - a pair");
    });
});
