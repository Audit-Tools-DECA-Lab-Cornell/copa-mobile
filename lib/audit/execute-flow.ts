import type { ExecutionMode } from "lib/audit/types";

/**
 * Translation subject token used by mode-aware execute copy.
 */
export type ExecuteFlowSubject = "audit" | "survey" | "auditAndSurvey" | "workflow";

/**
 * One section row shown on the execute overview review surface.
 */
export interface ExecuteOverviewSectionInput {
    readonly sectionKey: string;
    readonly title: string;
    readonly answeredCount: number;
    readonly totalCount: number;
    readonly isComplete: boolean;
}

/**
 * Aggregated section-summary data for the execute overview.
 */
export interface ExecuteOverviewSummary {
    readonly completedCount: number;
    readonly incompleteCount: number;
    readonly firstIncompleteSectionKey: string | null;
    readonly rows: readonly ExecuteOverviewSectionInput[];
}

/**
 * Determine whether the selected execution mode includes the onsite setup step.
 *
 * @param mode Active execution mode.
 * @returns True when the space-audit setup should be shown.
 */
export function doesExecutionModeRequireSpaceAudit(mode: ExecutionMode | null): boolean {
    return mode === "audit" || mode === "both";
}

/**
 * Map one execution mode to a translation subject token.
 *
 * @param mode Active execution mode.
 * @returns Token consumed by UI translation templates.
 */
export function getExecuteFlowSubject(mode: ExecutionMode | null): ExecuteFlowSubject {
    if (mode === "survey") {
        return "survey";
    }
    if (mode === "audit") {
        return "audit";
    }
    if (mode === "both") {
        return "auditAndSurvey";
    }
    return "workflow";
}

/**
 * Build complete/incomplete counts and the first incomplete section key for the
 * execute overview review surface.
 *
 * @param rows Ordered section rows.
 * @returns Aggregated overview summary.
 */
export function buildExecuteOverviewSummary(
    rows: readonly ExecuteOverviewSectionInput[],
): ExecuteOverviewSummary {
    let completedCount = 0;
    let incompleteCount = 0;
    let firstIncompleteSectionKey: string | null = null;

    for (const row of rows) {
        if (row.isComplete) {
            completedCount += 1;
            continue;
        }

        incompleteCount += 1;
        if (firstIncompleteSectionKey === null) {
            firstIncompleteSectionKey = row.sectionKey;
        }
    }

    return {
        completedCount,
        incompleteCount,
        firstIncompleteSectionKey,
        rows: rows.map((row) => ({ ...row })),
    };
}
