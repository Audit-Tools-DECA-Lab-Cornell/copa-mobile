import {
    readNestedStringRecord,
    readStringRecord,
    type AuditSession,
    type ExecutionMode,
    type InstrumentQuestion,
    type InstrumentSection,
    type PlayspaceInstrument,
} from "lib/audit/types";

/**
 * Filter instrument sections down to those visible in the active execution mode.
 *
 * @param instrument Loaded playspace instrument.
 * @param executionMode Active execution mode.
 * @returns Sections that contain at least one visible question.
 */
export function getVisibleSections(
    instrument: PlayspaceInstrument,
    executionMode: ExecutionMode | null,
): InstrumentSection[] {
    if (executionMode === null) {
        return [];
    }

    return instrument.sections
        .map((section) => {
            return {
                ...section,
                questions: getVisibleQuestions(section.questions, executionMode),
            };
        })
        .filter((section) => section.questions.length > 0);
}

/**
 * Filter questions down to those visible for one execution mode.
 *
 * @param questions Section question list.
 * @param executionMode Active execution mode.
 * @returns Question list visible to the current participant mode.
 */
export function getVisibleQuestions(
    questions: readonly InstrumentQuestion[],
    executionMode: ExecutionMode,
): InstrumentQuestion[] {
    if (executionMode === "both") {
        return [...questions];
    }

    return questions.filter(
        (question) => question.mode === "both" || question.mode === executionMode,
    );
}

/**
 * Read one section's nested question answers from the raw audit payload.
 *
 * @param auditSession Current audit session payload.
 * @param sectionKey Section key to inspect.
 * @returns Nested map of question answers.
 */
export function getSectionResponses(
    auditSession: AuditSession,
    sectionKey: string,
): Record<string, Record<string, string>> {
    const sectionsValue = auditSession.responses_json["sections"];
    if (typeof sectionsValue !== "object" || sectionsValue === null) {
        return {};
    }

    const sectionValue = Reflect.get(sectionsValue, sectionKey);
    if (typeof sectionValue !== "object" || sectionValue === null) {
        return {};
    }

    const responsesValue = Reflect.get(sectionValue, "responses");
    return readNestedStringRecord(responsesValue);
}

/**
 * Read one section note from the raw audit payload.
 *
 * @param auditSession Current audit session payload.
 * @param sectionKey Section key to inspect.
 * @returns Stored note string or an empty string.
 */
export function getSectionNote(auditSession: AuditSession, sectionKey: string): string {
    const sectionsValue = auditSession.responses_json["sections"];
    if (typeof sectionsValue !== "object" || sectionsValue === null) {
        return "";
    }

    const sectionValue = Reflect.get(sectionsValue, sectionKey);
    if (typeof sectionValue !== "object" || sectionValue === null) {
        return "";
    }

    const noteValue = Reflect.get(sectionValue, "note");
    return typeof noteValue === "string" ? noteValue : "";
}

/**
 * Read the stored pre-audit values from the raw audit payload.
 *
 * @param auditSession Current audit session payload.
 * @returns String-or-array map of saved pre-audit values.
 */
export function getPreAuditValues(auditSession: AuditSession): Record<string, string | string[]> {
    const preAuditValue = auditSession.responses_json["pre_audit"];
    if (typeof preAuditValue !== "object" || preAuditValue === null) {
        return {};
    }

    const nextValues: Record<string, string | string[]> = {};
    for (const [valueKey, valueEntry] of Object.entries(preAuditValue)) {
        if (typeof valueEntry === "string") {
            nextValues[valueKey] = valueEntry;
            continue;
        }
        if (Array.isArray(valueEntry) && valueEntry.every((entry) => typeof entry === "string")) {
            nextValues[valueKey] = valueEntry;
        }
    }
    return nextValues;
}

/**
 * Read one question's selected scale answers.
 *
 * @param auditSession Current audit session payload.
 * @param sectionKey Section containing the question.
 * @param questionKey Question key to inspect.
 * @returns Flat scale-to-option map.
 */
export function getQuestionAnswers(
    auditSession: AuditSession,
    sectionKey: string,
    questionKey: string,
): Record<string, string> {
    const sectionResponses = getSectionResponses(auditSession, sectionKey);
    return readStringRecord(sectionResponses[questionKey]);
}
