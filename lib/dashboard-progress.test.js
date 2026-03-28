import { describe, expect, test } from "bun:test";
import {
    createActiveAuditMetricState,
    formatPriorityProgressLabel,
    getVisibleProgressBarWidth,
} from "./dashboard-progress";

/**
 * Keep dashboard priority progress copy human-readable and visually visible.
 */
describe("dashboard progress helpers", () => {
    test("uses a ready-to-begin label for not-started audits", () => {
        const translate = (key, values = {}) => {
            if (key === "priorityProgress.notStarted") {
                return "Not started · Ready to begin";
            }

            if (key === "priorityProgress.inProgress") {
                return `${values.percent}% complete · Updated ${values.updated}`;
            }

            return `Submitted · Updated ${values.updated}`;
        };

        expect(
            formatPriorityProgressLabel({
                progressPercent: 0,
                status: "not_started",
                updatedLabel: "Just now",
                translate,
            }),
        ).toBe("Not started · Ready to begin");
    });

    test("uses percent complete plus updated time for active audits", () => {
        const translate = (key, values = {}) => {
            if (key === "priorityProgress.notStarted") {
                return "Not started · Ready to begin";
            }

            if (key === "priorityProgress.inProgress") {
                return `${values.percent}% complete · Updated ${values.updated}`;
            }

            return `Submitted · Updated ${values.updated}`;
        };

        expect(
            formatPriorityProgressLabel({
                progressPercent: 37,
                status: "in_progress",
                updatedLabel: "2 hr ago",
                translate,
            }),
        ).toBe("37% complete · Updated 2 hr ago");
    });

    test("keeps empty progress bars visible", () => {
        expect(getVisibleProgressBarWidth(0)).toBe(4);
        expect(getVisibleProgressBarWidth(12)).toBe("12%");
    });

    test("hides the construct summary when no score is available", () => {
        expect(
            createActiveAuditMetricState({
                combinedConstructScore: null,
                progressPercent: 0,
                formatScoreValue: (value) => `${value}`,
                translateConstructLabel: () => "Construct",
            }),
        ).toEqual({
            completionValue: "0%",
            constructSummary: undefined,
        });
    });

    test("separates completion and construct score when a score exists", () => {
        expect(
            createActiveAuditMetricState({
                combinedConstructScore: 36,
                progressPercent: 47,
                formatScoreValue: (value) => `${value}`,
                translateConstructLabel: () => "Construct",
            }),
        ).toEqual({
            completionValue: "47%",
            constructSummary: "Construct 36",
        });
    });
});
