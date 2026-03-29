import { describe, expect, test } from "bun:test";
import { createMetricDisplayState } from "lib/metric-display";

/**
 * Metric cards should expose a clear helper caption whenever the score is still pending.
 */
describe("createMetricDisplayState", () => {
    test("returns a pending helper message for missing scores", () => {
        expect(
            createMetricDisplayState({
                pendingText: "Pending submission",
                value: null,
                formatValue: (value) => `${value}`,
            }),
        ).toEqual({
            helperText: "Pending submission",
            value: "--",
        });
    });

    test("returns only the formatted value when a score exists", () => {
        expect(
            createMetricDisplayState({
                pendingText: "Pending submission",
                value: 36,
                formatValue: (value) => `${value}/100`,
            }),
        ).toEqual({
            helperText: undefined,
            value: "36/100",
        });
    });
});
