import { describe, expect, test } from "bun:test";
import { resolveFieldModePresentation } from "./field-mode";

/**
 * Field Mode should improve readability without overwriting the user's theme choice.
 */
describe("resolveFieldModePresentation", () => {
    test("enables stronger contrast and larger text in light mode", () => {
        expect(
            resolveFieldModePresentation({
                fieldMode: true,
                fontScale: 1,
                highContrast: false,
                theme: "light",
            }),
        ).toEqual({
            effectiveFontScale: 1.1,
            prefersFieldPalette: true,
            useHighContrastPalette: true,
        });
    });

    test("keeps the dark theme while still boosting contrast", () => {
        expect(
            resolveFieldModePresentation({
                fieldMode: true,
                fontScale: 1.2,
                highContrast: false,
                theme: "dark",
            }),
        ).toEqual({
            effectiveFontScale: 1.2,
            prefersFieldPalette: false,
            useHighContrastPalette: true,
        });
    });
});
