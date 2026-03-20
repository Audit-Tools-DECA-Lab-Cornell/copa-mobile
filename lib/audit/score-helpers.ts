import type { AuditScoreTotals } from "lib/audit/types";

/**
 * Localized short labels used when rendering compact score summaries.
 */
export interface ScoreSummaryLabels {
    readonly playValueShort: string;
    readonly usabilityShort: string;
    readonly sociabilityShort: string;
    readonly quantityShort: string;
    readonly diversityShort: string;
    readonly challengeShort: string;
}

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
 * Collapse the two construct totals into one compact ranking value.
 *
 * @param scoreTotals Optional overall score totals.
 * @returns Combined play value plus usability score or `null` when unavailable.
 */
export function getCombinedConstructScore(
    scoreTotals: AuditScoreTotals | null | undefined,
): number | null {
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
 * @returns Compact quantity/diversity/challenge summary or a placeholder.
 */
export function formatColumnSummary(
    scoreTotals: AuditScoreTotals | null | undefined,
    labels: ScoreSummaryLabels,
): string {
    if (scoreTotals === null || scoreTotals === undefined) {
        return "--";
    }

    return [
        `${labels.quantityShort} ${formatScoreValue(scoreTotals.quantity_total)}`,
        `${labels.diversityShort} ${formatScoreValue(scoreTotals.diversity_total)}`,
        `${labels.challengeShort} ${formatScoreValue(scoreTotals.challenge_total)}`,
    ].join(" | ");
}
