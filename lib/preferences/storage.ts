import { mmkvStorage } from "lib/storage/mmkv";
import {
    DEFAULT_PERSISTED_PREFERENCES,
    normalizePersistedPreferences,
    type PersistedPreferences,
} from "lib/preferences/storage-schema";

export type {
    PersistedLanguagePreference,
    PersistedPreferences,
} from "lib/preferences/storage-schema";

/**
 * Device-local persistence for user preferences (theme, language, accessibility).
 * Backed by MMKV for fast synchronous read/write on iOS and Android.
 */

const PREFS_STORAGE_KEY = "playspace.preferences.v1";

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

    return DEFAULT_PERSISTED_PREFERENCES;
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
        return normalizePersistedPreferences(JSON.parse(rawValue));
    } catch {
        return null;
    }
}
