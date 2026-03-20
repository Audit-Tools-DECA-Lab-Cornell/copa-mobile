import { Appearance } from "react-native";
import { create } from "zustand";
import {
    readPersistedPreferences,
    savePersistedPreferences,
    type PersistedLanguagePreference,
} from "lib/preferences/storage";

/** User-selected theme preference. */
export type ThemeMode = "system" | "light" | "dark";

/** Resolved display theme after applying system preference. */
export type ResolvedTheme = "light" | "dark";

/** User-selected language preference. */
export type LanguagePreference = PersistedLanguagePreference;

/** Minimum font scale the user can select. */
const MIN_FONT_SCALE = 0.85;

/** Maximum font scale the user can select. */
const MAX_FONT_SCALE = 1.3;

interface PreferencesStoreState {
    readonly themeMode: ThemeMode;
    readonly resolvedTheme: ResolvedTheme;
    readonly languagePreference: LanguagePreference;
    readonly fontScale: number;
    readonly highContrast: boolean;
    readonly dyslexicFont: boolean;
    readonly isHydrated: boolean;

    hydrate: () => Promise<void>;
    setThemeMode: (mode: ThemeMode) => void;
    setLanguagePreference: (language: LanguagePreference) => void;
    setFontScale: (scale: number) => void;
    setHighContrast: (enabled: boolean) => void;
    setDyslexicFont: (enabled: boolean) => void;
}

/**
 * Resolve the display theme from a user-selected mode.
 *
 * @param mode User theme preference.
 * @returns Concrete light or dark theme.
 */
function resolveTheme(mode: ThemeMode): ResolvedTheme {
    if (mode === "light" || mode === "dark") {
        return mode;
    }
    const systemScheme = Appearance.getColorScheme();
    return systemScheme === "light" ? "light" : "dark";
}

/**
 * Clamp a font scale value to the allowed range.
 *
 * @param scale Raw scale value.
 * @returns Clamped scale.
 */
function clampFontScale(scale: number): number {
    return Math.round(Math.max(MIN_FONT_SCALE, Math.min(MAX_FONT_SCALE, scale)) * 100) / 100;
}

/**
 * Persist the current state snapshot to device-local storage.
 *
 * @param state Current store snapshot.
 */
function persistState(state: PreferencesStoreState): void {
    savePersistedPreferences({
        theme_mode: state.themeMode,
        language: state.languagePreference,
        font_scale: state.fontScale,
        high_contrast: state.highContrast,
        dyslexic_font: state.dyslexicFont,
    }).catch(() => undefined);
}

/**
 * Preferences store for theme, font scaling, and accessibility options.
 */
export const usePreferencesStore = create<PreferencesStoreState>((set, get) => ({
    themeMode: "system",
    resolvedTheme: resolveTheme("system"),
    languagePreference: "system",
    fontScale: 1.0,
    highContrast: false,
    dyslexicFont: false,
    isHydrated: false,

    hydrate: async () => {
        if (get().isHydrated) {
            return;
        }

        try {
            const persisted = await readPersistedPreferences();
            set(() => ({
                themeMode: persisted.theme_mode,
                resolvedTheme: resolveTheme(persisted.theme_mode),
                languagePreference: persisted.language,
                fontScale: clampFontScale(persisted.font_scale),
                highContrast: persisted.high_contrast,
                dyslexicFont: persisted.dyslexic_font,
                isHydrated: true,
            }));
        } catch {
            set(() => ({
                isHydrated: true,
            }));
        }
    },

    setThemeMode: (mode: ThemeMode) => {
        set(() => ({ themeMode: mode, resolvedTheme: resolveTheme(mode) }));
        persistState(get());
    },

    setLanguagePreference: (language: LanguagePreference) => {
        set(() => ({ languagePreference: language }));
        persistState(get());
    },

    setFontScale: (scale: number) => {
        set(() => ({ fontScale: clampFontScale(scale) }));
        persistState(get());
    },

    setHighContrast: (enabled: boolean) => {
        set(() => ({ highContrast: enabled }));
        persistState(get());
    },

    setDyslexicFont: (enabled: boolean) => {
        set(() => ({ dyslexicFont: enabled }));
        persistState(get());
    },
}));
