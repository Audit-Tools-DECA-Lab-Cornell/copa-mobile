import { useMemo } from "react";
import { useResponsiveLayout } from "lib/responsive-layout";

const LEFT_COLUMN_COUNT = 4; // provision, diversity, challenge, sociability
const RIGHT_COLUMN_COUNT = 2; // play_value, usability

export interface ReportScoreTableLayout {
    readonly labelColWidth: number;
    readonly leftDataColWidth: number;
    readonly rightDataColWidth: number;
    readonly leftTableWidth: number;
    readonly rightTableWidth: number;
}

/**
 * Compute report score table column widths based on the active viewport.
 * Exported as a hook so both DomainScoreTable and DomainScoreBars stay aligned.
 *
 * No differentiation between isWideTablet and isTablet; once past the tablet limit, it is tablet.
 */
export function useReportScoreTableLayout(): ReportScoreTableLayout {
    const layout = useResponsiveLayout();

    return useMemo<ReportScoreTableLayout>(() => {
        const labelColWidth = layout.isTablet ? 138 : 120;
        const leftDataColWidth = layout.isTablet ? 80 : 72;
        const rightDataColWidth = layout.isTablet ? 150 : 108;

        return {
            labelColWidth,
            leftDataColWidth,
            rightDataColWidth,
            leftTableWidth: labelColWidth + leftDataColWidth * LEFT_COLUMN_COUNT,
            rightTableWidth: labelColWidth + rightDataColWidth * RIGHT_COLUMN_COUNT,
        };
    }, [layout.isTablet]);
}
