import { useMemo } from "react";
import type { AuditorPlace } from "lib/audit/places-api";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import { getCombinedConstructScore } from "lib/audit/score-helpers";
import { getInstrumentSectionLocalProgress, getVisibleSections } from "lib/audit/selectors";
import type { AuditSession, PlayspaceInstrument } from "lib/audit/types";
import { usePlacesStore } from "stores/places-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/**
 * Compute a local-first progress percent from the in-memory aggregate.
 *
 * @param auditSession Locally merged audit session.
 * @param instrument Current canonical instrument.
 * @returns Draft progress percentage rounded to two decimals.
 */
export function getLocalProgressPercent(
    auditSession: AuditSession,
    instrument: PlayspaceInstrument,
): number | null {
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
    instrument: PlayspaceInstrument,
): AuditorPlace {
    if (auditSession === undefined) {
        return place;
    }

    return {
        ...place,
        audit_status: auditSession.status,
        audit_id: auditSession.audit_id,
        started_at: auditSession.started_at,
        submitted_at: auditSession.submitted_at,
        progress_percent: getLocalProgressPercent(auditSession, instrument),
        score_totals: auditSession.scores.overall,
        summary_score:
            getCombinedConstructScore(auditSession.scores.overall) ?? place.summary_score,
        selected_execution_mode:
            auditSession.selected_execution_mode ?? auditSession.meta.execution_mode,
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
