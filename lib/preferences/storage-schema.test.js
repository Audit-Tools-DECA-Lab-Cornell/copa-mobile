import { describe, expect, test } from "bun:test";
import { DEFAULT_PERSISTED_PREFERENCES, normalizePersistedPreferences } from "./storage-schema";

/**
 * Persisted preferences should safely add the new Field Mode flag without breaking older data.
 */
describe("normalizePersistedPreferences", () => {
    test("adds the field mode default when older storage blobs do not include it", () => {
        expect(
            normalizePersistedPreferences({
                theme_mode: "light",
                language: "en",
                font_scale: 1,
                high_contrast: false,
                dyslexic_font: false,
            }),
        ).toEqual({
            ...DEFAULT_PERSISTED_PREFERENCES,
            theme_mode: "light",
            language: "en",
        });
    });

    test("preserves an explicit field mode flag when present", () => {
        expect(
            normalizePersistedPreferences({
                theme_mode: "dark",
                language: "fr",
                font_scale: 1.15,
                high_contrast: true,
                dyslexic_font: false,
                field_mode: true,
            }),
        ).toEqual({
            ...DEFAULT_PERSISTED_PREFERENCES,
            theme_mode: "dark",
            language: "fr",
            font_scale: 1.15,
            high_contrast: true,
            field_mode: true,
        });
    });
});
