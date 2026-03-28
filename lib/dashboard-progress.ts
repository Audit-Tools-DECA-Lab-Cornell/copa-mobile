import type { LocalizedPlaceStatus } from "lib/i18n/format";

type PriorityProgressTranslationKey =
    | "priorityProgress.notStarted"
    | "priorityProgress.inProgress"
    | "priorityProgress.submitted";

type PriorityProgressTranslate = (
    key: PriorityProgressTranslationKey,
    values?: Readonly<Record<string, number | string>>,
) => string;

interface FormatPriorityProgressLabelParams {
    readonly progressPercent: number;
    readonly status: LocalizedPlaceStatus;
    readonly updatedLabel: string;
    readonly translate: PriorityProgressTranslate;
}

interface CreateActiveAuditMetricStateParams {
    readonly combinedConstructScore: number | null;
    readonly progressPercent: number;
    readonly formatScoreValue: (value: number) => string;
    readonly translateConstructLabel: () => string;
}

interface ActiveAuditMetricState {
    readonly completionValue: string;
    readonly constructSummary?: string;
}

/**
 * Clamp a raw progress percentage to the safe range used by dashboard UI.
 *
 * @param progressPercent Raw percent from API state.
 * @returns Safe integer in the inclusive 0-100 range.
 */
function normalizeProgressPercent(progressPercent: number): number {
    if (!Number.isFinite(progressPercent)) {
        return 0;
    }

    return Math.min(100, Math.max(0, Math.round(progressPercent)));
}

/**
 * Build human-readable dashboard progress copy without leaking internal IDs.
 *
 * @param params Status, progress, updated label, and translation callback.
 * @returns Localized dashboard progress copy.
 */
export function formatPriorityProgressLabel({
    progressPercent,
    status,
    updatedLabel,
    translate,
}: Readonly<FormatPriorityProgressLabelParams>): string {
    const normalizedProgressPercent = normalizeProgressPercent(progressPercent);

    if (status === "not_started") {
        return translate("priorityProgress.notStarted");
    }

    if (status === "submitted") {
        return translate("priorityProgress.submitted", { updated: updatedLabel });
    }

    return translate("priorityProgress.inProgress", {
        percent: normalizedProgressPercent,
        updated: updatedLabel,
    });
}

/**
 * Keep a tiny amount of fill visible so 0% progress does not disappear entirely.
 *
 * @param progressPercent Raw percent from API state.
 * @returns Either a fixed 4px minimum width or the real percentage width.
 */
export function getVisibleProgressBarWidth(progressPercent: number): number | `${number}%` {
    const normalizedProgressPercent = normalizeProgressPercent(progressPercent);

    if (normalizedProgressPercent <= 0) {
        return 4;
    }

    return `${normalizedProgressPercent}%`;
}

/**
 * Separate the mandatory completion value from the optional construct score so
 * compact dashboard cards do not wrap around placeholder content.
 *
 * @param params Progress, optional score, formatter, and label translator.
 * @returns Display-ready metric strings for the active-audit card.
 */
export function createActiveAuditMetricState(
    params: Readonly<CreateActiveAuditMetricStateParams>,
): ActiveAuditMetricState {
    const completionValue = `${normalizeProgressPercent(params.progressPercent)}%`;

    if (params.combinedConstructScore === null) {
        return {
            completionValue,
        };
    }

    return {
        completionValue,
        constructSummary: `${params.translateConstructLabel()} ${params.formatScoreValue(
            params.combinedConstructScore,
        )}`,
    };
}
