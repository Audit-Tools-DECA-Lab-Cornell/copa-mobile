import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx-js-style";

import { DesignSystemTheme, getScaleAccentColor, getScaleSoftColor } from "lib/design-system";
import {
    addScoreTotals,
    calculateQuestionScores,
    createEmptyScoreTotals,
    formatPercentage,
} from "lib/audit/score-helpers";
import type {
    AuditScoreTotals,
    AuditSession,
    AuditStatus,
    ExecutionMode,
    InstrumentQuestion,
    PlayspaceInstrument,
    PreAuditQuestion,
    QuestionResponsePayload,
    QuestionScale,
} from "lib/audit/types";

/**
 * File formats supported by the mobile export flow.
 */
export type AuditExportFormat = "pdf" | "csv" | "xlsx";

/**
 * Optional place-level context not present on the audit session payload itself.
 */
export interface AuditExportContext {
    readonly projectName: string;
    readonly city: string | null;
    readonly province: string | null;
    readonly country: string | null;
}

/**
 * Anonymous auditor metadata that is safe to include in exports.
 */
export interface ExportAuditorProfile {
    readonly auditorCode: string;
    readonly ageRange: string | null;
    readonly gender: string | null;
    readonly country: string | null;
    readonly role: string | null;
}

/**
 * One submitted audit bundled with the extra context needed for exports.
 */
export interface ExportableAudit {
    readonly auditSession: AuditSession;
    readonly context: AuditExportContext | null;
    readonly auditorProfile: ExportAuditorProfile | null;
}

/**
 * Lightweight workbook-style preview shown in the reports screen.
 */
export interface AuditExportPreview {
    readonly auditCode: string;
    readonly headers: readonly string[];
    readonly rows: readonly (readonly string[])[];
}

type SpreadsheetCell = string | number;
type SpreadsheetRow = readonly SpreadsheetCell[];

interface WorkbookTable {
    readonly name: string;
    readonly title: string;
    readonly rows: readonly SpreadsheetRow[];
    readonly columnWidths?: readonly number[];
}

interface WorkbookPayload {
    readonly fileBaseName: string;
    readonly title: string;
    readonly tables: readonly WorkbookTable[];
}

const CSV_MIME_TYPE = "text/csv";
const CSV_UTI = "public.comma-separated-values-text";
const PDF_MIME_TYPE = "application/pdf";
const PDF_UTI = "com.adobe.pdf";
const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLSX_UTI = "org.openxmlformats.spreadsheetml.sheet";
const INVALID_SHEET_NAME_CHARACTERS = [":", "\\", "/", "?", "*", "[", "]"] as const;
const SINGLE_RESPONSE_HEADERS = [
    "ID_Number",
    "Survey or Audit",
    "Construct",
    "Domain",
    "Domain Description",
    "Instructions",
    "Items",
    "Provision",
    "Diversity",
    "Sociability",
    "Challenge Opportunities",
    "Play Value (PV) Construct Score",
    "Usability (U) Construct Score",
    "Auditor Comment",
] as const;
const PREVIEW_RESPONSE_COLUMN_INDEXES = [0, 1, 2, 3, 6, 7, 8, 9, 10] as const;
const OVERVIEW_COLUMN_WIDTHS = [28, 56] as const;
const SINGLE_PRE_AUDIT_COLUMN_WIDTHS = [42, 58] as const;
const SINGLE_SPACE_AUDIT_COLUMN_WIDTHS = [42, 58] as const;
const BULK_PRE_AUDIT_COLUMN_WIDTHS = [16, 24, 40, 56] as const;
const BULK_SPACE_AUDIT_COLUMN_WIDTHS = [16, 24, 40, 56] as const;
const GUIDANCE_COLUMN_WIDTHS = [24, 64, 56] as const;
const SINGLE_RESPONSE_COLUMN_WIDTHS = [12, 16, 16, 28, 64, 40, 72, 22, 22, 22, 26, 22, 22, 40] as const;
const BULK_RESPONSE_COLUMN_WIDTHS = SINGLE_RESPONSE_COLUMN_WIDTHS;

/**
 * Build a small workbook-like preview table for one submitted audit.
 *
 * @param exportableAudit Submitted audit to preview.
 * @param instrument Static PVUA instrument definition.
 * @param limit Maximum number of detail rows to show.
 * @returns Column headers plus a small sample of exported response rows.
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
                idCell.includes(".") &&
                typeof modeCell === "string" &&
                modeCell.trim().length > 0
            );
        })
        .slice(0, limit)
        .map((row) => PREVIEW_RESPONSE_COLUMN_INDEXES.map((columnIndex) => row[columnIndex] ?? ""));
    return {
        auditCode: exportableAudit.auditSession.audit_code,
        headers: spreadsheetRowToStrings(headerRow),
        rows: detailRows.map((row) => spreadsheetRowToStrings(row)),
    };
}

/**
 * Generate and share one audit export file.
 *
 * @param exportableAudit Submitted audit with optional place context.
 * @param instrument Static PVUA instrument definition.
 * @param format File format to generate.
 * @returns Shared file name for user feedback.
 */
export async function shareSingleAuditExport(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
    format: AuditExportFormat,
    colors: DesignSystemTheme["colors"],
): Promise<string> {
    validateExportableAudit(exportableAudit);
    const workbook = buildSingleAuditWorkbook(exportableAudit, instrument);
    return await shareWorkbookPayload(workbook, format, colors);
}

/**
 * Generate and share a bulk export across multiple submitted audits.
 *
 * @param exportableAudits Submitted audits to export together.
 * @param auditorProfile Optional auditor profile for the bulk export.
 * @param instrument Static PVUA instrument definition.
 * @param format File format to generate.
 * @returns Shared file name for user feedback.
 */
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
    return await shareWorkbookPayload(workbook, format, colors);
}

/**
 * Ensure the export pipeline only handles complete submitted audits.
 *
 * @param exportableAudit Audit candidate for export.
 */
function validateExportableAudit(exportableAudit: ExportableAudit): void {
    if (exportableAudit.auditSession.status !== "SUBMITTED") {
        throw new Error("Only submitted audits can be exported from the reports screen.");
    }
}

/**
 * Convert one audit into workbook-style sheets.
 *
 * @param exportableAudit Submitted audit with optional place context.
 * @param instrument Static PVUA instrument definition.
 * @returns Named workbook payload used by all export formats.
 */
function buildSingleAuditWorkbook(exportableAudit: ExportableAudit, instrument: PlayspaceInstrument): WorkbookPayload {
    const auditCodeSegment = slugifySegment(exportableAudit.auditSession.audit_code);
    const projectSegment = slugifySegment(exportableAudit.auditSession.project_name);
    return {
        fileBaseName: `pvua-${projectSegment}-${auditCodeSegment}`,
        title: `${instrument.instrument_name} Export - ${exportableAudit.auditSession.audit_code}`,
        tables: [
            buildSingleAuditOverviewTable(exportableAudit, instrument),
            buildSingleAuditPreAuditTable(exportableAudit, instrument),
            buildSingleAuditSpaceAuditTable(exportableAudit, instrument),
            buildAuditGuidanceTable(instrument),
            buildResponsesTable(exportableAudit, instrument),
        ],
    };
}

/**
 * Convert multiple audits into workbook-style sheets.
 *
 * @param exportableAudits Submitted audits with optional place context.
 * @param instrument Static PVUA instrument definition.
 * @returns Named workbook payload used by all bulk export formats.
 */
