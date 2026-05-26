import { getProjectPlaceKey } from "lib/audit/pair-key";
import { getInstrumentSectionLocalProgress, getVisibleSections } from "lib/audit/selectors";
import { useMemo } from "react";
import { usePlayspaceAuditStore } from "stores/audit-store";
import { usePlacesStore } from "stores/places-store";

import type { AuditorPlace } from "lib/audit/places-api";
import type { AuditScoreTotals, AuditSession, AuditStatus, PlayspaceInstrument } from "lib/audit/types";

type PlaceAxisStatus = AuditorPlace["place_audit_status"];

/**
 * When a local draft session exists, bump per-axis status so list UIs reflect in-progress / submitted work.
 */
function mergePlaceAxisWithSession(axisValue: PlaceAxisStatus, sessionStatus: AuditStatus): PlaceAxisStatus {
    if (sessionStatus === "SUBMITTED") {
        return "submitted";
    }
    if (sessionStatus === "IN_PROGRESS" || sessionStatus === "PAUSED") {
        if (axisValue === "submitted") return axisValue;
        return "in_progress";
    }
    return axisValue;
}

interface ScorePair {
    readonly pv: number;
    readonly u: number;
}

/**
 * Map one construct score bucket to a PV/U pair for place rollups.
 */
function scorePairFromTotals(totals: AuditScoreTotals | null | undefined): ScorePair | null {
    if (totals === null || totals === undefined) {
        return null;
    }

    return { pv: totals.play_value_total, u: totals.usability_total };
}

/**
 * Overall PV/U is the sum of audit- and survey-partition means for one submission, when both exist.
 */
function overallPairFromPartitions(audit: ScorePair | null, survey: ScorePair | null): ScorePair | null {
    if (audit === null || survey === null) {
        return null;
    }

    return { pv: audit.pv + survey.pv, u: audit.u + survey.u };
}
/**
 * Compute a local-first progress percent from the in-memory aggregate.
 *
 * @param auditSession Locally merged audit session.
 * @param instrument Current canonical instrument.
 * @returns Draft progress percentage rounded to two decimals.
 */
export function getLocalProgressPercent(auditSession: AuditSession, instrument: PlayspaceInstrument): number | null {
    const executionMode = auditSession.selected_execution_mode ?? auditSession.meta.execution_mode;
    const visibleSections = getVisibleSections(
        instrument,
        executionMode,
        Object.fromEntries(
            Object.entries(auditSession.sections).map(([sectionKey, sectionState]) => [
                sectionKey,
                sectionState.responses,
            ]),
        ),
    );
    if (visibleSections.length === 0) {
        return auditSession.scores.draft_progress_percent;
    }

    let totalVisibleQuestions = 0;
    let answeredVisibleQuestions = 0;
    for (const section of visibleSections) {
        const progress = getInstrumentSectionLocalProgress(auditSession, section);
        totalVisibleQuestions += progress.visibleQuestionCount;
        answeredVisibleQuestions += progress.answeredQuestionCount;
    }

    if (totalVisibleQuestions === 0) {
        return 0;
    }

    return Math.round((answeredVisibleQuestions / totalVisibleQuestions) * 10000) / 100;
}

/**
 * Overlay one remote place summary with the freshest local audit draft when available.
 *
 * @param place Backend-provided place summary.
 * @param auditSession Matching local-first audit session.
 * @param instrument Current canonical instrument.
 * @returns Place summary that reflects local draft state immediately.
 */
export function overlayLocalSessionOntoPlace(
    place: AuditorPlace,
    auditSession: AuditSession | undefined,
    instrument: PlayspaceInstrument | null | undefined,
): AuditorPlace {
    if (auditSession === undefined) {
        return place;
    }

    const resolvedInstrument = auditSession.instrument ?? instrument;
    if (resolvedInstrument === null || resolvedInstrument === undefined) {
        return place;
    }

    const auditPart = scorePairFromTotals(auditSession.scores.audit);
    const surveyPart = scorePairFromTotals(auditSession.scores.survey);
    const overallFromSession = overallPairFromPartitions(auditPart, surveyPart);

    const executionMode = auditSession.selected_execution_mode ?? auditSession.meta.execution_mode;

    return {
        ...place,
        place_audit_status:
            executionMode === "survey"
                ? place.place_audit_status
                : mergePlaceAxisWithSession(place.place_audit_status, auditSession.status),
        place_survey_status:
            executionMode === "audit"
                ? place.place_survey_status
                : mergePlaceAxisWithSession(place.place_survey_status, auditSession.status),
        audit_id: auditSession.audit_id,
        started_at: auditSession.started_at,
        submitted_at: auditSession.submitted_at,
        progress_percent: getLocalProgressPercent(auditSession, resolvedInstrument),
        score_totals: auditSession.scores.overall,
        summary_score: place.summary_score,
        selected_execution_mode: executionMode,
        audit_scores: auditPart ?? place.audit_scores,
        survey_scores: surveyPart ?? place.survey_scores,
        overall_scores: overallFromSession ?? place.overall_scores,
    };
}

/**
 * Read the assigned places list with local audit sessions merged over the remote summaries.
 *
 * @returns Local-first place summaries used across mobile non-execute surfaces.
 */
export function useLocalFirstPlaces(): AuditorPlace[] {
    const places = usePlacesStore((state) => state.places);
    const sessionsByPairKey = usePlayspaceAuditStore((state) => state.sessionsByPairKey);
    const instrument = usePlayspaceAuditStore((state) => state.instrument);

    return useMemo(() => {
        return places.map((place) => {
            const pairKey = getProjectPlaceKey(place.project_id, place.place_id);
            const auditSession = sessionsByPairKey[pairKey];
            return overlayLocalSessionOntoPlace(place, auditSession, instrument);
        });
    }, [instrument, places, sessionsByPairKey]);
}
