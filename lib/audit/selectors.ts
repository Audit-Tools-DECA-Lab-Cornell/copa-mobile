import type {
    AuditSession,
    ExecutionMode,
    InstrumentQuestion,
    InstrumentSection,
    PlayspaceInstrument,
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
    return auditSession.sections[sectionKey]?.responses ?? {};
}

/**
 * Read one section note from the raw audit payload.
 *
 * @param auditSession Current audit session payload.
 * @param sectionKey Section key to inspect.
 * @returns Stored note string or an empty string.
 */
export function getSectionNote(auditSession: AuditSession, sectionKey: string): string {
    return auditSession.sections[sectionKey]?.note ?? "";
}

/**
 * Read the stored pre-audit values from the raw audit payload.
 *
 * @param auditSession Current audit session payload.
 * @returns String-or-array map of saved pre-audit values.
 */
export function getPreAuditValues(auditSession: AuditSession): Record<string, string | string[]> {
    return {
        season: auditSession.pre_audit.season ?? "",
        weather_conditions: [...auditSession.pre_audit.weather_conditions],
        users_present: [...auditSession.pre_audit.users_present],
        user_count: auditSession.pre_audit.user_count ?? "",
        age_groups: [...auditSession.pre_audit.age_groups],
        place_size: auditSession.pre_audit.place_size ?? "",
    };
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
    return auditSession.sections[sectionKey]?.responses[questionKey] ?? {};
}