function buildBulkAuditWorkbook(
    exportableAudits: readonly ExportableAudit[],
    instrument: PlayspaceInstrument,
    auditorProfile: ExportAuditorProfile | null,
): WorkbookPayload {
    return {
        fileBaseName: `pvua-bulk-${formatTimestampForFile(new Date())}`,
        title: `${instrument.instrument_name} Bulk Export`,
        tables: [
            buildBulkAuditOverviewTable(exportableAudits, auditorProfile ?? null, instrument),
            buildBulkAuditPreAuditTable(exportableAudits, auditorProfile ?? null, instrument),
            buildBulkAuditSpaceAuditTable(exportableAudits, auditorProfile ?? null, instrument),
            buildAuditGuidanceTable(instrument),
            buildBulkResponsesTable(exportableAudits, instrument),
        ],
    };
}

/**
 * Build a readable key/value overview for one submitted audit.
 *
 * @param exportableAudit Submitted audit with place and optional auditor context.
 * @param instrument Localized PVUA instrument.
 * @returns Overview table without backend UUIDs.
 */
function buildSingleAuditOverviewTable(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    const { auditSession, context, auditorProfile } = exportableAudit;
    const overallScores = auditSession.scores.overall;

    return {
        name: "Overview",
        title: "Audit Overview",
        columnWidths: OVERVIEW_COLUMN_WIDTHS,
        rows: [
            ["Field", "Value"],
            ["Instrument", `${instrument.instrument_name} v${instrument.instrument_version}`],
            ["Audit Code", auditSession.audit_code],
            ["Place Name", auditSession.place_name],
            ["Project Name", auditSession.project_name],
            ["Locality", formatLocality(context)],
            ["Status", formatAuditStatusLabel(auditSession.status)],
            ["Execution Mode", formatExecutionModeLabel(auditSession, instrument)],
            ["Started At", formatTimestampForDisplay(auditSession.started_at)],
            ["Submitted At", formatTimestampForDisplay(auditSession.submitted_at)],
            ["Total Minutes", auditSession.total_minutes ?? "Pending"],
            ["Summary Score", deriveSummaryScore(auditSession)],
            ["Play Value Total", overallScores?.play_value_total ?? "Pending"],
            ["Usability Total", overallScores?.usability_total ?? "Pending"],
            ["Provision Total", overallScores?.provision_total ?? "Pending"],
            ["Diversity Total", overallScores?.diversity_total ?? "Pending"],
            ["Sociability Total", overallScores?.sociability_total ?? "Pending"],
            ["Challenge Total", overallScores?.challenge_total ?? "Pending"],
            ["Auditor Code", auditorProfile?.auditorCode ?? ""],
            ["Auditor Country", auditorProfile?.country ?? ""],
            ["Auditor Gender", auditorProfile?.gender ?? ""],
            ["Auditor Age", auditorProfile?.ageRange ?? ""],
            ["Auditor Role", auditorProfile?.role ?? ""],
        ],
    };
}

/**
 * Build a bulk audit overview with one row per exported audit.
 *
 * @param exportableAudits Submitted audits included in the bulk export.
 * @param instrument Localized PVUA instrument.
 * @returns Overview table for bulk exports.
 */
function buildBulkAuditOverviewTable(
    exportableAudits: readonly ExportableAudit[],
    auditorProfile: ExportAuditorProfile | null,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    return {
        name: "Overview",
        title: "Audit Overview",
        columnWidths: [16, 24, 24, 24, 14, 28, 20, 20, 14, 14, 14, 14, 14, 14, 14, 14, 16, 16, 16, 16, 18],
        rows: [
            [
                "Audit Code",
                "Place Name",
                "Project Name",
                "Locality",
                "Status",
                "Execution Mode",
                "Started At",
                "Submitted At",
                "Total Minutes",
                "Summary Score",
                "Play Value Total",
                "Usability Total",
                "Provision Total",
                "Diversity Total",
                "Sociability Total",
                "Challenge Total",
                "Auditor Code",
                "Auditor Country",
                "Auditor Gender",
                "Auditor Age",
                "Auditor Role",
            ],
            ...exportableAudits.map((exportableAudit) =>
                buildBulkAuditOverviewRow(exportableAudit, auditorProfile, instrument),
            ),
        ],
    };
}

/**
 * Build a readable pre-audit table for one submitted audit.
 *
 * @param exportableAudit Submitted audit included in the export.
 * @param instrument Localized PVUA instrument.
 * @returns Pre-audit question/answer table.
 */
function buildSingleAuditPreAuditTable(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    const auditInfoQuestions = instrument.pre_audit_questions.filter((q) => q.page_key === "audit_info");
    const { auditSession, auditorProfile } = exportableAudit;
    return {
        name: "PreAudit",
        title: "Pre-Audit",
        columnWidths: SINGLE_PRE_AUDIT_COLUMN_WIDTHS,
        rows: [
            ["Question", "Recorded Answer"],
            ...auditInfoQuestions.map((question) =>
                buildSingleAuditPreAuditRow(auditSession, auditorProfile, question),
            ),
        ],
    };
}

/**
 * Build a space-audit setup table for one submitted audit.
 *
 * @param exportableAudit Submitted audit included in the export.
 * @param instrument Localized PVUA instrument.
 * @returns Space-audit question/answer table.
 */
function buildSingleAuditSpaceAuditTable(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    const spaceSetupQuestions = instrument.pre_audit_questions.filter((q) => q.page_key === "space_setup");
    const { auditSession, auditorProfile } = exportableAudit;
    return {
        name: "SpaceAudit",
        title: "Space Audit Setup",
        columnWidths: SINGLE_SPACE_AUDIT_COLUMN_WIDTHS,
        rows: [
            ["Question", "Recorded Answer"],
            ...spaceSetupQuestions.map((question) =>
                buildSingleAuditPreAuditRow(auditSession, auditorProfile, question),
            ),
        ],
    };
}

/**
 * Build a readable pre-audit table across multiple submitted audits.
 *
 * @param exportableAudits Submitted audits included in the export.
 * @param instrument Localized PVUA instrument.
 * @returns Pre-audit table with one row per question per audit.
 */
function buildBulkAuditPreAuditTable(
    exportableAudits: readonly ExportableAudit[],
    auditorProfile: ExportAuditorProfile | null,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    const auditInfoQuestions = instrument.pre_audit_questions.filter((q) => q.page_key === "audit_info");
    const rows: SpreadsheetRow[] = [["Audit Code", "Place Name", "Question", "Recorded Answer"]];

    for (const exportableAudit of exportableAudits) {
        for (const question of auditInfoQuestions) {
            rows.push(buildBulkAuditPreAuditRow(exportableAudit.auditSession, auditorProfile, question));
        }
    }

    return {
        name: "PreAudit",
        title: "Pre-Audit",
        columnWidths: BULK_PRE_AUDIT_COLUMN_WIDTHS,
        rows,
    };
}

/**
 * Build a space-audit setup table across multiple submitted audits.
 *
 * @param exportableAudits Submitted audits included in the export.
 * @param instrument Localized PVUA instrument.
 * @returns Space-audit table with one row per question per audit.
 */
function buildBulkAuditSpaceAuditTable(
    exportableAudits: readonly ExportableAudit[],
    auditorProfile: ExportAuditorProfile | null,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    const spaceSetupQuestions = instrument.pre_audit_questions.filter((q) => q.page_key === "space_setup");
    const rows: SpreadsheetRow[] = [["Audit Code", "Place Name", "Question", "Recorded Answer"]];

    for (const exportableAudit of exportableAudits) {
        for (const question of spaceSetupQuestions) {
            rows.push(buildBulkAuditPreAuditRow(exportableAudit.auditSession, auditorProfile, question));
        }
    }

    return {
        name: "SpaceAudit",
        title: "Space Audit Setup",
        columnWidths: BULK_SPACE_AUDIT_COLUMN_WIDTHS,
        rows,
    };
}

/**
 * Build a reference sheet that combines the instrument overview, execution modes,
 * and scale guidance that auditors use while completing the tool.
 *
 * @param instrument Localized PVUA instrument.
 * @returns Guidance table included in every export.
 */
