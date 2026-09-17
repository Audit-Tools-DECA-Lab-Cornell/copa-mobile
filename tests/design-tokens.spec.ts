import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SCALE_ACCENT_COLORS, CONSTRUCT_ACCENT_COLORS } from "lib/audit/scale-colors";
import { GENERATED_CONSTRUCT_ACCENTS, GENERATED_PALETTES, GENERATED_SCALE_ACCENTS } from "lib/design-system.generated";

import { GENERATED_DARK_RAMP, GENERATED_LIGHT_RAMP } from "../themes.generated";
import baseline from "./fixtures/design-tokens-baseline.json";

const ROOT = path.resolve(__dirname, "..");

/**
 * Phase 1 of the colour migration moved every palette value into
 * `brand/tokens.json` and generates the theme modules from it.
 *
 * These tests are what make that refactor provable rather than hopeful: the
 * generated tokens must resolve to exactly the values the hand-written palettes
 * produced before the move. They are expected - and required - to fail when the
 * palette itself changes; update the fixture in the same commit as the tokens.
 */
describe("generated design tokens", () => {
    it("reproduces the frozen pre-migration palettes for every mode", () => {
        expect(Object.keys(GENERATED_PALETTES).sort()).toEqual(Object.keys(baseline.palettes).sort());

        for (const [mode, palette] of Object.entries(baseline.palettes)) {
            expect(GENERATED_PALETTES[mode as keyof typeof GENERATED_PALETTES], `palette drift in ${mode}`).toEqual(
                palette,
            );
        }
    });

    it("keeps every mode on the same token set", () => {
        const expected = Object.keys(baseline.palettes.dark).sort();

        for (const mode of Object.keys(GENERATED_PALETTES) as (keyof typeof GENERATED_PALETTES)[]) {
            expect(Object.keys(GENERATED_PALETTES[mode]).sort(), `${mode} is missing tokens`).toEqual(expected);
        }
    });

    it("reproduces the Tamagui ramps that drive every $1-$12 token", () => {
        expect(GENERATED_DARK_RAMP).toEqual(baseline.tamaguiRamp.dark);
        expect(GENERATED_LIGHT_RAMP).toEqual(baseline.tamaguiRamp.light);
        expect(GENERATED_DARK_RAMP).toHaveLength(12);
        expect(GENERATED_LIGHT_RAMP).toHaveLength(12);
    });

    it("resolves scale and construct accents through the token file", () => {
        expect(SCALE_ACCENT_COLORS).toEqual(GENERATED_SCALE_ACCENTS);
        expect(SCALE_ACCENT_COLORS).toEqual(baseline.scaleAccents);
        expect(CONSTRUCT_ACCENT_COLORS).toEqual(GENERATED_CONSTRUCT_ACCENTS);
        expect(CONSTRUCT_ACCENT_COLORS).toEqual(baseline.constructAccents);
    });
});

/**
 * `brand/tokens.json` here is a vendored copy of copa-frontend's canonical file.
 * The generator stamps the payload checksum into each generated module, so a
 * copy that fell behind shows up as a checksum mismatch rather than as colours
 * quietly diverging between the two apps.
 */
describe("vendored token file", () => {
    it("matches the checksum stamped into the generated modules", () => {
        const stamped = readFileSync(path.join(ROOT, "lib/design-system.generated.ts"), "utf8").match(
            /checksum ([0-9a-f]{16})/,
        );
        const themeStamped = readFileSync(path.join(ROOT, "themes.generated.ts"), "utf8").match(
            /checksum ([0-9a-f]{16})/,
        );

        expect(stamped?.[1]).toBeDefined();
        expect(themeStamped?.[1]).toBe(stamped?.[1]);
    });

    it("records the known cross-client divergences instead of hiding them", () => {
        const tokens = JSON.parse(readFileSync(path.join(ROOT, "brand/tokens.json"), "utf8"));
        const drifted = tokens.knownDrift.map((entry: { token: string }) => entry.token);

        // `challenge` ships a different colour on each client today. Phase 4 unifies
        // it; until then the divergence must stay declared, not silently inherited.
        expect(drifted).toContain("scales.challenge");
        expect(tokens.scales.platformOverrides.challenge).toEqual({
            web: "#B45309",
            mobile: "#0C4767",
        });
        expect(SCALE_ACCENT_COLORS.challenge).toBe(tokens.scales.platformOverrides.challenge.mobile);
    });
});
