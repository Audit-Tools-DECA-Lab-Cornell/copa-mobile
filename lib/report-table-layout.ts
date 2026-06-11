import { useMemo } from "react";
import { getContentTrackInnerWidth, useResponsiveLayout } from "lib/responsive-layout";

const LEFT_COLUMN_COUNT = 4; // provision, variety, challenge, sociability
const RIGHT_COLUMN_COUNT = 2; // play_value, usability

/** Former fixed phone sizes - only proportions matter; widths scale to the content track. */
const NOMINAL_PHONE = { label: 160, leftData: 72, rightData: 108 } as const;
/** Former fixed tablet sizes - proportions preserved on wide slates. */
const NOMINAL_TABLET = { label: 150, leftData: 88, rightData: 125 } as const;

function nominalJoinedTotal(nominal: { label: number; leftData: number; rightData: number }): number {
    return nominal.label + nominal.leftData * LEFT_COLUMN_COUNT + nominal.rightData * RIGHT_COLUMN_COUNT;
}

/**
 * Derive integer column widths from the available content width by scaling
 * nominal label and data proportions, then absorbing rounding in the label column
 * so the joined table width matches `track` exactly.
 */
function layoutFromContentTrack(
    track: number,
    nominal: { label: number; leftData: number; rightData: number },
): { labelColWidth: number; leftDataColWidth: number; rightDataColWidth: number } {
    const totalNominal = nominalJoinedTotal(nominal);
    if (track <= 0 || totalNominal <= 0) {
        return {
            labelColWidth: nominal.label,
            leftDataColWidth: nominal.leftData,
            rightDataColWidth: nominal.rightData,
        };
    }

    let labelColWidth = Math.round((nominal.label / totalNominal) * track);
    let leftDataColWidth = Math.round((nominal.leftData / totalNominal) * track);
    let rightDataColWidth = Math.round((nominal.rightData / totalNominal) * track);

    labelColWidth = Math.max(32, labelColWidth);
    leftDataColWidth = Math.max(28, leftDataColWidth);
    rightDataColWidth = Math.max(28, rightDataColWidth);

    const drift =
        track - (labelColWidth + leftDataColWidth * LEFT_COLUMN_COUNT + rightDataColWidth * RIGHT_COLUMN_COUNT);
    labelColWidth += drift;

    return { labelColWidth, leftDataColWidth, rightDataColWidth };
}

/**
 * Phone layout: the UI shows **two** score tables (scale group, then construct group), not
 * a joined 6-column table. Scale the **scale** table to the full `track` width, then set
 * construct data column width to `2 ×` scale data width so the **same** label width fits
 * both `label + 4×L` and `label + 2×R` = `label + 4×L` = `track`.
 */
function layoutPhoneSubTablesToTrack(
    track: number,
    nominal: { label: number; leftData: number; rightData: number },
): { labelColWidth: number; leftDataColWidth: number; rightDataColWidth: number } {
    const scaleTotalNom = nominal.label + nominal.leftData * LEFT_COLUMN_COUNT;
    if (track <= 0 || scaleTotalNom <= 0) {
        return {
            labelColWidth: Math.max(32, nominal.label),
            leftDataColWidth: Math.max(28, nominal.leftData),
            rightDataColWidth: Math.max(28, nominal.rightData),
        };
    }

    let labelColWidth = Math.round((nominal.label / scaleTotalNom) * track);
    let leftDataColWidth = Math.round((nominal.leftData / scaleTotalNom) * track);
    labelColWidth = Math.max(32, labelColWidth);
    leftDataColWidth = Math.max(28, leftDataColWidth);
    const drift = track - (labelColWidth + leftDataColWidth * LEFT_COLUMN_COUNT);
    labelColWidth += drift;
    const rightDataColWidth = leftDataColWidth * 2;
    return { labelColWidth, leftDataColWidth, rightDataColWidth };
}

export interface ReportScoreTableLayout {
    readonly labelColWidth: number;
    readonly leftDataColWidth: number;
    readonly rightDataColWidth: number;
    readonly leftTableWidth: number;
    readonly rightTableWidth: number;
    readonly joinedTableWidth: number;
}

/**
 * Report score table / bar column widths derived from the same **content track**
 * as `getResponsiveContentContainerStyle` (viewport minus padding, capped by
 * `contentMaxWidth`).
 *
 * - **Tablet:** one joined 6-column table; columns are scaled from the full joined nominal.
 * - **Phone:** two stacked tables; each sub-table is scaled to the **full** `track` width
 *   (shared label column; construct data columns are 2× scale data column width).
 */
export function useReportScoreTableLayout(): ReportScoreTableLayout {
    const layout = useResponsiveLayout();

    return useMemo<ReportScoreTableLayout>(() => {
        const track = getContentTrackInnerWidth(layout);

        if (layout.isTablet) {
            const { labelColWidth, leftDataColWidth, rightDataColWidth } = layoutFromContentTrack(
                track,
                NOMINAL_TABLET,
            );
            const leftTableWidth = labelColWidth + leftDataColWidth * LEFT_COLUMN_COUNT;
            const rightTableWidth = labelColWidth + rightDataColWidth * RIGHT_COLUMN_COUNT;
            const joinedTableWidth =
                labelColWidth + leftDataColWidth * LEFT_COLUMN_COUNT + rightDataColWidth * RIGHT_COLUMN_COUNT;

            return {
                labelColWidth,
                leftDataColWidth,
                rightDataColWidth,
                leftTableWidth,
                rightTableWidth,
                joinedTableWidth,
            };
        }

        const { labelColWidth, leftDataColWidth, rightDataColWidth } = layoutPhoneSubTablesToTrack(
            track,
            NOMINAL_PHONE,
        );
        // Each sub-table spans the full content track; `joinedTableWidth` is only for tablet
        // UIs but kept equal to `track` so consumers see a consistent max width.
        return {
            labelColWidth,
            leftDataColWidth,
            rightDataColWidth,
            leftTableWidth: track,
            rightTableWidth: track,
            joinedTableWidth: track,
        };
    }, [layout]);
}
