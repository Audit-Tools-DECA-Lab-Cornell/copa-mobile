import type {
    AuditScoreTotals,
    AuditSession,
    InstrumentQuestion,
    QuestionResponsePayload,
    QuestionScale,
    ScaleOption,
} from "lib/audit/types";
import type { AuditorPlace } from "./places-api";

/**
 * Localized short labels used when rendering compact score summaries.
 */
export interface ScoreSummaryLabels {
    readonly playValueShort: string;
    readonly usabilityShort: string;
    readonly sociabilityShort: string;
    readonly provisionShort: string;
    readonly diversityShort: string;
    readonly challengeShort: string;
}

export interface ScorePair {
    readonly pv: number;
    readonly u: number;
}

interface MultiplierScaleScore {
    readonly columnTotal: number;
    readonly boostValue: number;
}

const EMPTY_SCORE_TOTALS: AuditScoreTotals = {
    provision_total: 0,
    provision_total_max: 0,
    diversity_total: 0,
    diversity_total_max: 0,
    challenge_total: 0,
    challenge_total_max: 0,
    sociability_total: 0,
    sociability_total_max: 0,
    play_value_total: 0,
    play_value_total_max: 0,
    usability_total: 0,
    usability_total_max: 0,
};

/**
 * Format one raw score value for compact UI surfaces.
 *
 * @param value Numeric score total.
 * @returns Integer-style text when possible, otherwise one decimal place.
 */