function buildAuditGuidanceTable(instrument: PlayspaceInstrument): WorkbookTable {
    const executionModeOptions = instrument.execution_modes
        .map((option) => {
            const description =
                typeof option.description === "string" && option.description.trim().length > 0
                    ? ` - ${stripPromptMarkup(option.description)}`
                    : "";
            return `${stripPromptMarkup(option.label)}${description}`;
        })
        .join("\n");

    const rows: SpreadsheetRow[] = [
        ["Topic", "Guidance", "Available options"],
        ["Instrument Overview", instrument.preamble.map(stripPromptMarkup).join("\n\n"), ""],
        ["Execution Modes", "Choose the option that matches how the audit was completed.", executionModeOptions],
    ];

    for (const scale of instrument.scale_guidance) {
        rows.push([
            stripPromptMarkup(scale.title),
            [stripPromptMarkup(scale.description), stripPromptMarkup(scale.prompt)]
                .filter((value) => value.length > 0)
                .join("\n\n"),
            scale.options.map((option) => formatOptionScoreLabel(option)).join("\n"),
        ]);
    }

    return {
        name: "Guidance",
        title: "PVUA Guidance",
        columnWidths: GUIDANCE_COLUMN_WIDTHS,
        rows,
    };
}

/**
 * Build one bulk overview row.
 *
 * @param exportableAudit Submitted audit with place and optional auditor context.
 * @param instrument Localized PVUA instrument.
 * @returns One flat overview row for the bulk sheet.
 */
function buildBulkAuditOverviewRow(
    exportableAudit: ExportableAudit,
    auditorProfile: ExportAuditorProfile | null,
    instrument: PlayspaceInstrument,
): SpreadsheetRow {
    const { auditSession, context } = exportableAudit;
    const overallScores = auditSession.scores.overall;

    return [
        auditSession.audit_code,
        auditSession.place_name,
        context?.projectName ?? "",
        formatLocality(context),
        formatAuditStatusLabel(auditSession.status),
        formatExecutionModeLabel(auditSession, instrument),
        formatTimestampForDisplay(auditSession.started_at),
        formatTimestampForDisplay(auditSession.submitted_at),
        auditSession.total_minutes ?? "Pending",
        deriveSummaryScore(auditSession),
        overallScores?.play_value_total ?? "Pending",
        overallScores?.usability_total ?? "Pending",
        overallScores?.provision_total ?? "Pending",
        overallScores?.diversity_total ?? "Pending",
        overallScores?.sociability_total ?? "Pending",
        overallScores?.challenge_total ?? "Pending",
        auditorProfile?.auditorCode,
        auditorProfile?.country,
        auditorProfile?.gender,
        auditorProfile?.ageRange,
        auditorProfile?.role,
    ].map((value) => value ?? "N/A");
}

/**
 * Build one readable pre-audit row for a single audit export.
 *
 * @param auditSession Submitted audit session.
 * @param question Localized pre-audit question.
 * @returns Single question/answer row.
 */
function buildSingleAuditPreAuditRow(
    auditSession: AuditSession,
    auditorProfile: ExportAuditorProfile | null,
    question: PreAuditQuestion,
): SpreadsheetRow {
    return [
        question.label,
        joinDisplayValues(
            resolvePreAuditDisplayValues(question, readPreAuditQuestionValues(auditSession, auditorProfile, question)),
        ),
    ];
}

/**
 * Build one readable pre-audit row for a bulk export.
 *
 * @param auditSession Submitted audit session.
 * @param question Localized pre-audit question.
 * @returns Bulk pre-audit row with audit identifiers.
 */
function buildBulkAuditPreAuditRow(
    auditSession: AuditSession,
    auditorProfile: ExportAuditorProfile | null,
    question: PreAuditQuestion,
): SpreadsheetRow {
    return [
        auditSession.audit_code,
        auditSession.place_name,
        question.label,
        joinDisplayValues(
            resolvePreAuditDisplayValues(question, readPreAuditQuestionValues(auditSession, auditorProfile, question)),
        ),
    ];
}

/**
 * Build detailed PVUA-style response rows for one audit.
 *
 * @param exportableAudit Submitted audit with optional place context.
 * @param instrument Localized PVUA instrument.
 * @returns Detail rows without the header row.
 */
function buildSingleAuditResponseRows(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
): readonly SpreadsheetRow[] {
    const { auditSession } = exportableAudit;
    const executionMode = resolveExecutionMode(auditSession);
    const rows: SpreadsheetRow[] = [];
    let overallTotals = createEmptyScoreTotals();

    for (const [sectionIndex, section] of instrument.sections.entries()) {
        const sectionResponses = auditSession.sections[section.section_key]?.responses ?? {};
        const visibleQuestions = section.questions.filter((question) =>
            isQuestionVisible(question, executionMode, sectionResponses),
        );
        if (visibleQuestions.length === 0) {
            continue;
        }

        const sectionState = auditSession.sections[section.section_key];
        let sectionTotals = createEmptyScoreTotals();
        rows.push(buildSectionHeaderRow(sectionIndex, section.title, section.description, section.instruction));

        for (const [questionIndex, question] of visibleQuestions.entries()) {
            const questionAnswers = sectionState?.responses[question.question_key] ?? {};
            const questionScores = calculateQuestionScores(question, questionAnswers);
            rows.push(buildQuestionResponseRow(sectionIndex, questionIndex, question, questionAnswers, questionScores));
            sectionTotals = addScoreTotals(sectionTotals, questionScores);
        }

        const sectionNote = sectionState?.note ?? "";
        const notesPrompt = typeof section.notes_prompt === "string" ? stripPromptMarkup(section.notes_prompt) : "";
        if (notesPrompt.length > 0 || sectionNote.trim().length > 0) {
            rows.push(
                buildSectionNoteRow(
                    sectionIndex,
                    visibleQuestions.length + 1,
                    questionDomainFallback(section.title),
                    notesPrompt,
                    sectionNote,
                ),
            );
        }

        rows.push(...buildSectionSummaryRows(sectionTotals));
        overallTotals = addScoreTotals(overallTotals, sectionTotals);
    }

    if (rows.length > 0) {
        rows.push(buildEmptyResponseRow());
        rows.push(...buildOverallSummaryRows(overallTotals));
    }

    return rows;
}

/**
 * Build detailed PVUA-style response rows across multiple audits.
 *
 * @param exportableAudits Submitted audits included in the bulk export.
 * @param instrument Localized PVUA instrument.
 * @returns Detail rows without the bulk header row.
 */
function buildBulkAuditResponseRows(
    exportableAudits: readonly ExportableAudit[],
    instrument: PlayspaceInstrument,
): readonly SpreadsheetRow[] {
    const rows: SpreadsheetRow[] = [];

    for (const exportableAudit of exportableAudits) {
        for (const row of buildSingleAuditResponseRows(exportableAudit, instrument)) {
            rows.push(row);
        }
    }

    return rows;
}

/**
 * Build the section-level header row that mirrors the reference workbook.
 *
 * @param sectionIndex Zero-based visible section index.
 * @param title Section title or domain label.
 * @param description Section description.
 * @param instruction Shared section instruction.
 * @returns Section header row for the response matrix.
 */
function buildSectionHeaderRow(
    sectionIndex: number,
    title: string,
    description: string | null | undefined,
    instruction: string,
): SpreadsheetRow {
    return [
        (sectionIndex + 1).toString(),
        "",
        "",
        questionDomainFallback(title),
        typeof description === "string" ? stripPromptMarkup(description) : "",
        stripPromptMarkup(instruction),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
    ];
}

/**
 * Build one question response row for the PVUA matrix.
 *
 * @param sectionIndex Zero-based visible section index.
 * @param questionIndex Zero-based visible question index within the section.
 * @param question Localized instrument question.
 * @param answers Stored answer map for the question.
 * @param questionScores Raw question score totals.
 * @returns One row containing the question prompt and chosen scale values.
 */
