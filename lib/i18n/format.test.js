import { describe, expect, test } from "bun:test";
import { getExecutionModeShortLabel } from "./format";

/**
 * Verify execution-mode labels never leak untranslated i18n keys into UI text.
 */
describe("getExecutionModeShortLabel", () => {
    test("returns the translated label when the translation exists", () => {
        const translate = (key) => {
            if (key === "audit:modeShort.both") {
                return "Survey & onsite";
            }

            return key;
        };

        expect(getExecutionModeShortLabel("both", translate)).toBe("Survey & onsite");
    });

    test("falls back to a readable label when the translation is missing", () => {
        const translate = (key) => key;

        expect(getExecutionModeShortLabel("both", translate)).toBe("Survey & onsite");
    });
});
