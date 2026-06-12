import { usePlayspaceAuditStore } from "stores/audit-store";

import type { PlayspaceInstrument } from "lib/audit/types";

/**
 * Read the instrument that should drive the current screen.
 *
 * Instrument copy is served by the backend: the synced instrument (or the
 * audit session's own embedded instrument, passed as the override) renders
 * as-is, with no client-side text overlays in any language. Instrument
 * localization happens server-side; the language-aware fetch in
 * `lib/services/instrument-sync.ts` (its `lang` parameter) is the single
 * client seam for serving other languages.
 *
 * @param baseInstrumentOverride Audit-scoped instrument that wins over the
 * app-wide active instrument when present.
 * @returns The instrument to render, or null before any instrument exists.
 */
export function useLocalizedInstrument(
    baseInstrumentOverride?: PlayspaceInstrument | null | undefined,
): PlayspaceInstrument | null {
    const activeInstrument = usePlayspaceAuditStore((state) => state.instrument);
    return baseInstrumentOverride ?? activeInstrument ?? null;
}
