import { mmkvStorage } from "lib/storage/mmkv";

/**
 * Device-local persistence for user preferences (theme, language, accessibility).
 * Backed by MMKV for fast synchronous read/write on iOS and Android.
 */

const PREFS_STORAGE_KEY = "playspace.preferences.v1";

/** Allowed persisted language values. */
export type PersistedLanguagePreference = "system" | "en" | "de" | "fr" | "hi" | "ja";

/** Serializable shape written to device storage. */
export interface PersistedPreferences {
    readonly theme_mode: "system" | "light" | "dark";
    readonly language: PersistedLanguagePreference;
    readonly font_scale: number;
    readonly high_contrast: boolean;
    readonly dyslexic_font: boolean;
}

const DEFAULT_PREFERENCES: PersistedPreferences = {
    theme_mode: "system",
    language: "system",
    font_scale: 1,
    high_contrast: false,
    dyslexic_font: false,
};

let memoryCache: PersistedPreferences | null = null;

/**
 * Read persisted preferences from MMKV.
 *
 * Signature is async for API compatibility with store hydration patterns,
 * even though MMKV reads are synchronous.
 *
 * @returns Stored preferences or defaults.
 */
export async function readPersistedPreferences(): Promise<PersistedPreferences> {
    if (memoryCache !== null) {
        return memoryCache;
    }

    try {
        const rawValue = mmkvStorage.getString(PREFS_STORAGE_KEY);
        if (rawValue !== undefined) {
            const parsed = parsePersistedPreferences(rawValue);
            if (parsed !== null) {
                memoryCache = parsed;
                return parsed;
            }
        }
    } catch {
        /* fall through to defaults */
    }

    return DEFAULT_PREFERENCES;
}

/**
 * Persist preferences to MMKV.
 *
 * @param prefs Preferences to persist.
 */
export async function savePersistedPreferences(prefs: PersistedPreferences): Promise<void> {
    memoryCache = prefs;
    try {
        mmkvStorage.set(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        /* non-critical — in-memory cache is already updated */
    }
}

/**
 * Apply defaults for any missing fields in a stored preference blob.
 *
 * @param value Unknown parsed JSON.
 * @returns Complete PersistedPreferences with defaults for missing fields.
 */
function applyDefaults(value: unknown): PersistedPreferences {
    if (!isRecord(value)) {
        return DEFAULT_PREFERENCES;
    }

    const themeMode = value["theme_mode"];
    const validThemeMode =
        themeMode === "system" || themeMode === "light" || themeMode === "dark"
            ? themeMode
            : DEFAULT_PREFERENCES.theme_mode;

    const languagePreference = value["language"];
    const validLanguagePreference =
        languagePreference === "system" ||
        languagePreference === "en" ||
        languagePreference === "de" ||
        languagePreference === "fr" ||
        languagePreference === "hi" ||
        languagePreference === "ja"
            ? languagePreference
            : DEFAULT_PREFERENCES.language;

    const fontScale = value["font_scale"];
    const validFontScale =
        typeof fontScale === "number" && Number.isFinite(fontScale)
            ? fontScale
            : DEFAULT_PREFERENCES.font_scale;

    const highContrast = value["high_contrast"];
    const validHighContrast =
        typeof highContrast === "boolean" ? highContrast : DEFAULT_PREFERENCES.high_contrast;

    const dyslexicFont = value["dyslexic_font"];
    const validDyslexicFont =
        typeof dyslexicFont === "boolean" ? dyslexicFont : DEFAULT_PREFERENCES.dyslexic_font;

    return {
        theme_mode: validThemeMode,
        language: validLanguagePreference,
        font_scale: validFontScale,
        high_contrast: validHighContrast,
        dyslexic_font: validDyslexicFont,
    };
}

/**
 * Parse and validate a serialized preferences payload.
 *
 * @param rawValue Raw JSON payload.
 * @returns Parsed preferences or null when invalid/missing.
 */
function parsePersistedPreferences(rawValue: string | null): PersistedPreferences | null {
    if (rawValue === null) {
        return null;
    }

    try {
        return applyDefaults(JSON.parse(rawValue));
    } catch {
        return null;
    }
}

/**
 * @param value Unknown value.
 * @returns True when the value is a non-null record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
