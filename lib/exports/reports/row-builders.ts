import {
    addScoreTotals,
    calculateQuestionScores,
    createEmptyScoreTotals,
    formatPercentage,
} from "lib/audit/score-helpers";
import type {
    AuditScoreTotals,
    AuditSession,
    InstrumentQuestion,
    PlayspaceInstrument,
    PreAuditQuestion,
    QuestionResponsePayload,
} from "lib/audit/types";

import {
    BULK_PRE_AUDIT_COLUMN_WIDTHS,
    BULK_RESPONSE_COLUMN_WIDTHS,
    BULK_SPACE_AUDIT_COLUMN_WIDTHS,
    COMMENT_ROW_SENTINEL,
    GUIDANCE_COLUMN_WIDTHS,
    OVERVIEW_COLUMN_WIDTHS,
    SCORE_ROW_SENTINEL,
    SECTION_NOTE_RESPONSE_SENTINEL,
    SECTION_NOTE_SENTINEL,
    SINGLE_PRE_AUDIT_COLUMN_WIDTHS,
    SINGLE_RESPONSE_COLUMN_WIDTHS,
    SINGLE_RESPONSE_HEADERS,
    SINGLE_SPACE_AUDIT_COLUMN_WIDTHS,
    type ExportAuditorProfile,
    type ExportableAudit,
    type ScoreRowKind,
    type SpreadsheetRow,
    type WorkbookPayload,
    type WorkbookTable,
} from "./types";
import {
    deriveSummaryScore,
    formatAuditStatusLabel,
    formatChecklistAnswer,
    formatConstructLabel,
    formatExecutionModeLabel,
    formatLocality,
    formatOptionScoreLabel,
    formatQuestionAnswer,
    formatQuestionDomainLabel,
    formatQuestionKeyForDisplay,
    formatQuestionModeLabel,
    formatTimestampForDisplay,
    joinDisplayValues,
    questionDomainFallback,
    readPreAuditQuestionValues,
    resolveExecutionMode,
    resolvePreAuditDisplayValues,
    slugifySegment,
    stripPromptMarkup,
} from "./format-utils";

