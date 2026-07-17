import type { TFunction } from "i18next";
import {
    getPreAuditValues,
    getQuestionAnswers,
    getVisiblePreAuditQuestions,
    getVisibleSections,
    isInstrumentQuestionComplete,
    isPreAuditQuestionComplete,
} from "lib/audit/selectors";
import { derivePlaceRequirementStatus } from "lib/audit/place-helpers";
import type { AuditorPlace } from "lib/audit/places-api";
import type { AuditSession, ExecutionMode } from "lib/audit/types";
import type { useLocalizedInstrument } from "lib/i18n/instrument-translations";

interface PendingScoreMessageParams {
    readonly place: AuditorPlace;
    readonly auditSession: AuditSession | undefined;
    readonly instrument: ReturnType<typeof useLocalizedInstrument>;
    readonly t: TFunction;
}

interface RemainingExecutionParts {
    readonly audit: boolean;
    readonly survey: boolean;
}

export function resolvePendingScoreMessage({
    place,
    auditSession,
    instrument,
    t,
}: Readonly<PendingScoreMessageParams>): string {
    if (place.audit_id === null) {
        return t("detail.auditUnavailable", { ns: "places" });
    }
    if (derivePlaceRequirementStatus(place) !== "submitted") {
        return t("detail.reportUnavailable", { ns: "places" });
    }

    const selectedMode = auditSession?.selected_execution_mode ?? place.selected_execution_mode;
    if (selectedMode === null) {
        return t("detail.reportUnavailable", { ns: "places" });
    }

    const remainingParts =
        auditSession === undefined
            ? getFallbackRemainingExecutionParts(selectedMode)
            : getRemainingExecutionParts(auditSession, instrument);
    if (remainingParts.audit && remainingParts.survey) {
        return t("detail.waitingForAuditAndSurveyCompletion", { ns: "places" });
    }
    if (remainingParts.audit) {
        return t("detail.waitingForAuditCompletion", { ns: "places" });
    }
    if (remainingParts.survey) {
        return t("detail.waitingForSurveyCompletion", { ns: "places" });
    }
    if (selectedMode === "audit") {
        return t("detail.waitingForAuditSubmission", { ns: "places" });
    }
    if (selectedMode === "survey") {
        return t("detail.waitingForSurveySubmission", { ns: "places" });
    }
    return t("detail.waitingForAuditAndSurveySubmission", { ns: "places" });
}

function getFallbackRemainingExecutionParts(selectedMode: ExecutionMode): RemainingExecutionParts {
    if (selectedMode === "audit") {
        return { audit: true, survey: false };
    }
    if (selectedMode === "survey") {
        return { audit: false, survey: true };
    }
    return { audit: true, survey: true };
}

function getRemainingExecutionParts(
    auditSession: AuditSession,
    instrument: ReturnType<typeof useLocalizedInstrument>,
): RemainingExecutionParts {
    const selectedMode = auditSession.selected_execution_mode;
    if (selectedMode === null) {
        return { audit: true, survey: true };
    }

    const preAuditQuestions = getVisiblePreAuditQuestions(
        instrument!.pre_audit_questions.filter((question) => question.page_key === "space_setup"),
        selectedMode,
    );
    const preAuditValues = getPreAuditValues(auditSession);
    const hasIncompletePreAudit = preAuditQuestions.some((question) => {
        return !isPreAuditQuestionComplete(question, preAuditValues[question.key]);
    });
    let auditRemaining = hasIncompletePreAudit;
    let surveyRemaining = false;

    const visibleSections = getVisibleSections(
        instrument!,
        selectedMode,
        Object.fromEntries(
            Object.entries(auditSession.sections).map(([sectionKey, sectionState]) => [
                sectionKey,
                sectionState.responses,
            ]),
        ),
    );

    for (const section of visibleSections) {
        for (const question of section.questions) {
            if (!question.required) {
                continue;
            }

            const isComplete = isInstrumentQuestionComplete(
                question,
                getQuestionAnswers(auditSession, section.section_key, question.question_key),
            );
            if (isComplete) {
                continue;
            }
            if (question.mode === "audit") {
                auditRemaining = true;
                continue;
            }
            if (question.mode === "survey") {
                surveyRemaining = true;
                continue;
            }
            if (selectedMode === "audit") {
                auditRemaining = true;
                continue;
            }
            if (selectedMode === "survey") {
                surveyRemaining = true;
                continue;
            }
            auditRemaining = true;
            surveyRemaining = true;
        }
    }

    return {
        audit: auditRemaining,
        survey: surveyRemaining,
    };
}
