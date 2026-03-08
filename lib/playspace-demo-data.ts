/**
 * Audit progress states shown in place cards.
 */
export type PlaceStatus = "not_started" | "in_progress" | "ready_for_review" | "submitted";

/**
 * Manager survey progress for combined scoring readiness.
 */
export type ManagerSurveyStatus = "pending" | "requested" | "submitted";

/**
 * Supported color tones for dashboard KPI cards.
 */
export type MetricTone = "blue" | "green" | "purple" | "orange";

/**
 * Small KPI card model used by the dashboard.
 */
export interface DashboardMetric {
    readonly id: string;
    readonly title: string;
    readonly value: string;
    readonly helperText: string;
    readonly tone: MetricTone;
}

/**
 * Place-level summary model shown in list and report screens.
 */
export interface PlaceSummary {
    readonly id: string;
    readonly projectName: string;
    readonly placeName: string;
    readonly locality: string;
    readonly status: PlaceStatus;
    readonly auditScore: number;
    readonly combinedScore: number | null;
    readonly managerSurveyStatus: ManagerSurveyStatus;
    readonly mandatoryCompletionPercent: number;
    readonly updatedAtLabel: string;
}

/**
 * Preview model for section completion in the audit execution screen.
 */
export interface AuditSectionPreview {
    readonly id: string;
    readonly sectionName: string;
    readonly answeredItems: number;
    readonly totalItems: number;
    readonly mandatory: boolean;
    readonly sectionScorePercent: number;
}

/**
 * Chart row model for scoring comparisons.
 */
export interface ReportComparisonRow {
    readonly id: string;
    readonly placeName: string;
    readonly auditScore: number;
    readonly combinedScore: number | null;
    readonly managerSurveyStatus: ManagerSurveyStatus;
}

/**
 * Checklist rows for the dashboard field-day card.
 */
export interface FieldPriorityItem {
    readonly id: string;
    readonly title: string;
    readonly value: string;
}

/**
 * KPI cards for the playspace auditor mobile workflow.
 */
export const AUDITOR_DASHBOARD_METRICS: readonly DashboardMetric[] = [
    {
        id: "assigned",
        title: "Assigned Places",
        value: "4",
        helperText: "Shows only your assigned places",
        tone: "blue",
    },
    {
        id: "drafts",
        title: "Saved Drafts",
        value: "2",
        helperText: "Captured offline on this device",
        tone: "purple",
    },
    {
        id: "submitted",
        title: "Submitted This Week",
        value: "1",
        helperText: "Synced when connection was available",
        tone: "green",
    },
    {
        id: "surveys",
        title: "Manager Surveys Pending",
        value: "2",
        helperText: "Affects combined score readiness",
        tone: "orange",
    },
];

/**
 * Place data used across dashboard, places, execute, and reports tabs.
 */
export const PLAYSPACE_PLACES: readonly PlaceSummary[] = [
    {
        id: "place-001",
        projectName: "Urban Playspace Usability 2026",
        placeName: "Riverside Community Playground",
        locality: "Auckland, New Zealand",
        status: "in_progress",
        auditScore: 74,
        combinedScore: null,
        managerSurveyStatus: "requested",
        mandatoryCompletionPercent: 82,
        updatedAtLabel: "Updated 12m ago",
    },
    {
        id: "place-002",
        projectName: "Urban Playspace Usability 2026",
        placeName: "Kepler Family Park",
        locality: "Auckland, New Zealand",
        status: "ready_for_review",
        auditScore: 81,
        combinedScore: 79,
        managerSurveyStatus: "submitted",
        mandatoryCompletionPercent: 100,
        updatedAtLabel: "Updated 1h ago",
    },
    {
        id: "place-003",
        projectName: "South Region Play Value Pilot",
        placeName: "Hillcrest Shared Play Space",
        locality: "Christchurch, New Zealand",
        status: "not_started",
        auditScore: 0,
        combinedScore: null,
        managerSurveyStatus: "pending",
        mandatoryCompletionPercent: 0,
        updatedAtLabel: "Not started",
    },
    {
        id: "place-004",
        projectName: "South Region Play Value Pilot",
        placeName: "Matai Neighborhood Play Area",
        locality: "Christchurch, New Zealand",
        status: "submitted",
        auditScore: 88,
        combinedScore: 86,
        managerSurveyStatus: "submitted",
        mandatoryCompletionPercent: 100,
        updatedAtLabel: "Submitted yesterday",
    },
];