/** Convert one audit into workbook-style sheets. */
export function buildSingleAuditWorkbook(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookPayload {
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

/** Convert multiple audits into workbook-style sheets. */
export function buildBulkAuditWorkbook(
    exportableAudits: readonly ExportableAudit[],
    instrument: PlayspaceInstrument,
    auditorProfile: ExportAuditorProfile | null,
): WorkbookPayload {
    return {
        fileBaseName: `pvua-bulk-${new Date().toISOString().replaceAll("-", "").replaceAll(":", "").slice(0, 15)}`,
        title: `${instrument.instrument_name} Bulk Export`,
        tables: [
            buildBulkAuditOverviewTable(exportableAudits, auditorProfile, instrument),
            buildBulkAuditPreAuditTable(exportableAudits, auditorProfile, instrument),
            buildBulkAuditSpaceAuditTable(exportableAudits, auditorProfile, instrument),
            buildAuditGuidanceTable(instrument),
            buildBulkResponsesTable(exportableAudits, instrument),
        ],
    };
}

/** Builds the full row set for the Overview worksheet. */
export function buildOverviewRows(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
): readonly SpreadsheetRow[] {
    const { auditSession, context, auditorProfile } = exportableAudit;
    const overallScores = auditSession.scores.overall;

    return [
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
    ];
}

function buildSingleAuditOverviewTable(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    return {
        name: "Overview",
        title: "Audit Overview",
        columnWidths: OVERVIEW_COLUMN_WIDTHS,
        rows: buildOverviewRows(exportableAudit, instrument),
    };
}

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

function buildSingleAuditPreAuditTable(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    const auditInfoQuestions = instrument.pre_audit_questions.filter((question) => question.page_key === "audit_info");
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

function buildSingleAuditSpaceAuditTable(
    exportableAudit: ExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    const spaceSetupQuestions = instrument.pre_audit_questions.filter(
        (question) => question.page_key === "space_setup",
    );
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

function buildBulkAuditPreAuditTable(
    exportableAudits: readonly ExportableAudit[],
    auditorProfile: ExportAuditorProfile | null,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    const auditInfoQuestions = instrument.pre_audit_questions.filter((question) => question.page_key === "audit_info");
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

function buildBulkAuditSpaceAuditTable(
    exportableAudits: readonly ExportableAudit[],
    auditorProfile: ExportAuditorProfile | null,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    const spaceSetupQuestions = instrument.pre_audit_questions.filter(
        (question) => question.page_key === "space_setup",
    );
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
        context?.projectName ?? auditSession.project_name,
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

/** Builds the full row set for the PVUA Response Matrix. Header row is not included. */
export function buildSingleAuditResponseRows(
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

            const questionComment =
                typeof questionAnswers.question_note === "string" ? questionAnswers.question_note.trim() : "";
            if (questionComment.length > 0) {
                rows.push(
                    buildQuestionCommentRow(
                        sectionIndex,
                        questionIndex,
                        questionComment,
                        formatQuestionKeyForDisplay(question.question_key, `${sectionIndex + 1}.${questionIndex + 1}`),
                    ),
                );
            }

            sectionTotals = addScoreTotals(sectionTotals, questionScores);
        }

        const sectionNote = sectionState?.note ?? "";
        const notesPrompt = typeof section.notes_prompt === "string" ? stripPromptMarkup(section.notes_prompt) : "";

        if (notesPrompt.length > 0 || sectionNote.trim().length > 0) {
            rows.push(
                ...buildSectionNoteRow(
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

/** Build detailed PVUA-style response rows across multiple audits. */
export function buildBulkAuditResponseRows(
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

/** Produces the full-width section header row. */
export function buildSectionHeaderRow(
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
    ];
}

/** Produces the data row for a single question and its recorded answers. */
export function buildQuestionResponseRow(
    sectionIndex: number,
    questionIndex: number,
    question: InstrumentQuestion,
    answers: QuestionResponsePayload,
    questionScores: AuditScoreTotals,
): SpreadsheetRow {
    const questionKey = formatQuestionKeyForDisplay(question.question_key, `${sectionIndex + 1}.${questionIndex + 1}`);

    if (question.question_type === "checklist") {
        return [
            questionKey,
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
        ];
    }

    return [
        questionKey,
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
    ];
}

/** Produces a per-question auditor comment row. */
export function buildQuestionCommentRow(
    _sectionIndex: number,
    _questionIndex: number,
    comment: string,
    questionKey: string,
): SpreadsheetRow {
    return [questionKey, COMMENT_ROW_SENTINEL, "", "", "", "", comment, "", "", "", "", "", ""];
}

/** Produces one or two full-width banner rows for the section note block. */
export function buildSectionNoteRow(
    _sectionIndex: number,
    _noteIndex: number,
    _domainLabel: string,
    notesPrompt: string,
    submittedComment: string,
): readonly SpreadsheetRow[] {
    const blank = ["", "", "", "", "", "", "", "", "", "", ""] as const;
    const rows: SpreadsheetRow[] = [];

    if (notesPrompt.length > 0) {
        rows.push([`Notes Prompt: ${notesPrompt}`, SECTION_NOTE_SENTINEL, ...blank]);
    }

    if (submittedComment.trim().length > 0) {
        rows.push([`Auditor Note: ${submittedComment.trim()}`, SECTION_NOTE_RESPONSE_SENTINEL, ...blank]);
    }

    return rows;
}

/** Produces the three per-section summary rows. */
export function buildSectionSummaryRows(totals: AuditScoreTotals): readonly SpreadsheetRow[] {
    return [
        buildScoreSummaryRow("Total", "Raw Scores", totals, "raw"),
        buildScoreSummaryRow("Max", "Max Possible", totals, "maximum"),
        buildScoreSummaryRow("%", "Final Percentage", totals, "percentage"),
    ];
}

/** Produces the three overall summary rows appended at the end of the matrix. */
export function buildOverallSummaryRows(totals: AuditScoreTotals): readonly SpreadsheetRow[] {
    return [
        buildScoreSummaryRow("Overall Total", "Raw Scores", totals, "raw"),
        buildScoreSummaryRow("Overall Max", "Max Possible", totals, "maximum"),
        buildScoreSummaryRow("Overall %", "Final Percentage", totals, "percentage"),
    ];
}

/** Produces a single score summary row. */
export function buildScoreSummaryRow(
    idLabel: string,
    modeLabel: string,
    totals: AuditScoreTotals,
    rowKind: ScoreRowKind,
): SpreadsheetRow {
    const base = [idLabel, modeLabel, SCORE_ROW_SENTINEL, "", "", "", ""] as const;

    if (rowKind === "raw") {
        return [
            ...base,
            totals.provision_total,
            totals.diversity_total,
            totals.sociability_total,
            totals.challenge_total,
            totals.play_value_total,
            totals.usability_total,
        ];
    }

    if (rowKind === "maximum") {
        return [
            ...base,
            totals.provision_total_max,
            totals.diversity_total_max,
            totals.sociability_total_max,
            totals.challenge_total_max,
            totals.play_value_total_max,
            totals.usability_total_max,
        ];
    }

    return [
        ...base,
        formatPercentage(totals.provision_total, totals.provision_total_max),
        formatPercentage(totals.diversity_total, totals.diversity_total_max),
        formatPercentage(totals.sociability_total, totals.sociability_total_max),
        formatPercentage(totals.challenge_total, totals.challenge_total_max),
        formatPercentage(totals.play_value_total, totals.play_value_total_max),
        formatPercentage(totals.usability_total, totals.usability_total_max),
    ];
}

/** Produces a blank separator row. */
export function buildEmptyResponseRow(): SpreadsheetRow {
    return ["", "", "", "", "", "", "", "", "", "", "", "", ""];
}

/** Build a workbook-style response table for a single audit. */
export function buildResponsesTable(exportableAudit: ExportableAudit, instrument: PlayspaceInstrument): WorkbookTable {
    return {
        name: "Responses",
        title: "PVUA Response Matrix",
        columnWidths: SINGLE_RESPONSE_COLUMN_WIDTHS,
        rows: [SINGLE_RESPONSE_HEADERS, ...buildSingleAuditResponseRows(exportableAudit, instrument)],
    };
}

/** Build a workbook-style response table across multiple audits. */
export function buildBulkResponsesTable(
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

/** Decide whether a question should appear in the export for the chosen mode. */
export function isQuestionVisible(
    question: InstrumentQuestion,
    executionMode: ReturnType<typeof resolveExecutionMode>,
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
        return selectedValue.some(
            (entry) => typeof entry === "string" && question.display_if?.any_of_option_keys.includes(entry),
        );
    }

    return false;
}
