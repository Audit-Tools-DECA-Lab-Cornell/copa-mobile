import type { ScaleKey } from "lib/audit/types";
import type { ResponsiveLayout } from "lib/responsive-layout";

export interface SectionQuestionTableScaleContent {
    readonly headerLabel: string;
    readonly maxOptionLabelLength: number;
}

export interface SectionQuestionTableColumnMetrics {
    readonly tableWidth: number;
    readonly promptColumnWidth: number;
    readonly scaleColumnWidths: Partial<Record<ScaleKey, number>>;
}

interface SectionQuestionTableColumnMetricOptions {
    readonly layout: Pick<
        ResponsiveLayout,
        "isWideTablet" | "windowWidth" | "screenPaddingHorizontal" | "contentMaxWidth"
    >;
    readonly scaleKeys: readonly ScaleKey[];
    readonly scaleContentByKey?: Partial<Record<ScaleKey, SectionQuestionTableScaleContent>>;
}

const NARROW_TABLET_PROMPT_COLUMN_WIDTH = 320;
const WIDE_TABLET_PROMPT_COLUMN_WIDTH = 360;
const NARROW_TABLET_SCALE_COLUMN_MIN_WIDTH = 188;
const WIDE_TABLET_SCALE_COLUMN_MIN_WIDTH = 204;
const NARROW_TABLET_SCALE_COLUMN_MAX_WIDTH = 288;
const WIDE_TABLET_SCALE_COLUMN_MAX_WIDTH = 320;
const LABEL_LENGTH_BASELINE = 18;
const WIDTH_GROWTH_PER_EXTRA_CHARACTER = 4;

/**
 * Resolve the section table column widths with a simple scroll-first layout:
 * a fixed prompt column plus scale widths that grow when their copy gets long.
 *
 * @param options Active responsive layout, visible scales, and optional scale copy metrics.
 * @returns Fixed widths for the prompt column and each visible scale column.
 */
export function getSectionQuestionTableColumnMetrics(
    options: Readonly<SectionQuestionTableColumnMetricOptions>,
): SectionQuestionTableColumnMetrics {
    const visibleScaleKeys = options.scaleKeys;
    const basePromptColumnWidth = options.layout.isWideTablet
        ? WIDE_TABLET_PROMPT_COLUMN_WIDTH
        : NARROW_TABLET_PROMPT_COLUMN_WIDTH;
    const availableTrackWidth = resolveAvailableTrackWidth(options.layout);

    if (visibleScaleKeys.length === 0) {
        const promptColumnWidth = Math.max(basePromptColumnWidth, availableTrackWidth);
        return {
            tableWidth: promptColumnWidth,
            promptColumnWidth,
            scaleColumnWidths: {},
        };
    }

    const scaleColumnWidths: Partial<Record<ScaleKey, number>> = {};
    for (const scaleKey of visibleScaleKeys) {
        scaleColumnWidths[scaleKey] = resolveScaleColumnWidth(
            options.layout.isWideTablet,
            options.scaleContentByKey?.[scaleKey],
        );
    }

    const resolvedScaleWidth = visibleScaleKeys.reduce(
        (sum, scaleKey) => sum + (scaleColumnWidths[scaleKey] ?? 0),
        0,
    );
    const naturalTableWidth = basePromptColumnWidth + resolvedScaleWidth;
    const promptColumnWidth =
        basePromptColumnWidth + Math.max(availableTrackWidth - naturalTableWidth, 0);
    const tableWidth = promptColumnWidth + resolvedScaleWidth;

    return {
        tableWidth,
        promptColumnWidth,
        scaleColumnWidths,
    };
}

/**
 * Resolve the usable tablet content track width so the table can expand to fill
 * the page even when its natural column widths are smaller.
 *
 * @param layout Active responsive layout values.
 * @returns Available content-track width for the section table.
 */
function resolveAvailableTrackWidth(
    layout: Readonly<
        Pick<ResponsiveLayout, "windowWidth" | "screenPaddingHorizontal" | "contentMaxWidth">
    >,
): number {
    return Math.max(
        Math.min(layout.windowWidth - layout.screenPaddingHorizontal * 2, layout.contentMaxWidth),
        0,
    );
}

/**
 * Give every scale column a consistent minimum width, then add a modest amount
 * of extra room when the header or option labels get unusually long.
 *
 * @param isWideTablet Whether the current tablet tier uses the wider sizing preset.
 * @param scaleContent Header and option-length metrics for one scale column.
 * @returns Resolved width for one visible scale column.
 */
function resolveScaleColumnWidth(
    isWideTablet: boolean,
    scaleContent: SectionQuestionTableScaleContent | undefined,
): number {
    const minimumWidth = isWideTablet
        ? WIDE_TABLET_SCALE_COLUMN_MIN_WIDTH
        : NARROW_TABLET_SCALE_COLUMN_MIN_WIDTH;
    const maximumWidth = isWideTablet
        ? WIDE_TABLET_SCALE_COLUMN_MAX_WIDTH
        : NARROW_TABLET_SCALE_COLUMN_MAX_WIDTH;
    const longestLabelLength = Math.max(
        scaleContent?.headerLabel.trim().length ?? 0,
        scaleContent?.maxOptionLabelLength ?? 0,
    );
    const extraCharacters = Math.max(longestLabelLength - LABEL_LENGTH_BASELINE, 0);

    return clampNumber(
        minimumWidth + extraCharacters * WIDTH_GROWTH_PER_EXTRA_CHARACTER,
        minimumWidth,
        maximumWidth,
    );
}

/**
 * Bound a numeric value between a minimum and maximum.
 *
 * @param value Runtime numeric value.
 * @param minimum Minimum allowed value.
 * @param maximum Maximum allowed value.
 * @returns The clamped numeric value.
 */
function clampNumber(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}