function buildQuestionResponseRow(
    sectionIndex: number,
    questionIndex: number,
    question: InstrumentQuestion,
    answers: QuestionResponsePayload,
    questionScores: AuditScoreTotals,
): SpreadsheetRow {
    if (question.question_type === "checklist") {
        return [
            `${sectionIndex + 1}.${questionIndex + 1}`,
            formatQuestionModeLabel(question.mode),
            formatConstructLabel(question.constructs),
            formatQuestionDomainLabel(question),
            "",
            "",
            stripPromptMarkup(question.prompt),
            formatChecklistAnswer(question, answers),
            "",
            "",
            "",
            "N/A",
            "N/A",
            "",
        ];
    }

    return [
        `${sectionIndex + 1}.${questionIndex + 1}`,
        formatQuestionModeLabel(question.mode),
        formatConstructLabel(question.constructs),
        formatQuestionDomainLabel(question),
        "",
        "",
        stripPromptMarkup(question.prompt),
        formatQuestionAnswer(
            question,
            "provision",
            typeof answers.provision === "string" ? answers.provision : undefined,
        ),
        formatQuestionAnswer(
            question,
            "diversity",
            typeof answers.diversity === "string" ? answers.diversity : undefined,
        ),
        formatQuestionAnswer(
            question,
            "sociability",
            typeof answers.sociability === "string" ? answers.sociability : undefined,
        ),
        formatQuestionAnswer(
            question,
            "challenge",
            typeof answers.challenge === "string" ? answers.challenge : undefined,
        ),
        question.constructs.includes("play_value") ? questionScores.play_value_total : "N/A",
        question.constructs.includes("usability") ? questionScores.usability_total : "N/A",
        "",
    ];
}

/**
 * Build one note/comment row after a section's question rows.
 *
 * @param sectionIndex Zero-based visible section index.
 * @param noteIndex One-based position used for the trailing decimal identifier.
 * @param domainLabel Domain label shown in the response matrix.
 * @param notesPrompt Prompt that invites auditor comments.
 * @param submittedComment Actual submitted note text.
 * @returns One note row for the response matrix.
 */
function buildSectionNoteRow(
    sectionIndex: number,
    noteIndex: number,
    domainLabel: string,
    notesPrompt: string,
    submittedComment: string,
): SpreadsheetRow {
    return [
        `${sectionIndex + 1}.${noteIndex}`,
        "",
        "",
        domainLabel,
        "",
        notesPrompt,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        submittedComment.trim(),
    ];
}

/**
 * Build the raw/max/percentage summary rows for one section.
 *
 * @param totals Section score totals.
 * @returns Three summary rows.
 */
function buildSectionSummaryRows(totals: AuditScoreTotals): readonly SpreadsheetRow[] {
    return [
        buildScoreSummaryRow("Total", "Raw Scores", totals, "raw"),
        buildScoreSummaryRow("Max", "Max Possible", totals, "maximum"),
        buildScoreSummaryRow("%", "Final Percentage", totals, "percentage"),
    ];
}

/**
 * Build the raw/max/percentage summary rows for the whole audit.
 *
 * @param totals Overall audit totals.
 * @returns Three summary rows.
 */
function buildOverallSummaryRows(totals: AuditScoreTotals): readonly SpreadsheetRow[] {
    return [
        buildScoreSummaryRow("Overall Total", "Raw Scores", totals, "raw"),
        buildScoreSummaryRow("Overall Max", "Max Possible", totals, "maximum"),
        buildScoreSummaryRow("Overall %", "Final Percentage", totals, "percentage"),
    ];
}

/**
 * Build one summary row for raw totals, maximum totals, or percentages.
 *
 * @param idLabel Label placed in the first column.
 * @param modeLabel Label placed in the second column.
 * @param totals Score totals backing the row.
 * @param rowKind Summary row kind.
 * @returns One summary row sized to the response table.
 */
function buildScoreSummaryRow(
    idLabel: string,
    modeLabel: string,
    totals: AuditScoreTotals,
    rowKind: "raw" | "maximum" | "percentage",
): SpreadsheetRow {
    if (rowKind === "raw") {
        return [
            idLabel,
            modeLabel,
            "Summary",
            "",
            "",
            "",
            "",
            totals.provision_total,
            totals.diversity_total,
            totals.sociability_total,
            totals.challenge_total,
            totals.play_value_total,
            totals.usability_total,
            "",
        ];
    }

    if (rowKind === "maximum") {
        return [
            idLabel,
            modeLabel,
            "Summary",
            "",
            "",
            "",
            "",
            totals.provision_total_max,
            totals.diversity_total_max,
            totals.sociability_total_max,
            totals.challenge_total_max,
            totals.play_value_total_max,
            totals.usability_total_max,
            "",
        ];
    }

    return [
        idLabel,
        modeLabel,
        "Summary",
        "",
        "",
        "",
        "",
        formatPercentage(totals.provision_total, totals.provision_total_max),
        formatPercentage(totals.diversity_total, totals.diversity_total_max),
        formatPercentage(totals.sociability_total, totals.sociability_total_max),
        formatPercentage(totals.challenge_total, totals.challenge_total_max),
        formatPercentage(totals.play_value_total, totals.play_value_total_max),
        formatPercentage(totals.usability_total, totals.usability_total_max),
        "",
    ];
}

/**
 * Build one empty spacer row for the response table.
 *
 * @returns Blank response row.
 */
function buildEmptyResponseRow(): SpreadsheetRow {
    return ["", "", "", "", "", "", "", "", "", "", "", "", "", ""];
}

/**
 * Format a human-readable execution-mode label for one export row.
 *
 * @param mode Instrument question mode.
 * @returns Display label for the "Survey or Audit" column.
 */
function formatQuestionModeLabel(mode: ExecutionMode): string {
    switch (mode) {
        case "survey":
            return "Survey";
        case "audit":
            return "Audit";
        case "both":
            return "Survey + Audit";
        default:
            return mode;
    }
}

/**
 * Format the construct column for one question row.
 *
 * @param constructs Question construct keys.
 * @returns Display label for the construct column.
 */
function formatConstructLabel(constructs: readonly InstrumentQuestion["constructs"][number][]): string {
    const uniqueConstructs = Array.from(new Set(constructs));
    if (uniqueConstructs.length === 0) {
        return "";
    }
    if (uniqueConstructs.length > 1) {
        return "Both";
    }
    return uniqueConstructs[0] === "play_value" ? "Play Value" : "Usability";
}

/**
 * Format the domain column for one question row.
 *
 * @param question Instrument question definition.
 * @returns Joined domain label string.
 */
function formatQuestionDomainLabel(question: InstrumentQuestion): string {
    return question.domains.map((domain) => questionDomainFallback(domain)).join(" | ");
}

/**
 * Normalize a domain-like label for export display.
 *
 * @param value Raw domain or section title.
 * @returns Plain-text domain label.
 */
function questionDomainFallback(value: string): string {
    return stripPromptMarkup(value).trim();
}

/**
 * Convert one stored answer key into a readable label with score notation.
 *
 * @param question Instrument question definition.
 * @param scaleKey Scale to inspect.
 * @param answerKey Stored option key.
 * @returns Printable answer label with score information.
 */
function formatQuestionAnswer(
    question: InstrumentQuestion,
    scaleKey: QuestionScale["key"],
    answerKey: string | undefined,
): string {
    if (typeof answerKey !== "string" || answerKey.trim().length === 0) {
        return "";
    }

    const scale = question.scales.find((currentScale) => currentScale.key === scaleKey);
    if (scale === undefined) {
        return answerKey;
    }

    const option = scale.options.find((currentOption) => currentOption.key === answerKey);
    if (option === undefined) {
        return answerKey;
    }

    return formatOptionScoreLabel(option);
}