/**
 * Section overview aligned with playspace execution.
 */
export const AUDIT_SECTION_PREVIEW: readonly AuditSectionPreview[] = [
    {
        id: "section-access-entry",
        sectionName: "Access and Entry",
        answeredItems: 8,
        totalItems: 10,
        mandatory: true,
        sectionScorePercent: 76,
    },
    {
        id: "section-play-value",
        sectionName: "Play Value and Variety",
        answeredItems: 11,
        totalItems: 14,
        mandatory: true,
        sectionScorePercent: 81,
    },
    {
        id: "section-inclusive-design",
        sectionName: "Inclusive Design",
        answeredItems: 7,
        totalItems: 9,
        mandatory: true,
        sectionScorePercent: 78,
    },
    {
        id: "section-safety-risk-balance",
        sectionName: "Safety and Risk Balance",
        answeredItems: 6,
        totalItems: 8,
        mandatory: true,
        sectionScorePercent: 73,
    },
    {
        id: "section-amenities-comfort",
        sectionName: "Comfort and Amenities",
        answeredItems: 7,
        totalItems: 9,
        mandatory: true,
        sectionScorePercent: 77,
    },
    {
        id: "section-maintenance-care",
        sectionName: "Maintenance and Care",
        answeredItems: 8,
        totalItems: 10,
        mandatory: true,
        sectionScorePercent: 79,
    },
    {
        id: "section-participant-info",
        sectionName: "Youth Participant Info",
        answeredItems: 4,
        totalItems: 5,
        mandatory: false,
        sectionScorePercent: 0,
    },
];

/**
 * Report comparison rows used to mock scoring visuals.
 */
export const REPORT_COMPARISON_ROWS: readonly ReportComparisonRow[] = [
    {
        id: "report-1",
        placeName: "Riverside Community Playground",
        auditScore: 74,
        combinedScore: null,
        managerSurveyStatus: "requested",
    },
    {
        id: "report-2",
        placeName: "Kepler Family Park",
        auditScore: 81,
        combinedScore: 79,
        managerSurveyStatus: "submitted",
    },
    {
        id: "report-3",
        placeName: "Matai Neighborhood Play Area",
        auditScore: 88,
        combinedScore: 86,
        managerSurveyStatus: "submitted",
    },
];

/**
 * Field priorities shown on the dashboard.
 */
export const FIELD_PRIORITY_ITEMS: readonly FieldPriorityItem[] = [
    {
        id: "priority-1",
        title: "Places due today",
        value: "2",
    },
    {
        id: "priority-2",
        title: "Drafts pending sync",
        value: "2",
    },
    {
        id: "priority-3",
        title: "Manager surveys pending",
        value: "2",
    },
];

/**
 * Return completion progress as an integer percentage.
 *
 * @param answeredItems Number of answered questions.
 * @param totalItems Number of total questions.
 * @returns Whole-number completion percentage in the 0-100 range.
 */
export function toCompletionPercent(answeredItems: number, totalItems: number): number {
    if (totalItems <= 0) {
        return 0;
    }

    const safeAnsweredItems = Math.max(answeredItems, 0);
    const rawPercent = Math.round((safeAnsweredItems / totalItems) * 100);

    if (rawPercent < 0) {
        return 0;
    }
    if (rawPercent > 100) {
        return 100;
    }
    return rawPercent;
}
