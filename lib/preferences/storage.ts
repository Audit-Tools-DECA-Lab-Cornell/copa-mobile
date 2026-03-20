import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * Device-local persistence for user preferences (theme, language, accessibility, etc.).
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

interface SecureStoreApi {
    readonly setItemAsync: (key: string, value: string) => Promise<void>;
    readonly getItemAsync: (key: string) => Promise<string | null>;
    readonly isAvailableAsync?: () => Promise<boolean>;
}

type SetValueWithKeyAsyncFunction = (
    value: string,
    key: string,
    options?: Record<string, unknown>,
) => Promise<void>;
type GetValueWithKeyAsyncFunction = (
    key: string,
    options?: Record<string, unknown>,
) => Promise<string | null>;

const DEFAULT_PREFERENCES: PersistedPreferences = {
    theme_mode: "system",
    language: "system",
    font_scale: 1,
    high_contrast: false,
    dyslexic_font: false,
};

let memoryCache: PersistedPreferences | null = null;
let secureStoreApiCache: SecureStoreApi | null | undefined;

/**
 * Read persisted preferences from device storage.
 *
 * @returns Stored preferences or defaults.
 */
export async function readPersistedPreferences(): Promise<PersistedPreferences> {
    if (memoryCache !== null) {
        return memoryCache;
    }

    const localStorageApi = resolveLocalStorage();
    if (localStorageApi !== null) {
        try {
            const rawValue = localStorageApi.getItem(PREFS_STORAGE_KEY);
            const parsedValue = parsePersistedPreferences(rawValue);
            if (parsedValue !== null) {
                memoryCache = parsedValue;
                return parsedValue;
            }
        } catch {
            /* fall through to secure store or defaults */
        }
    }

    const secureStoreApi = await resolveSecureStoreApi();
    if (secureStoreApi === null) {
        return DEFAULT_PREFERENCES;
    }

    try {
        const rawValue = await secureStoreApi.getItemAsync(PREFS_STORAGE_KEY);
        const parsedValue = parsePersistedPreferences(rawValue);
        if (parsedValue !== null) {
            memoryCache = parsedValue;
            return parsedValue;
        }
    } catch {
        /* ignore and fall back to defaults */
    }

    return DEFAULT_PREFERENCES;
}

/**
 * Persist preferences to device storage.
 *
 * @param prefs Preferences to persist.
 */
export async function savePersistedPreferences(prefs: PersistedPreferences): Promise<void> {
    memoryCache = prefs;
    const serializedPreferences = JSON.stringify(prefs);

    const localStorageApi = resolveLocalStorage();
    if (localStorageApi !== null) {
        try {
            localStorageApi.setItem(PREFS_STORAGE_KEY, serializedPreferences);
            return;
        } catch {
            /* fall through to secure store */
        }
    }

    const secureStoreApi = await resolveSecureStoreApi();
    if (secureStoreApi === null) {
        return;
    }

    try {
        await secureStoreApi.setItemAsync(PREFS_STORAGE_KEY, serializedPreferences);
    } catch {
        /* non-critical - in-memory cache is already updated */
    }
}

/**
 * Apply defaults for any missing fields in a stored preference blob.
 * This ensures forward-compatibility when new fields are added.
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
 * Resolve secure-store safely for native runtimes.
 *
 * @returns Normalized secure-store API when available.
 */
async function resolveSecureStoreApi(): Promise<SecureStoreApi | null> {
    if (secureStoreApiCache !== undefined) {
        return secureStoreApiCache;
    }

    try {
        const optionalNativeModule: unknown = requireOptionalNativeModule("ExpoSecureStore");
        const resolvedApi = toSecureStoreApi(optionalNativeModule);
        if (resolvedApi === null) {
            secureStoreApiCache = null;
            return null;
        }

        const isAvailable = resolvedApi.isAvailableAsync
            ? await resolvedApi.isAvailableAsync()
            : true;
        secureStoreApiCache = isAvailable ? resolvedApi : null;
        return secureStoreApiCache;
    } catch {
        secureStoreApiCache = null;
        return null;
    }
}

/**
 * Resolve the device-local Storage API when available.
 *
 * @returns Storage API or null on native runtimes without web storage.
 */
function resolveLocalStorage(): Storage | null {
    if (globalThis.localStorage === undefined) {
        return null;
    }
    return globalThis.localStorage;
}

/**
 * Normalize optional secure-store modules across Expo runtimes.
 *
 * @param value Unknown optional native module.
 * @returns Normalized API or null when unavailable.
 */
function toSecureStoreApi(value: unknown): SecureStoreApi | null {
    if (!isRecord(value)) {
        return null;
    }

    if (isSecureStoreApi(value)) {
        return value;
    }

    const setValueWithKeyAsync = toSetValueWithKeyAsyncFunction(value.setValueWithKeyAsync);
    const getValueWithKeyAsync = toGetValueWithKeyAsyncFunction(value.getValueWithKeyAsync);
    if (setValueWithKeyAsync === null || getValueWithKeyAsync === null) {
        return null;
    }

    const isAvailableAsync = toIsAvailableAsyncFunction(value.isAvailableAsync);
    return {
        setItemAsync: async (key: string, storedValue: string) => {
            await setValueWithKeyAsync(storedValue, key);
        },
        getItemAsync: async (key: string) => {
            return await getValueWithKeyAsync(key);
        },
        ...(isAvailableAsync === null ? {} : { isAvailableAsync }),
    };
}

/**
 * Validate imported secure-store module shape.
 *
 * @param value Unknown imported module.
 * @returns True when the required methods are present.
 */
function isSecureStoreApi(value: unknown): value is SecureStoreApi {
    if (!isRecord(value)) {
        return false;
    }

    return typeof value.setItemAsync === "function" && typeof value.getItemAsync === "function";
}

/**
 * Check that an unknown value is a non-null object map.
 *
 * @param value Unknown value.
 * @returns True when the value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/**
 * Coerce unknown values to the legacy secure-store setter signature.
 *
 * @param value Unknown function value.
 * @returns Typed function or null.
 */
function toSetValueWithKeyAsyncFunction(value: unknown): SetValueWithKeyAsyncFunction | null {
    return typeof value === "function" ? (value as SetValueWithKeyAsyncFunction) : null;
}

/**
 * Coerce unknown values to the legacy secure-store getter signature.
 *
 * @param value Unknown function value.
 * @returns Typed function or null.
 */
function toGetValueWithKeyAsyncFunction(value: unknown): GetValueWithKeyAsyncFunction | null {
    return typeof value === "function" ? (value as GetValueWithKeyAsyncFunction) : null;
}

/**
 * Coerce unknown values to the secure-store availability checker signature.
 *
 * @param value Unknown function value.
 * @returns Typed function or null.
 */
function toIsAvailableAsyncFunction(value: unknown): (() => Promise<boolean>) | null {
    return typeof value === "function" ? (value as () => Promise<boolean>) : null;
}