/**
 * Format a checklist question's selected options into a readable label.
 *
 * @param question Instrument checklist question.
 * @param answers Stored answer payload with selected_option_keys.
 * @returns Pipe-separated list of selected option labels.
 */
function formatChecklistAnswer(question: InstrumentQuestion, answers: QuestionResponsePayload): string {
    const selectedKeys = answers["selected_option_keys"];
    if (!Array.isArray(selectedKeys) || selectedKeys.length === 0) {
        return "";
    }

    const labels = selectedKeys
        .filter((key): key is string => typeof key === "string")
        .map((key) => {
            const option = question.options.find((o) => o.key === key);
            return option?.label ?? key;
        });

    const otherDetails = answers["other_details"];
    if (
        typeof otherDetails === "object" &&
        otherDetails !== null &&
        "text" in otherDetails &&
        typeof otherDetails.text === "string" &&
        otherDetails.text.trim().length > 0
    ) {
        labels.push(`Other: ${otherDetails.text.trim()}`);
    }

    return labels.join(" | ");
}

/**
 * Convert one scale option into the workbook-style label shown in exports.
 *
 * @param option Question or guidance scale option.
 * @returns Label followed by bracketed score notation.
 */
function formatOptionScoreLabel(option: QuestionScale["options"][number]): string {
    const scoreText = formatScaleScoreText(option);
    const label = stripPromptMarkup(option.label);
    return scoreText.length === 0 ? label : `${label} (${scoreText})`;
}

/**
 * Format one option's addition/boost score pair for export display.
 *
 * @param option Question or guidance scale option.
 * @returns Compact score text for use inside brackets.
 */
function formatScaleScoreText(option: QuestionScale["options"][number]): string {
    const additionText = formatNumericCell(option.addition_value);
    const boostText = formatNumericCell(option.boost_value);
    return additionText === boostText ? additionText : `${additionText}, ${boostText}`;
}

/**
 * Convert the audit status enum into readable export text.
 *
 * @param status Submitted audit status value.
 * @returns Human-readable audit status.
 */
function formatAuditStatusLabel(status: AuditStatus): string {
    switch (status) {
        case "IN_PROGRESS":
            return "In progress";
        case "PAUSED":
            return "Paused";
        case "SUBMITTED":
            return "Submitted";
        default:
            return status;
    }
}

/**
 * Resolve the chosen execution mode into the localized prompt text.
 *
 * @param auditSession Submitted audit session.
 * @param instrument Localized PVUA instrument.
 * @returns Human-readable execution mode label.
 */
function formatExecutionModeLabel(auditSession: AuditSession, instrument: PlayspaceInstrument): string {
    const executionMode = resolveExecutionMode(auditSession);
    if (executionMode === null) {
        return "";
    }

    const matchedMode = instrument.execution_modes.find((mode) => mode.key === executionMode);
    return matchedMode === undefined ? formatQuestionModeLabel(executionMode) : matchedMode.label;
}

/**
 * Format locality values without exposing backend-only identifiers.
 *
 * @param context Optional place-level export context.
 * @returns Joined city/province/country label.
 */
function formatLocality(context: AuditExportContext | null): string {
    if (context === null) {
        return "";
    }

    return [context.city, context.province, context.country]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(", ");
}

/**
 * Join display values for pre-audit answers while removing empty fragments.
 *
 * @param values Readable value labels.
 * @returns Single printable response string.
 */
function joinDisplayValues(values: readonly string[]): string {
    return values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .join(" | ");
}

/**
 * Build a workbook-style response table for a single audit.
 *
 * @param exportableAudit Submitted audit with optional place context.
 * @param instrument Static PVUA instrument definition.
 * @returns Detail table matching the workbook-like export format.
 */
function buildResponsesTable(exportableAudit: ExportableAudit, instrument: PlayspaceInstrument): WorkbookTable {
    return {
        name: "Responses",
        title: "PVUA Response Matrix",
        columnWidths: SINGLE_RESPONSE_COLUMN_WIDTHS,
        rows: [SINGLE_RESPONSE_HEADERS, ...buildSingleAuditResponseRows(exportableAudit, instrument)],
    };
}

/**
 * Build a workbook-style response table across multiple audits.
 *
 * @param exportableAudits Submitted audits with optional place context.
 * @param instrument Static PVUA instrument definition.
 * @returns Detail table matching the workbook-like export format.
 */
function buildBulkResponsesTable(
    exportableAudits: readonly ExportableAudit[],
    instrument: PlayspaceInstrument,
): WorkbookTable {
    return {
        name: "Responses",
        title: "PVUA Response Matrix",
        columnWidths: BULK_RESPONSE_COLUMN_WIDTHS,
        rows: [SINGLE_RESPONSE_HEADERS, ...buildBulkAuditResponseRows(exportableAudits, instrument)],
    };
}

/**
 * Decide whether a question should appear in the export for the chosen mode.
 *
 * @param question Instrument question definition.
 * @param executionMode Effective execution mode.
 * @param sectionResponses Current section answers used for display rules.
 * @returns Whether the question is visible for the audit.
 */
function isQuestionVisible(
    question: InstrumentQuestion,
    executionMode: ExecutionMode | null,
    sectionResponses: Record<string, QuestionResponsePayload>,
): boolean {
    if (executionMode !== null && question.mode !== "both" && question.mode !== executionMode) {
        return false;
    }

    if (question.display_if === null || question.display_if === undefined) {
        return true;
    }

    const parentAnswers = sectionResponses[question.display_if.question_key];
    if (parentAnswers === undefined) {
        return false;
    }

    const selectedValue = parentAnswers[question.display_if.response_key];
    if (typeof selectedValue === "string") {
        return question.display_if.any_of_option_keys.includes(selectedValue);
    }

    if (Array.isArray(selectedValue)) {
        return selectedValue.some((entry) => {
            return typeof entry === "string" && question.display_if?.any_of_option_keys.includes(entry);
        });
    }

    return false;
}

/**
 * Resolve the effective execution mode for exports.
 *
 * @param auditSession Current audit session.
 * @returns Effective execution mode or null when missing.
 */
function resolveExecutionMode(auditSession: AuditSession): ExecutionMode | null {
    return auditSession.selected_execution_mode ?? auditSession.meta.execution_mode;
}

/**
 * Read pre-audit values for one instrument question in export order.
 *
 * @param auditSession Current audit session.
 * @param question Pre-audit question definition.
 * @returns Raw selected ids or derived values.
 */
function readPreAuditQuestionValues(
    auditSession: AuditSession,
    auditorProfile: ExportAuditorProfile | null,
    question: PreAuditQuestion,
): readonly string[] {
    switch (question.key) {
        case "auditor_code":
            return [auditorProfile?.auditorCode ?? ""];
        case "audit_date":
            return [formatDateForDisplay(auditSession.started_at)];
        case "started_at":
            return [formatTimestampForDisplay(auditSession.started_at)];
        case "submitted_at":
            return [formatTimestampForDisplay(auditSession.submitted_at)];
        case "total_minutes":
            return [auditSession.total_minutes?.toString() ?? "Pending"];
        case "place_size":
            return auditSession.pre_audit.place_size === null ? [] : [auditSession.pre_audit.place_size];
        case "current_users_0_5":
            return auditSession.pre_audit.current_users_0_5 === null ? [] : [auditSession.pre_audit.current_users_0_5];
        case "current_users_6_12":
            return auditSession.pre_audit.current_users_6_12 === null
                ? []
                : [auditSession.pre_audit.current_users_6_12];
        case "current_users_13_17":
            return auditSession.pre_audit.current_users_13_17 === null
                ? []
                : [auditSession.pre_audit.current_users_13_17];
        case "current_users_18_plus":
            return auditSession.pre_audit.current_users_18_plus === null
                ? []
                : [auditSession.pre_audit.current_users_18_plus];
        case "playspace_busyness":
            return auditSession.pre_audit.playspace_busyness === null
                ? []
                : [auditSession.pre_audit.playspace_busyness];
        case "season":
            return auditSession.pre_audit.season === null ? [] : [auditSession.pre_audit.season];
        case "weather_conditions":
            return auditSession.pre_audit.weather_conditions;
        case "wind_conditions":
            return auditSession.pre_audit.wind_conditions === null ? [] : [auditSession.pre_audit.wind_conditions];
        default:
            return [];
    }
}