export function formatScoreValue(value: number): string {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

/**
 * Format a compact PV/U score pair for mobile summary surfaces.
 *
 * @param value Score pair or null.
 * @returns `PV x | U y` or `null` when unavailable.
 */
export function formatScorePair(value: ScorePair | null | undefined): string | null {
    if (value === null || value === undefined) {
        return null;
    }

    return `PV ${formatScoreValue(value.pv)} | U ${formatScoreValue(value.u)}`;
}

/**
 * Returns the score totals that correspond to what the auditor actually completed.
 * For audit-only sessions use the `audit` scores; for survey-only use `survey`;
 * for combined ("both") or unknown fall back to `overall`.
 */
export function getEffectiveAuditScoreTotals(scores: AuditSession["scores"]): AuditScoreTotals | null {
    if (scores.execution_mode === "audit") {
        return scores.audit ?? null;
    }
    if (scores.execution_mode === "survey") {
        return scores.survey ?? null;
    }
    return scores.overall ?? null;
}

/**
 * Returns the score pair that reflects what the auditor actually submitted.
 * For audit-only submissions use `audit_scores`; for survey-only use `survey_scores`;
 * for combined ("both") or unknown mode fall back to `overall_scores`.
 */
export function getEffectivePlaceScores(place: AuditorPlace): ScorePair | null {
    if (place.selected_execution_mode === "audit") {
        return place.audit_scores ?? null;
    }
    if (place.selected_execution_mode === "survey") {
        return place.survey_scores ?? null;
    }
    return place.overall_scores ?? null;
}

/**
 * Create a new zeroed score bucket that mirrors the backend contract.
 *
 * @returns Empty raw/max score totals.
 */
export function createEmptyScoreTotals(): AuditScoreTotals {
    return { ...EMPTY_SCORE_TOTALS };
}

/**
 * Add two score buckets together while preserving raw and max totals.
 *
 * @param left Left score bucket.
 * @param right Right score bucket.
 * @returns Summed score bucket.
 */
export function addScoreTotals(left: AuditScoreTotals, right: AuditScoreTotals): AuditScoreTotals {
    return {
        provision_total: left.provision_total + right.provision_total,
        provision_total_max: left.provision_total_max + right.provision_total_max,
        diversity_total: left.diversity_total + right.diversity_total,
        diversity_total_max: left.diversity_total_max + right.diversity_total_max,
        challenge_total: left.challenge_total + right.challenge_total,
        challenge_total_max: left.challenge_total_max + right.challenge_total_max,
        sociability_total: left.sociability_total + right.sociability_total,
        sociability_total_max: left.sociability_total_max + right.sociability_total_max,
        play_value_total: left.play_value_total + right.play_value_total,
        play_value_total_max: left.play_value_total_max + right.play_value_total_max,
        usability_total: left.usability_total + right.usability_total,
        usability_total_max: left.usability_total_max + right.usability_total_max,
    };
}

/**
 * Calculate one question's raw and maximum score totals using the same rules as
 * the backend response payload.
 *
 * @param question Instrument question definition.
 * @param answers Stored answer payload for the question.
 * @returns Question-level raw and maximum score totals.
 */
export function calculateQuestionScores(
    question: InstrumentQuestion,
    answers: QuestionResponsePayload,
): AuditScoreTotals {
    if (question.question_type !== "scaled" || question.scales.length === 0) {
        return createEmptyScoreTotals();
    }

    const provisionScale = findScale(question, "provision");
    const provisionAnswerKey = typeof answers.provision === "string" ? answers.provision : undefined;
    const provisionOption =
        provisionScale === undefined || provisionAnswerKey === undefined
            ? undefined
            : findScaleOption(provisionScale, provisionAnswerKey);
    const provisionTotal = provisionOption?.addition_value ?? 0;
    const provisionTotalMax = readProvisionScaleMaximum(question);
    const shouldReadFollowUpScales = provisionOption?.allows_follow_up_scales === true;
    const diversityScore = shouldReadFollowUpScales
        ? readMultiplierScaleScore(question, answers, "diversity")
        : { columnTotal: 0, boostValue: 1 };
    const challengeScore = shouldReadFollowUpScales
        ? readMultiplierScaleScore(question, answers, "challenge")
        : { columnTotal: 0, boostValue: 1 };
    const sociabilityTotal = shouldReadFollowUpScales ? readSociabilityScaleScore(question, answers) : 0;
    const diversityMaximum = readMultiplierScaleMaximum(question, "diversity");
    const challengeMaximum = readMultiplierScaleMaximum(question, "challenge");
    const sociabilityTotalMax = readSociabilityScaleMaximum(question);
    const constructTotal = provisionTotal * diversityScore.boostValue * challengeScore.boostValue;
    const constructTotalMax = provisionTotalMax * diversityMaximum.boostValue * challengeMaximum.boostValue;

    return {
        provision_total: provisionTotal,
        provision_total_max: provisionTotalMax,
        diversity_total: diversityScore.columnTotal,
        diversity_total_max: diversityMaximum.columnTotal,
        challenge_total: challengeScore.columnTotal,
        challenge_total_max: challengeMaximum.columnTotal,
        sociability_total: sociabilityTotal,
        sociability_total_max: sociabilityTotalMax,
        play_value_total: question.constructs.includes("play_value") ? constructTotal : 0,
        play_value_total_max: question.constructs.includes("play_value") ? constructTotalMax : 0,
        usability_total: question.constructs.includes("usability") ? constructTotal : 0,
        usability_total_max: question.constructs.includes("usability") ? constructTotalMax : 0,
    };
}

/**
 * Format a numeric result as a percentage of its maximum possible score.
 *
 * @param value Raw score.
 * @param maximum Maximum possible score.
 * @returns Compact percentage text or `--` when not available.
 */
export function formatPercentage(value: number, maximum: number): string {
    if (maximum <= 0) {
        return "--";
    }

    const percentage = (value / maximum) * 100;
    const roundedPercentage = Math.round(percentage * 10) / 10;
    return Number.isInteger(roundedPercentage)
        ? `${roundedPercentage.toFixed(0)}%`
        : `${roundedPercentage.toFixed(1)}%`;
}

/**
 * Rounded percent of max (0–100), used for report bar fill tiering. Mirrors web `report-helpers`.
 * @returns `null` when `max <= 0`.
 */
export function roundedPercentOfMax(value: number, max: number): number | null {
    if (max <= 0) {
        return null;
    }
    return Math.round((value / max) * 100);
}

/**
 * Bar color band from percentage: 70+ high, 40+ mid, below low, null for not assessed.
 * Matches `reportBarScoreTier` in `audit-tools-playspace-frontend/src/lib/audit/report-helpers.ts`.
 */
export type ReportBarScoreTier = "na" | "high" | "mid" | "low";

export function reportBarScoreTier(percent: number | null): ReportBarScoreTier {
    if (percent === null) {
        return "na";
    }
    if (percent >= 70) {
        return "high";
    }
    if (percent >= 40) {
        return "mid";
    }
    return "low";
}

/**
 * Format a raw score followed by its percentage of the max score.
 *
 * @param value Raw score.
 * @param maximum Maximum possible score.
 * @returns Combined raw score and percentage display.
 */
export function formatScoreWithPercentage(value: number, maximum: number): string {
    const percentageText = formatPercentage(value, maximum);
    if (percentageText === "--") {
        return formatScoreValue(value);
    }
    return `${formatScoreValue(value)} (${percentageText})`;
}

/**
 * Build a short helper string that shows both the maximum score and percentage.
 *
 * @param value Raw score.
 * @param maximum Maximum possible score.
 * @returns Compact helper text for cards or summaries.
 */
export function formatScoreMeta(value: number, maximum: number): string {
    if (maximum <= 0) {
        return "--";
    }

    return `max = ${formatScoreValue(maximum)} | ${formatPercentage(value, maximum)}`;
}

/**
 * Collapse the two construct totals into one compact ranking value.
 *
 * @param scoreTotals Optional overall score totals.
 * @returns Combined play value plus usability score or `null` when unavailable.
 */
export function getCombinedConstructScore(scoreTotals: AuditScoreTotals | null | undefined): number | null {
    if (scoreTotals === null || scoreTotals === undefined) {
        return null;
    }
    return scoreTotals.play_value_total + scoreTotals.usability_total;
}

/**
 * Build a short construct summary for cards and list rows.
 *
 * @param scoreTotals Optional overall score totals.
 * @param labels Localized score labels.
 * @returns Compact summary text or a placeholder when scores are unavailable.
 */
export function formatConstructSummary(
    scoreTotals: AuditScoreTotals | null | undefined,
    labels: ScoreSummaryLabels,
): string {
    if (scoreTotals === null || scoreTotals === undefined) {
        return "--";
    }

    return [
        `${labels.playValueShort} ${formatScoreValue(scoreTotals.play_value_total)}`,
        `${labels.usabilityShort} ${formatScoreValue(scoreTotals.usability_total)}`,
        `${labels.sociabilityShort} ${formatScoreValue(scoreTotals.sociability_total)}`,
    ].join(" | ");
}

/**
 * Build a short column-total summary for the reports list.
 *
 * @param scoreTotals Optional overall score totals.
 * @param labels Localized score labels.
 * @returns Compact provision/diversity/challenge summary or a placeholder.
 */
export function formatColumnSummary(
    scoreTotals: AuditScoreTotals | null | undefined,
    labels: ScoreSummaryLabels,
): string {
    if (scoreTotals === null || scoreTotals === undefined) {
        return "--";
    }

    return [
        `${labels.provisionShort} ${formatScoreValue(scoreTotals.provision_total)}`,
        `${labels.diversityShort} ${formatScoreValue(scoreTotals.diversity_total)}`,
        `${labels.challengeShort} ${formatScoreValue(scoreTotals.challenge_total)}`,
    ].join(" | ");
}

/**
 * Find one scale definition on an instrument question.
 *
 * @param question Instrument question definition.
 * @param scaleKey Scale key to locate.
 * @returns Matching scale when present.
 */
function findScale(question: InstrumentQuestion, scaleKey: QuestionScale["key"]): QuestionScale | undefined {
    return question.scales.find((scale) => scale.key === scaleKey);
}

/**
 * Find one option definition inside a scale.
 *
 * @param scale Scale definition.
 * @param optionKey Stable option key.
 * @returns Matching option when present.
 */
function findScaleOption(scale: QuestionScale, optionKey: string): ScaleOption | undefined {
    return scale.options.find((option) => option.key === optionKey);
}

/**
 * Read one diversity/challenge answer as both a column total and a construct multiplier.
 *
 * @param question Instrument question definition.
 * @param answers Stored answer payload.
 * @param scaleKey Scale to inspect.
 * @returns Column total plus boost multiplier.
 */
function readMultiplierScaleScore(
    question: InstrumentQuestion,
    answers: QuestionResponsePayload,
    scaleKey: "diversity" | "challenge",
): MultiplierScaleScore {
    const scale = findScale(question, scaleKey);
    const answerKey = typeof answers[scaleKey] === "string" ? answers[scaleKey] : undefined;
    if (scale === undefined || answerKey === undefined) {
        return { columnTotal: 0, boostValue: 1 };
    }

    const selectedOption = findScaleOption(scale, answerKey);
    if (selectedOption === undefined) {
        return { columnTotal: 0, boostValue: 1 };
    }

    const columnTotal = Math.max(selectedOption.addition_value - 1, 0);
    if (selectedOption.addition_value <= 0) {
        return { columnTotal, boostValue: 1 };
    }

    return { columnTotal, boostValue: selectedOption.boost_value };
}

/**
 * Read the highest possible diversity/challenge total and multiplier for one question.
 *
 * @param question Instrument question definition.
 * @param scaleKey Scale to inspect.
 * @returns Maximum column total plus maximum boost multiplier.
 */
function readMultiplierScaleMaximum(
    question: InstrumentQuestion,
    scaleKey: "diversity" | "challenge",
): MultiplierScaleScore {
    const scale = findScale(question, scaleKey);
    if (scale === undefined) {
        return { columnTotal: 0, boostValue: 1 };
    }

    const columnTotal = scale.options.reduce((currentMaximum, option) => {
        return Math.max(currentMaximum, Math.max(option.addition_value - 1, 0));
    }, 0);
    const boostValue = scale.options.reduce((currentMaximum, option) => {
        return Math.max(currentMaximum, option.boost_value);
    }, 1);
    return { columnTotal, boostValue };
}

/**
 * Read the selected sociability column score for one question.
 *
 * @param question Instrument question definition.
 * @param answers Stored answer payload.
 * @returns Sociability total for the selected option.
 */
function readSociabilityScaleScore(question: InstrumentQuestion, answers: QuestionResponsePayload): number {
    const scale = findScale(question, "sociability");
    const answerKey = typeof answers.sociability === "string" ? answers.sociability : undefined;
    if (scale === undefined || answerKey === undefined) {
        return 0;
    }

    const selectedOption = findScaleOption(scale, answerKey);
    if (selectedOption === undefined) {
        return 0;
    }

    return Math.max(selectedOption.addition_value - 1, 0);
}

/**
 * Read the highest available sociability score for one question.
 *
 * @param question Instrument question definition.
 * @returns Maximum sociability total.
 */
function readSociabilityScaleMaximum(question: InstrumentQuestion): number {
    const scale = findScale(question, "sociability");
    if (scale === undefined) {
        return 0;
    }

    return scale.options.reduce((currentMaximum, option) => {
        return Math.max(currentMaximum, Math.max(option.addition_value - 1, 0));
    }, 0);
}

/**
 * Read the highest available provision score for one question.
 *
 * @param question Instrument question definition.
 * @returns Maximum provision/provision total.
 */
function readProvisionScaleMaximum(question: InstrumentQuestion): number {
    const scale = findScale(question, "provision");
    if (scale === undefined) {
        return 0;
    }

    return scale.options.reduce((currentMaximum, option) => {
        return Math.max(currentMaximum, option.addition_value);
    }, 0);
}
