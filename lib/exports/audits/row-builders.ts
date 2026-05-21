import type {
    AuditSession,
    InstrumentQuestion,
    PlayspaceInstrument,
    PreAuditQuestion,
    QuestionResponsePayload,
} from "lib/audit/types";

import {
    formatChecklistAnswer,
    formatConstructLabel,
    formatExecutionModeLabel,
    formatLocality,
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
} from "lib/exports/reports/format-utils";
import { isQuestionVisible } from "lib/exports/reports/row-builders";
import type { ExportAuditorProfile, SpreadsheetRow, WorkbookPayload, WorkbookTable } from "lib/exports/reports/types";

import {
    COMMENT_ROW_SENTINEL,
    IN_PROGRESS_OVERVIEW_COLUMN_WIDTHS,
    IN_PROGRESS_PRE_AUDIT_COLUMN_WIDTHS,
    IN_PROGRESS_RESPONSE_COLUMN_WIDTHS,
    IN_PROGRESS_RESPONSE_HEADERS,
    IN_PROGRESS_SPACE_AUDIT_COLUMN_WIDTHS,
    PENDING_PLACEHOLDER,
    SECTION_NOTE_RESPONSE_SENTINEL,
    SECTION_NOTE_SENTINEL,
    type InProgressExportableAudit,
} from "./types";

/** Convert one in-progress audit into workbook-style sheets. */
export function buildInProgressAuditWorkbook(
    exportableAudit: InProgressExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookPayload {
    const auditCodeSegment = slugifySegment(exportableAudit.auditSession.audit_code);
    const projectSegment = slugifySegment(exportableAudit.auditSession.project_name);
    const tables: WorkbookTable[] = [
        buildOverviewTable(exportableAudit, instrument),
        buildPreAuditTable(exportableAudit, instrument),
    ];

    const spaceAuditTable = buildSpaceAuditTable(exportableAudit, instrument);
    if (spaceAuditTable !== null) {
        tables.push(spaceAuditTable);
    }

    tables.push(buildResponsesTable(exportableAudit, instrument));

    return {
        fileBaseName: `pvua-in-progress-${projectSegment}-${auditCodeSegment}`,
        title: `${instrument.instrument_name} In-Progress Export - ${exportableAudit.auditSession.audit_code}`,
        tables,
    };
}

/** Builds the row set for the Overview worksheet. */
export function buildInProgressOverviewRows(
    exportableAudit: InProgressExportableAudit,
    instrument: PlayspaceInstrument,
): readonly SpreadsheetRow[] {
    const { auditSession, context, auditorProfile } = exportableAudit;
    const progress = auditSession.progress;
    const answeredLabel = `${progress.answered_visible_questions} of ${progress.total_visible_questions}`;
    const sectionsLabel = `${progress.completed_section_count} of ${progress.visible_section_count}`;
    const executionModeLabel = formatExecutionModeLabel(auditSession, instrument);

    return [
        ["Field", "Value"],
        ["Instrument", `${instrument.instrument_name} v${instrument.instrument_version}`],
        ["Audit Code", auditSession.audit_code],
        ["Place Name", auditSession.place_name],
        ["Project Name", auditSession.project_name],
        ["Locality", formatLocality(context)],
        ["Status", formatInProgressStatusLabel(auditSession)],
        ["Execution Mode", executionModeLabel.length > 0 ? executionModeLabel : PENDING_PLACEHOLDER],
        ["Started At", formatTimestampForDisplay(auditSession.started_at) || PENDING_PLACEHOLDER],
        ["Questions Answered", answeredLabel],
        ["Sections Completed", sectionsLabel],
        ["Auditor Code", auditorProfile?.auditorCode ?? ""],
        ["Auditor Country", auditorProfile?.country ?? ""],
        ["Auditor Gender", auditorProfile?.gender ?? ""],
        ["Auditor Age", auditorProfile?.ageRange ?? ""],
        ["Auditor Role", auditorProfile?.role ?? ""],
    ];
}

/** Build the full set of response rows (header row excluded) for an in-progress audit. */
export function buildInProgressAuditResponseRows(
    exportableAudit: InProgressExportableAudit,
    instrument: PlayspaceInstrument,
): readonly SpreadsheetRow[] {
    const { auditSession } = exportableAudit;
    const executionMode = resolveExecutionMode(auditSession);
    const rows: SpreadsheetRow[] = [];

    for (const [sectionIndex, section] of instrument.sections.entries()) {
        const sectionState = auditSession.sections[section.section_key];
        const sectionResponses = sectionState?.responses ?? {};
        const visibleQuestions = section.questions.filter((question) =>
            isQuestionVisible(question, executionMode, sectionResponses),
        );
        if (visibleQuestions.length === 0) {
            continue;
        }

        rows.push(buildSectionHeaderRow(sectionIndex, section.title, section.description, section.instruction));

        for (const [questionIndex, question] of visibleQuestions.entries()) {
            const questionAnswers = sectionResponses[question.question_key] ?? {};
            rows.push(buildQuestionResponseRow(sectionIndex, questionIndex, question, questionAnswers));

            const questionComment =
                typeof questionAnswers.question_note === "string" ? questionAnswers.question_note.trim() : "";
            if (questionComment.length > 0) {
                rows.push(
                    buildQuestionCommentRow(
                        questionComment,
                        formatQuestionKeyForDisplay(question.question_key, `${sectionIndex + 1}.${questionIndex + 1}`),
                    ),
                );
            }
        }

        const sectionNote = sectionState?.note ?? "";
        const notesPrompt = typeof section.notes_prompt === "string" ? stripPromptMarkup(section.notes_prompt) : "";

        if (notesPrompt.length > 0 || sectionNote.trim().length > 0) {
            rows.push(...buildSectionNoteRows(notesPrompt, sectionNote));
        }
    }

    return rows;
}

function buildOverviewTable(
    exportableAudit: InProgressExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    return {
        name: "Overview",
        title: "Audit Overview",
        columnWidths: IN_PROGRESS_OVERVIEW_COLUMN_WIDTHS,
        rows: buildInProgressOverviewRows(exportableAudit, instrument),
    };
}

function buildPreAuditTable(
    exportableAudit: InProgressExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    const auditInfoQuestions = instrument.pre_audit_questions.filter((question) => question.page_key === "audit_info");
    const { auditSession, auditorProfile } = exportableAudit;
    return {
        name: "PreAudit",
        title: "Pre-Audit",
        columnWidths: IN_PROGRESS_PRE_AUDIT_COLUMN_WIDTHS,
        rows: [
            ["Question", "Recorded Answer"],
            ...auditInfoQuestions.map((question) => buildPreAuditRow(auditSession, auditorProfile, question)),
        ],
    };
}

function buildSpaceAuditTable(
    exportableAudit: InProgressExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookTable | null {
    const spaceSetupQuestions = instrument.pre_audit_questions.filter(
        (question) => question.page_key === "space_setup",
    );
    if (spaceSetupQuestions.length === 0) {
        return null;
    }
    const { auditSession, auditorProfile } = exportableAudit;
    return {
        name: "SpaceAudit",
        title: "Space Audit Setup",
        columnWidths: IN_PROGRESS_SPACE_AUDIT_COLUMN_WIDTHS,
        rows: [
            ["Question", "Recorded Answer"],
            ...spaceSetupQuestions.map((question) => buildPreAuditRow(auditSession, auditorProfile, question)),
        ],
    };
}

function buildResponsesTable(
    exportableAudit: InProgressExportableAudit,
    instrument: PlayspaceInstrument,
): WorkbookTable {
    return {
        name: "Responses",
        title: "Recorded Responses",
        columnWidths: IN_PROGRESS_RESPONSE_COLUMN_WIDTHS,
        rows: [IN_PROGRESS_RESPONSE_HEADERS, ...buildInProgressAuditResponseRows(exportableAudit, instrument)],
    };
}

function buildPreAuditRow(
    auditSession: AuditSession,
    auditorProfile: ExportAuditorProfile | null,
    question: PreAuditQuestion,
): SpreadsheetRow {
    const displayValues = resolvePreAuditDisplayValues(
        question,
        readPreAuditQuestionValues(auditSession, auditorProfile, question),
    );
    return [question.label, joinDisplayValues(displayValues)];
}

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
        [typeof description === "string" ? stripPromptMarkup(description) : "", stripPromptMarkup(instruction)]
            .filter((value) => value.length > 0)
            .join("\n\n"),
        "",
        "",
        "",
        "",
    ];
}

