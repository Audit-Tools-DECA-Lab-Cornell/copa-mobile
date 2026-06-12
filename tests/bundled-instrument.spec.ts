import { describe, expect, it } from "vitest";

import { BUNDLED_INSTRUMENT_VERSION, getBundledInstrument } from "lib/audit/bundled-instrument";

describe("bundled instrument offline fallback", () => {
    it("validates the English payload of the multi-locale bundle and returns an instrument", () => {
        const instrument = getBundledInstrument();
        // Regression guard: the asset is `{ "en": { ...instrument } }`, so a parse
        // of the wrapper object would fail and break the offline first-launch
        // fallback. The fallback must return a usable instrument.
        expect(instrument).not.toBeNull();
        expect(instrument?.instrument_key).toBe("pvua_v5_2");
        expect(instrument?.sections.length).toBeGreaterThan(0);
    });

    it("exposes the bundled instrument version", () => {
        expect(typeof BUNDLED_INSTRUMENT_VERSION).toBe("string");
        expect(BUNDLED_INSTRUMENT_VERSION).not.toBe("unknown");
        expect(getBundledInstrument()?.instrument_version).toBe(BUNDLED_INSTRUMENT_VERSION);
    });
});
