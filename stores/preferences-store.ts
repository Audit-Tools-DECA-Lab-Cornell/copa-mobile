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

/**
 * The user-editable subset of preferences that the settings screen stages
 * locally and commits in one batch. Keeping these together lets a screen
 * preview draft changes without touching the global store until the user saves.
 */
export interface EditablePreferences {
    readonly themeMode: ThemeMode;
    readonly languagePreference: LanguagePreference;
    readonly fontScale: number;
    readonly highContrast: boolean;
    readonly dyslexicFont: boolean;
    readonly fieldMode: boolean;
}

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
    readonly fieldMode: boolean;
    readonly hasSeenIntro: boolean;
    readonly isHydrated: boolean;

    hydrate: () => Promise<void>;
    applyPreferences: (next: EditablePreferences) => void;
    markIntroSeen: () => void;
}

/**
 * Resolve the display theme from a user-selected mode.
 *
 * Exported so screens that preview a draft theme (before it is committed to the
 * store) can resolve "system" the same way the store does.
 *
 * @param mode User theme preference.
 * @returns Concrete light or dark theme.
 */
export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
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
 * The live i18n language is applied by the root layout in response to
 * `languagePreference` changes, so persistence only writes to disk.
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
        field_mode: state.fieldMode,
        has_seen_intro: state.hasSeenIntro,
    }).catch(() => undefined);
}

/**
 * Preferences store for theme, font scaling, and accessibility options.
 */
export const usePreferencesStore = create<PreferencesStoreState>((set, get) => ({
    themeMode: "system",
    resolvedTheme: resolveThemeMode("system"),
    languagePreference: "system",
    fontScale: 1,
    highContrast: false,
    dyslexicFont: false,
    fieldMode: false,
    hasSeenIntro: false,
    isHydrated: false,

    hydrate: async () => {
        if (get().isHydrated) {
            return;
        }

        try {
            const persisted = await readPersistedPreferences();
            set(() => ({
                themeMode: persisted.theme_mode,
                resolvedTheme: resolveThemeMode(persisted.theme_mode),
                languagePreference: persisted.language,
                fontScale: clampFontScale(persisted.font_scale),
                highContrast: persisted.high_contrast,
                dyslexicFont: persisted.dyslexic_font,
                fieldMode: persisted.field_mode,
                hasSeenIntro: persisted.has_seen_intro,
                isHydrated: true,
            }));
        } catch {
            set(() => ({
                isHydrated: true,
            }));
        }
    },

    /**
     * Commit a staged set of user preferences in a single update.
     *
     * The settings screen previews draft changes locally and only calls this on
     * save, so the global store (and the app-wide re-render it triggers) is
     * touched exactly once instead of on every keystroke or slider tick.
     */
    applyPreferences: (next: EditablePreferences) => {
        set(() => ({
            themeMode: next.themeMode,
            resolvedTheme: resolveThemeMode(next.themeMode),
            languagePreference: next.languagePreference,
            fontScale: clampFontScale(next.fontScale),
            highContrast: next.highContrast,
            dyslexicFont: next.dyslexicFont,
            fieldMode: next.fieldMode,
        }));
        persistState(get());
    },

    markIntroSeen: () => {
        set(() => ({ hasSeenIntro: true }));
        persistState(get());
    },
}));

// Track live OS appearance changes so "system" mode follows the device the
// moment it flips (e.g. sunset auto dark mode). Manual light/dark modes are
// left untouched. Registered once at module scope for the app's lifetime.
Appearance.addChangeListener(() => {
    const { themeMode, resolvedTheme } = usePreferencesStore.getState();
    if (themeMode !== "system") {
        return;
    }
    const nextResolvedTheme = resolveThemeMode("system");
    if (nextResolvedTheme !== resolvedTheme) {
        usePreferencesStore.setState({ resolvedTheme: nextResolvedTheme });
    }
});