/**
 * Resolve raw pre-audit ids into readable labels when options exist.
 *
 * @param question Pre-audit question definition.
 * @param rawValues Raw selected ids or derived values.
 * @returns Readable display labels.
 */
function resolvePreAuditDisplayValues(question: PreAuditQuestion, rawValues: readonly string[]): readonly string[] {
    if (question.options.length === 0) {
        return rawValues;
    }

    return rawValues.map((rawValue) => {
        const option = question.options.find((currentOption) => currentOption.key === rawValue);
        return option?.label ?? rawValue;
    });
}

/**
 * Derive the compact summary score shown in current list views.
 *
 * @param auditSession Current audit session.
 * @returns Numeric summary score or an empty string when not available.
 */
function deriveSummaryScore(auditSession: AuditSession): number | string {
    const overall = auditSession.scores.overall;
    if (overall === null) {
        return "Pending";
    }
    return roundToTwoDecimals(overall.play_value_total + overall.usability_total);
}

/**
 * Generate the requested file format and open the mobile share sheet.
 *
 * @param workbook Workbook-style tables to export.
 * @param format Target file format.
 * @returns Shared file name for user feedback.
 */
async function shareWorkbookPayload(
    workbook: WorkbookPayload,
    format: AuditExportFormat,
    colors: DesignSystemTheme["colors"],
): Promise<string> {
    switch (format) {
        case "csv":
            return await shareCsvWorkbook(workbook);
        case "pdf":
            return await sharePdfWorkbook(workbook, colors);
        case "xlsx":
            return await shareXlsxWorkbook(workbook, colors);
        default:
            throw new Error("Unsupported export format.");
    }
}

/**
 * Helper to convert hex and rgb/rgba to SheetJS format (FFFFFF).
 * Automatically blends rgba values with a white background to simulate opacity.
 */
function toSheetHex(colorValue: string): string {
    // 1. Handle Hex format (e.g., #FFFFFF, #FFF)
    if (colorValue.startsWith("#")) {
        let hex = colorValue.replace("#", "").toUpperCase();

        // Expand 3-digit and 4-digit hex shorthand
        if (hex.length === 3 || hex.length === 4) {
            hex = hex
                .split("")
                .map((char) => char + char)
                .join("");
        }

        // Return only the RGB part (first 6 characters)
        return hex.substring(0, 6);
    }

    // 2. Handle rgb() and rgba() formats
    const rgbMatch = colorValue.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)/i);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1] as string, 10);
        const g = parseInt(rgbMatch[2] as string, 10);
        const b = parseInt(rgbMatch[3] as string, 10);

        // Use provided alpha, or default to 1 (solid) if it's just rgb()
        const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4] as string) : 1;

        // Blend with a pure white background (255, 255, 255)
        const blendedR = Math.round((1 - a) * 255 + a * r);
        const blendedG = Math.round((1 - a) * 255 + a * g);
        const blendedB = Math.round((1 - a) * 255 + a * b);

        // Convert 0-255 numbers to 2-character hex strings
        const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0").toUpperCase();

        return `${toHex(blendedR)}${toHex(blendedG)}${toHex(blendedB)}`;
    }

    // 3. Fallback: strip non-alphanumeric characters and cap at 6 characters
    return colorValue
        .replace(/[^A-Fa-f0-9]/g, "")
        .toUpperCase()
        .substring(0, 6);
}

/**
 * Apply readable styles to one workbook sheet before export.
 *
 * @param sheet Mutable worksheet generated by SheetJS.
 * @param table Source table for row classification.
 */
function styleWorkbookSheet(sheet: XLSX.WorkSheet, table: WorkbookTable, colors: DesignSystemTheme["colors"]): void {
    const ref = sheet["!ref"];
    if (typeof ref !== "string" || ref.length === 0) {
        return;
    }

    const range = XLSX.utils.decode_range(ref);

    const headerFill = { patternType: "solid", fgColor: { rgb: "1F2937" } };
    const headerTextColor = { rgb: "FFFFFF" };
    const sectionFill = { patternType: "solid", fgColor: { rgb: "E2E8F0" } };
    const summaryFill = { patternType: "solid", fgColor: { rgb: "FEF3C7" } };
    const altRowFill = { patternType: "solid", fgColor: { rgb: "F8FAFC" } };

    const heavyBorder = { style: "medium", color: { rgb: "94A3B8" } };
    const lightBorder = { style: "thin", color: { rgb: "E2E8F0" } };

    const isResponsesTable = table.name === "Responses";

    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
        const row = table.rows[rowIndex];
        if (row === undefined) continue;

        const isHeaderRow = rowIndex === 0;
        const isSummaryRow = row[2] === "Summary";
        const isSectionHeaderRow =
            !isHeaderRow && typeof row[0] === "string" && /^\d+$/u.test(row[0]) && row[1] === "" && row[2] === "";

        const isEvenRow = rowIndex % 2 === 0;

        for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
            const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
            const cell = sheet[address] as XLSX.CellObject | undefined;
            if (cell === undefined) continue;

            const baseStyle = {
                alignment: { vertical: "top", wrapText: true, horizontal: colIndex >= 7 ? "right" : "left" },
                font: { name: "Arial", sz: 10, color: { rgb: "334155" } },
                border: { bottom: lightBorder, right: lightBorder, top: undefined as never, left: undefined as never },
            };

            if (isHeaderRow) {
                cell.s = {
                    ...baseStyle,
                    fill: headerFill,
                    font: { ...baseStyle.font, bold: true, color: headerTextColor, sz: 11 },
                    alignment: { ...baseStyle.alignment, horizontal: "center", vertical: "center" },
                    border: { bottom: heavyBorder, right: lightBorder },
                };
            } else if (isSectionHeaderRow) {
                cell.s = {
                    ...baseStyle,
                    fill: sectionFill,
                    font: { ...baseStyle.font, bold: true, color: { rgb: "0F172A" } },
                    border: { bottom: heavyBorder, top: heavyBorder },
                };
            } else if (isSummaryRow) {
                cell.s = {
                    ...baseStyle,
                    fill: summaryFill,
                    font: { ...baseStyle.font, bold: true, color: { rgb: "92400E" } },
                    border: { bottom: heavyBorder, top: lightBorder },
                };
            } else {
                cell.s = { ...baseStyle, fill: isEvenRow ? altRowFill : { patternType: "none" } };
            }

            if (isResponsesTable && !isSectionHeaderRow && !isSummaryRow) {
                let scaleKey: string | null = null;

                if (colIndex === 7) scaleKey = "provision";
                else if (colIndex === 8) scaleKey = "diversity";
                else if (colIndex === 9) scaleKey = "sociability";
                else if (colIndex === 10) scaleKey = "challenge";

                if (scaleKey !== null) {
                    const softHex = toSheetHex(getScaleSoftColor(scaleKey, colors));
                    const borderHex = toSheetHex(getScaleAccentColor(scaleKey, colors));
                    cell.s = {
                        ...cell.s,
                        fill: { patternType: "solid", fgColor: { rgb: softHex } },
                        border: {
                            ...cell.s.border,
                            left: { style: "medium", color: { rgb: borderHex } },
                            right: { style: "medium", color: { rgb: borderHex } },
                        },
                    };

                    if (isHeaderRow) {
                        cell.s.font.color = { rgb: "0F172A" };
                        cell.s.border.bottom = heavyBorder;
                    }
                }
            }
        }
    }

    // Apply dynamic row heights
    sheet["!rows"] = table.rows.map((row, rowIndex) => {
        const isHeaderRow = rowIndex === 0;
        const isSummaryRow = row[2] === "Summary";
        const isSectionHeaderRow =
            !isHeaderRow && typeof row[0] === "string" && /^\d+$/u.test(row[0]) && row[1] === "" && row[2] === "";

        let maxLines = 1;

        for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const cellText = String(row[colIndex] ?? "");
            const colWidth = sheet["!cols"]?.[colIndex]?.wch || 20;
            const explicitLines = cellText.split("\n").length;
            const wrappedLines = Math.ceil(cellText.length / colWidth);
            maxLines = Math.max(maxLines, explicitLines, wrappedLines);
        }

        const calculatedHeight = maxLines * 14 + 8;

        if (isHeaderRow) return { hpt: Math.max(28, calculatedHeight) };
        if (isSectionHeaderRow) return { hpt: Math.max(26, calculatedHeight) };
        if (isSummaryRow) return { hpt: Math.max(24, calculatedHeight) };
        return { hpt: Math.max(20, calculatedHeight) };
    });
}