function buildQuestionResponseRow(
    sectionIndex: number,
    questionIndex: number,
    question: InstrumentQuestion,
    answers: QuestionResponsePayload,
): SpreadsheetRow {
    const questionKey = formatQuestionKeyForDisplay(question.question_key, `${sectionIndex + 1}.${questionIndex + 1}`);
    const constructs = formatConstructLabel(question.constructs);
    const mode = formatQuestionModeLabel(question.mode);
    const domain = formatQuestionDomainLabel(question);
    const prompt = stripPromptMarkup(question.prompt);

    if (question.question_type === "checklist") {
        return [questionKey, mode, constructs, domain, prompt, formatChecklistAnswer(question, answers), "", "", ""];
    }

    return [
        questionKey,
        mode,
        constructs,
        domain,
        prompt,
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
    ];
}

function buildQuestionCommentRow(comment: string, questionKey: string): SpreadsheetRow {
    return [questionKey, COMMENT_ROW_SENTINEL, "", "", comment, "", "", "", ""];
}

function buildSectionNoteRows(notesPrompt: string, submittedComment: string): readonly SpreadsheetRow[] {
    const blank = ["", "", "", "", "", "", ""] as const;
    const rows: SpreadsheetRow[] = [];

    if (notesPrompt.length > 0) {
        rows.push([`Notes Prompt: ${notesPrompt}`, SECTION_NOTE_SENTINEL, ...blank]);
    }

    if (submittedComment.trim().length > 0) {
        rows.push([`Auditor Note: ${submittedComment.trim()}`, SECTION_NOTE_RESPONSE_SENTINEL, ...blank]);
    }

    return rows;
}

function formatInProgressStatusLabel(auditSession: AuditSession): string {
    switch (auditSession.status) {
        case "IN_PROGRESS":
            return "In progress";
        case "PAUSED":
            return "Paused";
        case "SUBMITTED":
            return "Submitted";
        default:
            return auditSession.status;
    }
}
