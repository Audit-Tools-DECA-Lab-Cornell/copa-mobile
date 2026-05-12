/**
 * Bundled fallback instrument definition.
 *
 * The instrument JSON is shipped as an app asset so auditors can render
 * the audit form even on first launch with no internet connection.  When
 * a newer version is later fetched from the API, the store and MMKV cache
 * replace this fallback.  The bundled copy is only used when:
 *
 *   1. No per-user audit state has been persisted (first launch / cleared data).
 *   2. The dedicated instrument MMKV cache is empty.
 *   3. The network is unreachable.
 *
 * The file is validated once at import time — if the embedded JSON somehow
 * fails schema validation (e.g. a bad build), the fallback gracefully
 * returns null instead of crashing the app.
 */

import { createModuleLogger } from "lib/logger";
import { playspaceInstrumentSchema, type PlayspaceInstrument } from "lib/audit/types";

import rawBundledInstrument from "assets/bundled-instrument.json";

const log = createModuleLogger("bundled-instrument");

let validatedInstrument: PlayspaceInstrument | null | undefined;

/**
 * Return the app-bundled instrument fallback.
 *
 * Parsing is deferred to first call and cached for subsequent access.
 * Returns `null` only when the embedded JSON fails schema validation.
 *
 * @returns The bundled instrument, or null on validation failure.
 */
export function getBundledInstrument(): PlayspaceInstrument | null {
    if (validatedInstrument !== undefined) {
        return validatedInstrument;
    }

    const parsed = playspaceInstrumentSchema.safeParse(rawBundledInstrument);
    if (!parsed.success) {
        log.warn("bundled instrument failed schema validation — offline fallback unavailable");
        validatedInstrument = null;
        return null;
    }

    validatedInstrument = parsed.data;
    return validatedInstrument;
}

/**
 * The instrument version baked into the app bundle.
 *
 * Useful for comparing against the server's active version when deciding
 * whether to show a "newer instrument available" notice.
 */
export const BUNDLED_INSTRUMENT_VERSION: string = rawBundledInstrument["en"].instrument_version ?? "unknown";
