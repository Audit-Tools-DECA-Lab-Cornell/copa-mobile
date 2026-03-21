import type {
    AuditSession,
    ExecutionMode,
    InstrumentQuestion,
    InstrumentSection,
    PlayspaceInstrument,
} from "lib/audit/types";

/**
 * Progress for one instrument section derived from locally stored responses.
 * Mirrors visibility rules in `QuestionCard` so the execute overview stays
 * accurate before server `progress` updates arrive.
 */
export interface InstrumentSectionLocalProgress {
    readonly visibleQuestionCount: number;
    readonly answeredQuestionCount: number;
    readonly isComplete: boolean;
}

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

/**
 * List scale keys the user must answer for one question, given current selections.
 * Follow-up scales (diversity, etc.) apply only when the quantity option allows them.
 *
 * @param question Instrument question including scales and options.
 * @param selectedAnswers Current scale key → option key map for the question.
 * @returns Scale keys that must have a non-empty selection for the question to count as answered.
 */
export function getActiveScaleKeysForQuestion(
    question: InstrumentQuestion,
    selectedAnswers: Record<string, string>,
): readonly string[] {
    if (question.scales.length === 0) {
        return [];
    }

    const quantityScale = question.scales[0];
    if (quantityScale === undefined) {
        return [];
    }

    const selectedQuantityKey = selectedAnswers[quantityScale.key];
    const selectedQuantityOption = quantityScale.options.find(
        (option) => option.key === selectedQuantityKey,
    );
    const showFollowUpScales = selectedQuantityOption?.allows_follow_up_scales === true;
    const keys: string[] = [quantityScale.key];

    if (showFollowUpScales) {
        for (let index = 1; index < question.scales.length; index += 1) {
            const scale = question.scales[index];
            if (scale !== undefined) {
                keys.push(scale.key);
            }
        }
    }

    return keys;
}

/**
 * Whether every visible scale for the question has a selected option.
 *
 * @param question Question definition.
 * @param selectedAnswers Scale selections for that question.
 * @returns True when the question is fully answered under gating rules.
 */
export function isInstrumentQuestionComplete(
    question: InstrumentQuestion,
    selectedAnswers: Record<string, string>,
): boolean {
    if (question.scales.length === 0) {
        return false;
    }

    const requiredKeys = getActiveScaleKeysForQuestion(question, selectedAnswers);
    if (requiredKeys.length === 0) {
        return false;
    }

    return requiredKeys.every((scaleKey) => {
        const value = selectedAnswers[scaleKey];
        return typeof value === "string" && value.trim().length > 0;
    });
}

/**
 * Aggregate answered count and completion for one section using the audit session draft.
 *
 * @param auditSession Session containing nested section responses.
 * @param section Section with questions already filtered to the active execution mode.
 * @returns Counts and completion flag aligned with on-device answers.
 */
export function getInstrumentSectionLocalProgress(
    auditSession: AuditSession,
    section: InstrumentSection,
): InstrumentSectionLocalProgress {
    const visibleQuestionCount = section.questions.length;
    let answeredQuestionCount = 0;

    for (const question of section.questions) {
        const selectedAnswers = getQuestionAnswers(
            auditSession,
            section.section_key,
            question.question_key,
        );
        if (isInstrumentQuestionComplete(question, selectedAnswers)) {
            answeredQuestionCount += 1;
        }
    }

    const isComplete = visibleQuestionCount > 0 && answeredQuestionCount === visibleQuestionCount;

    return {
        visibleQuestionCount,
        answeredQuestionCount,
        isComplete,
    };
}