/**
 * Write the workbook response table as CSV and share it.
 *
 * @param workbook Workbook-style tables to export.
 * @returns Shared file name for user feedback.
 */
async function shareCsvWorkbook(workbook: WorkbookPayload): Promise<string> {
    const fileName = `${workbook.fileBaseName}.csv`;
    const fileUri = buildCacheFileUri(fileName);
    const csvContent = buildWorkbookCsvText(workbook);
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
    });
    await shareLocalFile(fileUri, fileName, CSV_MIME_TYPE, CSV_UTI);
    return fileName;
}

/**
 * Scans a table's data to determine the maximum width needed for each column.
 *
 * @param rows Table rows to analyze.
 * @returns Array of column widths with dynamic sizing.
 */
function calculateDynamicColumnWidths(rows: readonly SpreadsheetRow[]): { wch: number }[] {
    const maxWidths: number[] = [];
    const MIN_WIDTH = 12;
    const MAX_WIDTH = 60;

    for (const row of rows) {
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const cellText = String(row[colIndex] ?? "");
            const longestLine = cellText.split("\n").reduce((max, line) => Math.max(max, line.length), 0);
            const estimatedWidth = longestLine + 2;

            if (!maxWidths[colIndex] || (maxWidths[colIndex] !== undefined && estimatedWidth > maxWidths[colIndex]!)) {
                maxWidths[colIndex] = Math.min(Math.max(estimatedWidth, MIN_WIDTH), MAX_WIDTH);
            }
        }
    }

    return maxWidths.map((width) => ({ wch: width }));
}

/**
 * Write the workbook as XLSX and share it.
 *
 * @param workbook Workbook-style tables to export.
 * @param colors Design system colors.
 * @returns Shared file name for user feedback.
 */
async function shareXlsxWorkbook(workbook: WorkbookPayload, colors: DesignSystemTheme["colors"]): Promise<string> {
    const excelWorkbook = XLSX.utils.book_new();
    for (const table of workbook.tables) {
        const sheet = XLSX.utils.aoa_to_sheet(table.rows.map((row) => [...row]));

        // Apply dynamic widths
        sheet["!cols"] = calculateDynamicColumnWidths(table.rows);

        styleWorkbookSheet(sheet, table, colors);
        XLSX.utils.book_append_sheet(excelWorkbook, sheet, sanitizeSheetName(table.name));
    }

    const fileName = `${workbook.fileBaseName}.xlsx`;
    const fileUri = buildCacheFileUri(fileName);
    const workbookBase64 = XLSX.write(excelWorkbook, {
        type: "base64",
        bookType: "xlsx",
        cellStyles: true,
    });
    await FileSystem.writeAsStringAsync(fileUri, workbookBase64, {
        encoding: FileSystem.EncodingType.Base64,
    });
    await shareLocalFile(fileUri, fileName, XLSX_MIME_TYPE, XLSX_UTI);
    return fileName;
}

/**
 * Render the workbook to PDF, save it, and share it.
 *
 * @param workbook Workbook-style tables to export.
 * @returns Shared file name for user feedback.
 */
async function sharePdfWorkbook(workbook: WorkbookPayload, colors: DesignSystemTheme["colors"]): Promise<string> {
    const html = buildWorkbookHtml(workbook, colors);
    const printResult = await Print.printToFileAsync({
        html,
    });
    const fileName = `${workbook.fileBaseName}.pdf`;
    const fileUri = buildCacheFileUri(fileName);
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    await FileSystem.moveAsync({
        from: printResult.uri,
        to: fileUri,
    });
    await shareLocalFile(fileUri, fileName, PDF_MIME_TYPE, PDF_UTI);
    return fileName;
}

/**
 * Share one local file through the platform share sheet.
 *
 * @param fileUri Generated local file URI.
 * @param fileName Shared file name used for dialog copy.
 * @param mimeType MIME type for Android/web.
 * @param uti Uniform type identifier for iOS.
 */
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

/**
 * Build one cache URI for a generated export file.
 *
 * @param fileName File name with extension.
 * @returns Writable cache URI.
 */
function buildCacheFileUri(fileName: string): string {
    if (typeof FileSystem.cacheDirectory !== "string" || FileSystem.cacheDirectory.length === 0) {
        throw new Error("The export cache directory is unavailable on this device.");
    }
    return `${FileSystem.cacheDirectory}${fileName}`;
}

/**
 * Convert a workbook payload into styled HTML for PDF export.
 *
 * @param workbook Workbook-style tables to export.
 * @returns Printable HTML document.
 */
