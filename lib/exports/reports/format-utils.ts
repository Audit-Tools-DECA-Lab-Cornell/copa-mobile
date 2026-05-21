import type {
    AuditSession,
    AuditStatus,
    ExecutionMode,
    InstrumentQuestion,
    PlayspaceInstrument,
    PreAuditQuestion,
    QuestionResponsePayload,
    QuestionScale,
} from "lib/audit/types";

import type { AuditExportContext, ExportAuditorProfile, SpreadsheetCell } from "./types";
import { INVALID_SHEET_NAME_CHARACTERS } from "./types";

/** Round to two decimal places. */
export function roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
}

/** Format numeric cells with integer preservation and compact decimals. */
export function formatNumericCell(value: number): string {
    return Number.isInteger(value) ? value.toString() : roundToTwoDecimals(value).toString();
}

/** Convert one spreadsheet cell into a printable string. */
export function stringifyCell(cell: SpreadsheetCell): string {
    return typeof cell === "number" ? formatNumericCell(cell) : cell;
}

/** Escape values before inserting them into HTML. */
export function escapeHtml(value: SpreadsheetCell): string {
    return stringifyCell(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/** Remove lightweight markdown markers used by the mobile UI from exported prompts. */
export function stripPromptMarkup(value: string): string {
    return value.replaceAll("**", "").trim();
}

/** Build a filesystem-safe slug from one audit code segment. */
export function slugifySegment(value: string): string {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return normalized.length === 0 ? "audit" : normalized;
}

/** Limit workbook sheet names to the Excel-safe subset. */
export function sanitizeSheetName(value: string): string {
    let sanitized = value.trim();
    for (const invalidCharacter of INVALID_SHEET_NAME_CHARACTERS) {
        sanitized = sanitized.replaceAll(invalidCharacter, "_");
    }

    if (sanitized.length === 0) {
        return "Sheet";
    }
    return sanitized.slice(0, 31);
}

/** Format an ISO timestamp for audit export display. */
export function formatTimestampForDisplay(value: string | null): string {
    if (typeof value !== "string" || value.trim().length === 0) {
        return "";
    }
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }
    return `${parsedDate.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** Format an ISO timestamp as a date-only field. */
export function formatDateForDisplay(value: string): string {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }
    return parsedDate.toISOString().slice(0, 10);
}

/** Format a `Date` for file-name usage. */
export function formatTimestampForFile(value: Date): string {
    return value.toISOString().replaceAll("-", "").replaceAll(":", "").slice(0, 15);
}

/** Format a question key in the export-friendly style used by the web exports. */
export function formatQuestionKeyForDisplay(questionKey: string, fallback = ""): string {
    const trimmed = questionKey.trim();
    if (trimmed.length === 0) return fallback;

    // Keep stable instrument identifiers, but make generated snake-case keys easier to scan.
    const cleaned = trimmed
        .replace(/^question[-_\s]*/iu, "")
        .replace(/^q[-_\s]*/iu, "")
        .replaceAll("_", ".")
        .replace(/\.{2,}/g, ".")
        .replace(/^\.+|\.+$/g, "");

    return cleaned.length > 0 ? cleaned : fallback || trimmed;
}

/** Format a human-readable execution-mode label for one export row. */
export function formatQuestionModeLabel(mode: ExecutionMode): string {
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

/** Format the construct column for one question row. */
export function formatConstructLabel(constructs: readonly InstrumentQuestion["constructs"][number][]): string {
    const uniqueConstructs = Array.from(new Set(constructs));
    if (uniqueConstructs.length === 0) {
        return "";
    }
    if (uniqueConstructs.length > 1) {
        return "Both";
    }
    return uniqueConstructs[0] === "play_value" ? "Play Value" : "Usability";
}

/** Normalize a domain-like label for export display. */
export function questionDomainFallback(value: string): string {
    return stripPromptMarkup(value).trim();
}

/** Format the domain column for one question row. */
export function formatQuestionDomainLabel(question: InstrumentQuestion): string {
    return question.domains.map((domain) => questionDomainFallback(domain)).join(" | ");
}

/** Convert one stored answer key into a readable label with score notation. */
export function formatQuestionAnswer(
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

/** Format a checklist question's selected options into a readable label. */
export function formatChecklistAnswer(question: InstrumentQuestion, answers: QuestionResponsePayload): string {
    const selectedKeys = answers.selected_option_keys;
    if (!Array.isArray(selectedKeys) || selectedKeys.length === 0) {
        return "";
    }

    const labels = selectedKeys
        .filter((key): key is string => typeof key === "string")
        .map((key) => {
            const option = question.options.find((currentOption) => currentOption.key === key);
            return option?.label ?? key;
        });

    const otherDetails = answers.other_details;
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

/** Convert one scale option into the workbook-style label shown in exports. */
export function formatOptionScoreLabel(option: QuestionScale["options"][number]): string {
    const scoreText = formatScaleScoreText(option);
    const label = stripPromptMarkup(option.label);
    return scoreText.length === 0 ? label : `${label} (${scoreText})`;
}

/** Format one option's addition/boost score pair for export display. */
export function formatScaleScoreText(option: QuestionScale["options"][number]): string {
    const additionText = formatNumericCell(option.addition_value);
    const boostText = formatNumericCell(option.boost_value);
    return additionText === boostText ? additionText : `${additionText}, ${boostText}`;
}

/** Convert the audit status enum into readable export text. */
export function formatAuditStatusLabel(status: AuditStatus): string {
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

/** Resolve the effective execution mode for exports. */
export function resolveExecutionMode(auditSession: AuditSession): ExecutionMode | null {
    return auditSession.selected_execution_mode ?? auditSession.meta.execution_mode;
}

/** Resolve the chosen execution mode into the localized prompt text. */
export function formatExecutionModeLabel(auditSession: AuditSession, instrument: PlayspaceInstrument): string {
    const executionMode = resolveExecutionMode(auditSession);
    if (executionMode === null) {
        return "";
    }

    const matchedMode = instrument.execution_modes.find((mode) => mode.key === executionMode);
    return matchedMode === undefined ? formatQuestionModeLabel(executionMode) : matchedMode.label;
}

/** Format locality values without exposing backend-only identifiers. */
export function formatLocality(context: AuditExportContext | null): string {
    if (context === null) {
        return "";
    }

    return [context.city, context.province, context.country]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(", ");
}

/** Join display values for pre-audit answers while removing empty fragments. */
export function joinDisplayValues(values: readonly string[]): string {
    return values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .join(" | ");
}

/** Read pre-audit values for one instrument question in export order. */
export function readPreAuditQuestionValues(
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

/** Resolve raw pre-audit ids into readable labels when options exist. */
export function resolvePreAuditDisplayValues(
    question: PreAuditQuestion,
    rawValues: readonly string[],
): readonly string[] {
    if (question.options.length === 0) {
        return rawValues;
    }

    return rawValues.map((rawValue) => {
        const option = question.options.find((currentOption) => currentOption.key === rawValue);
        return option?.label ?? rawValue;
    });
}

/** Derive the compact summary score shown in exports. */
export function deriveSummaryScore(auditSession: AuditSession): number | string {
    const overall = auditSession.scores.overall;
    if (overall === null) {
        return "Pending";
    }
    return roundToTwoDecimals(overall.play_value_total + overall.usability_total);
}
