/** Allowed persisted language values. */
export type PersistedLanguagePreference = "system" | "en" | "de" | "fr" | "hi" | "ja";

/** Serializable shape written to device storage. */
export interface PersistedPreferences {
    readonly theme_mode: "system" | "light" | "dark";
    readonly language: PersistedLanguagePreference;
    readonly font_scale: number;
    readonly high_contrast: boolean;
    readonly dyslexic_font: boolean;
    readonly field_mode: boolean;
    readonly has_seen_intro: boolean;
}

export const DEFAULT_PERSISTED_PREFERENCES: PersistedPreferences = {
    theme_mode: "system",
    language: "system",
    font_scale: 1,
    high_contrast: false,
    dyslexic_font: false,
    field_mode: false,
    has_seen_intro: false,
};

/**
 * Apply defaults for any missing fields in a stored preference blob.
 *
 * @param value Unknown parsed JSON.
 * @returns Complete persisted preferences with safe defaults.
 */
export function normalizePersistedPreferences(value: unknown): PersistedPreferences {
    if (!isRecord(value)) {
        return DEFAULT_PERSISTED_PREFERENCES;
    }

    const themeMode = value["theme_mode"];
    const validThemeMode =
        themeMode === "system" || themeMode === "light" || themeMode === "dark"
            ? themeMode
            : DEFAULT_PERSISTED_PREFERENCES.theme_mode;

    const languagePreference = value["language"];
    const validLanguagePreference =
        languagePreference === "system" ||
        languagePreference === "en" ||
        languagePreference === "de" ||
        languagePreference === "fr" ||
        languagePreference === "hi" ||
        languagePreference === "ja"
            ? languagePreference
            : DEFAULT_PERSISTED_PREFERENCES.language;

    const fontScale = value["font_scale"];
    const validFontScale =
        typeof fontScale === "number" && Number.isFinite(fontScale)
            ? fontScale
            : DEFAULT_PERSISTED_PREFERENCES.font_scale;

    const highContrast = value["high_contrast"];
    const validHighContrast =
        typeof highContrast === "boolean" ? highContrast : DEFAULT_PERSISTED_PREFERENCES.high_contrast;

    const dyslexicFont = value["dyslexic_font"];
    const validDyslexicFont =
        typeof dyslexicFont === "boolean" ? dyslexicFont : DEFAULT_PERSISTED_PREFERENCES.dyslexic_font;

    const fieldMode = value["field_mode"];
    const validFieldMode = typeof fieldMode === "boolean" ? fieldMode : DEFAULT_PERSISTED_PREFERENCES.field_mode;

    const hasSeenIntro = value["has_seen_intro"];
    const validHasSeenIntro =
        typeof hasSeenIntro === "boolean" ? hasSeenIntro : DEFAULT_PERSISTED_PREFERENCES.has_seen_intro;

    return {
        theme_mode: validThemeMode,
        language: validLanguagePreference,
        font_scale: validFontScale,
        high_contrast: validHighContrast,
        dyslexic_font: validDyslexicFont,
        field_mode: validFieldMode,
        has_seen_intro: validHasSeenIntro,
    };
}

/**
 * @param value Unknown value.
 * @returns True when the value is a non-null record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