function buildWorkbookHtml(workbook: WorkbookPayload, colors: DesignSystemTheme["colors"]): string {
    const renderedTables = workbook.tables
        .map((table, index) => {
            const pageBreakClass = index === 0 ? "" : "page-break";
            const landscapeClass = index === workbook.tables.length - 1 ? "wide-page" : "";
            return [
                `<section class="${landscapeClass} ${pageBreakClass}">`,
                `<h2>${escapeHtml(table.title)}</h2>`,
                renderHtmlTable(table.rows, table.name),
                "</section>",
            ].join("");
        })
        .join("");

    return [
        "<!doctype html>",
        "<html>",
        "<head>",
        '<meta charset="utf-8" />',
        `<title>${escapeHtml(workbook.title)}</title>`,
        "<style>",
        "@page { size: portrait; margin: 15mm; }",
        "@page wide-page { size: landscape; margin: 15mm; }",
        ":root { ",
        "  --primary: #2563eb; ",
        "  --text-main: #1f2937; ",
        "  --text-muted: #6b7280; ",
        "  --bg-alt: #f8fafc; ",
        "  --border: #e2e8f0; ",
        /* Semantic Scale Colors directly from theme */
        `  --scale-provision-soft: ${getScaleSoftColor("provision", colors)}; --scale-provision-border: ${getScaleAccentColor("provision", colors)}; `,
        `  --scale-diversity-soft: ${getScaleSoftColor("diversity", colors)}; --scale-diversity-border: ${getScaleAccentColor("diversity", colors)}; `,
        `  --scale-sociability-soft: ${getScaleSoftColor("sociability", colors)}; --scale-sociability-border: ${getScaleAccentColor("sociability", colors)}; `,
        `  --scale-challenge-soft: ${getScaleSoftColor("challenge", colors)}; --scale-challenge-border: ${getScaleAccentColor("challenge", colors)}; `,
        "}",
        "body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--text-main); padding: 0; margin: 0; font-size: 10px; font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased; }",
        ".report-header { border-bottom: 3px solid var(--primary); padding-bottom: 16px; margin-bottom: 32px; }",
        "h1 { margin-top: 8px; margin-bottom: 8px; font-size: 26px; font-weight: 700; letter-spacing: 1px; color: #111827; }",
        "p.meta { margin: 0; color: var(--text-muted); font-size: 12px; }",
        "h2 { margin: 32px 0 12px; padding-top: 16px; padding-bottom: 12px; font-size: 14px; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid var(--border); padding-bottom: 6px; }",

        /* Auto layout allows browser to size dynamically based on content */
        "table { width: 100%; border-collapse: collapse; margin-bottom: 24px; table-layout: auto; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }",
        "thead th { background: #f1f5f9; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); border-right: 1px solid var(--border); }",
        "th, td { padding: 8px 10px; vertical-align: top; text-align: left; overflow-wrap: break-word; word-break: normal; white-space: pre-wrap; line-height: 1.4; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }",
        "th:last-child, td:last-child { border-right: none; }",
        "tbody tr:last-child td",
        "tbody tr:nth-child(even) td { background: var(--bg-alt); }",

        /* Scale Column Highlights */
        "table[data-table-name='Responses'] th:nth-child(8), table[data-table-name='Responses'] td:nth-child(8) { background: var(--scale-provision-soft); background-color: var(--scale-provision-soft); border-left: 2px solid var(--scale-provision-border); border-right: 2px solid var(--scale-provision-border); }",
        "table[data-table-name='Responses'] th:nth-child(9), table[data-table-name='Responses'] td:nth-child(9) { background: var(--scale-diversity-soft); background-color: var(--scale-diversity-soft); border-left: 2px solid var(--scale-diversity-border); border-right: 2px solid var(--scale-diversity-border); }",
        "table[data-table-name='Responses'] th:nth-child(10), table[data-table-name='Responses'] td:nth-child(10) { background: var(--scale-challenge-soft); background-color: var(--scale-challenge-soft); border-left: 2px solid var(--scale-challenge-border); border-right: 2px solid var(--scale-challenge-border); }",
        "table[data-table-name='Responses'] th:nth-child(11), table[data-table-name='Responses'] td:nth-child(11) { background: var(--scale-sociability-soft); background-color: var(--scale-sociability-soft); border-left: 2px solid var(--scale-sociability-border); border-right: 2px solid var(--scale-sociability-border); }",

        ".page-break { page-break-before: always; margin-top: 32px; }",
        "</style>",
        "</head>",
        "<body>",
        '<div class="report-header">',
        `<h1>${escapeHtml(workbook.title)}</h1>`,
        '<p class="meta">PVUA export generated from the current instrument and submitted audit data.</p>',
        "</div>",
        renderedTables,
        "</body>",
        "</html>",
    ].join("");
}

/**
 * Render one spreadsheet-like table as HTML.
 *
 * @param rows Table rows including a header row.
 * @param tableName Name of the table to attach as a data attribute.
 * @returns HTML table markup.
 */
function renderHtmlTable(rows: readonly SpreadsheetRow[], tableName: string): string {
    const [headerRow, ...bodyRows] = rows;
    const headerHtml = (headerRow ?? []).map((cell) => `<th>${escapeHtml(cell)}</th>`).join("");
    const bodyHtml = bodyRows
        .map((row) => {
            const cells = row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("");
            return `<tr>${cells}</tr>`;
        })
        .join("");

    return [
        `<table data-table-name="${escapeHtml(tableName)}">`,
        `<thead><tr>${headerHtml}</tr></thead>`,
        `<tbody>${bodyHtml}</tbody>`,
        "</table>",
    ].join("");
}

/**
 * Serialize spreadsheet rows into CSV text.
 *
 * @param rows Table rows including a header row.
 * @returns RFC-4180-style CSV content.
 */
function buildCsvText(rows: readonly SpreadsheetRow[]): string {
    return rows
        .map((row) =>
            row
                .map((cell) => {
                    const text = stringifyCell(cell);
                    const escapedText = text.replaceAll('"', '""');
                    return `"${escapedText}"`;
                })
                .join(","),
        )
        .join("\n");
}

/**
 * Serialize every workbook table into one CSV document, separated by blank rows.
 *
 * @param workbook Workbook payload with one or more logical tables.
 * @returns CSV content that preserves every export section.
 */
function buildWorkbookCsvText(workbook: WorkbookPayload): string {
    const rows: SpreadsheetRow[] = workbook.tables.flatMap((table, tableIndex) => {
        const tableSeparatorRows: SpreadsheetRow[] = tableIndex > 0 ? [[], []] : [];
        return [...tableSeparatorRows, [table.title], [], ...table.rows];
    });

    return buildCsvText(rows);
}

/**
 * Convert spreadsheet cells into printable strings.
 *
 * @param row One spreadsheet row.
 * @returns Stringified cells.
 */
function spreadsheetRowToStrings(row: readonly SpreadsheetCell[]): readonly string[] {
    return row.map((cell) => stringifyCell(cell));
}

/**
 * Convert one spreadsheet cell into a printable string.
 *
 * @param cell Spreadsheet cell.
 * @returns Stable string form.
 */
function stringifyCell(cell: SpreadsheetCell): string {
    return typeof cell === "number" ? formatNumericCell(cell) : cell;
}

/**
 * Format numeric cells with integer preservation and compact decimals.
 *
 * @param value Numeric spreadsheet value.
 * @returns Readable text representation.
 */
function formatNumericCell(value: number): string {
    return Number.isInteger(value) ? value.toString() : roundToTwoDecimals(value).toString();
}

/**
 * Escape values before inserting them into HTML.
 *
 * @param value Cell or title value.
 * @returns HTML-safe string.
 */
function escapeHtml(value: SpreadsheetCell): string {
    return stringifyCell(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/**
 * Remove bold markers used by the mobile UI from exported prompts.
 *
 * @param value Prompt string from the instrument bundle.
 * @returns Plain-text prompt suitable for exports.
 */
function stripPromptMarkup(value: string): string {
    return value.replaceAll("**", "").trim();
}

/**
 * Build a filesystem-safe slug from one audit code segment.
 *
 * @param value Raw audit code.
 * @returns Slug safe for export file names.
 */
function slugifySegment(value: string): string {
    const normalized = value
        .trim()
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-+|-+$/g, "");
    return normalized.length === 0 ? "audit" : normalized;
}

/**
 * Limit workbook sheet names to the Excel-safe subset.
 *
 * @param value Proposed sheet name.
 * @returns Sanitized sheet name.
 */
function sanitizeSheetName(value: string): string {
    let sanitized = value.trim();
    for (const invalidCharacter of INVALID_SHEET_NAME_CHARACTERS) {
        sanitized = sanitized.replaceAll(invalidCharacter, "_");
    }

    if (sanitized.length === 0) {
        return "Sheet";
    }
    return sanitized.slice(0, 31);
}

/**
 * Format an ISO timestamp for audit export display.
 *
 * @param value ISO timestamp string or null.
 * @returns Readable UTC timestamp string.
 */
function formatTimestampForDisplay(value: string | null): string {
    if (typeof value !== "string" || value.trim().length === 0) {
        return "";
    }
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }
    return `${parsedDate.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/**
 * Format an ISO timestamp as a date-only field.
 *
 * @param value ISO timestamp string.
 * @returns Date portion of the timestamp.
 */
function formatDateForDisplay(value: string): string {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }
    return parsedDate.toISOString().slice(0, 10);
}

/**
 * Format a `Date` for file-name usage.
 *
 * @param value JavaScript date instance.
 * @returns Compact timestamp segment.
 */
function formatTimestampForFile(value: Date): string {
    return value.toISOString().replaceAll("-", "").replaceAll(":", "").slice(0, 15);
}

/**
 * Round to two decimal places.
 *
 * @param value Numeric value to round.
 * @returns Rounded value.
 */
function roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
}
