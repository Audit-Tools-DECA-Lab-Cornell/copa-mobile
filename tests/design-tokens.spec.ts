import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SCALE_ACCENT_COLORS, CONSTRUCT_ACCENT_COLORS } from "lib/audit/scale-colors";
import {
    GENERATED_CONSTRUCT_ACCENTS,
    GENERATED_DEFAULTS,
    GENERATED_EXPORT_DOCUMENT_COLORS,
    GENERATED_MOBILE_SURFACE_COLORS,
    GENERATED_NATIVE_SPLASH_COLORS,
    GENERATED_PALETTES,
    GENERATED_SCALE_ACCENTS,
} from "lib/design-system.generated";
import { WEB_AUDIT_EXPORT_PALETTE } from "lib/exports/reports/types";

import { GENERATED_DARK_RAMP, GENERATED_LIGHT_RAMP } from "../themes.generated";
import baseline from "./fixtures/design-tokens-baseline.json";

const ROOT = path.resolve(__dirname, "..");

/** @returns The checksum copa-frontend stamped into the token file, if any. */
function metaChecksum(tokens: { meta?: { checksum?: string } }): string | undefined {
    return tokens.meta?.checksum;
}

/**
 * The fixture is a drift guard: the generated modules must resolve to exactly the
 * values the palette shipped with. It is expected - and required - to fail when the
 * palette changes on purpose; re-vendor brand/tokens.json from copa-frontend and
 * regenerate it with `node scripts/build-token-baseline.mjs` in the same commit.
 */
describe("generated design tokens", () => {
    it("reproduces the committed palettes for every mode", () => {
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

    /**
     * The theme the app opens on when the system expresses no preference. It used to
     * be a literal in the preferences store, which meant the default and the palettes
     * that default resolves to could drift apart; it is generated now.
     */
    it("opens on the theme the token file names", () => {
        expect(GENERATED_DEFAULTS.theme).toBe(baseline.defaultTheme);
        expect(GENERATED_PALETTES[GENERATED_DEFAULTS.theme]).toBeDefined();
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
    /**
     * copa-frontend owns brand/tokens.json and stamps meta.checksum with a hash of
     * the token payload. Without this assertion, colour could be edited in this
     * repo, regenerated, and sail through CI green while shipping a different
     * value than the web app - which is exactly how `challenge` drifted.
     */
    it("carries a stamp that matches its own payload", () => {
        const tokens = JSON.parse(readFileSync(path.join(ROOT, "brand/tokens.json"), "utf8"));
        const { meta: _meta, ...payload } = tokens;
        const actual = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);

        expect(
            metaChecksum(tokens),
            "brand/tokens.json was edited in this repo - colour is owned by copa-frontend",
        ).toBe(actual);
    });

    it("matches the checksum stamped into the generated modules", () => {
        const stamped = readFileSync(path.join(ROOT, "lib/design-system.generated.ts"), "utf8").match(
            /checksum ([0-9a-f]{16})/,
        );
        const themeStamped = readFileSync(path.join(ROOT, "themes.generated.ts"), "utf8").match(
            /checksum ([0-9a-f]{16})/,
        );
        const tokens = JSON.parse(readFileSync(path.join(ROOT, "brand/tokens.json"), "utf8"));

        expect(stamped?.[1]).toBeDefined();
        expect(themeStamped?.[1]).toBe(stamped?.[1]);
        expect(stamped?.[1]).toBe(metaChecksum(tokens));
    });

    it("records the known cross-client divergences instead of hiding them", () => {
        const tokens = JSON.parse(readFileSync(path.join(ROOT, "brand/tokens.json"), "utf8"));
        const drifted = tokens.knownDrift.map((entry: { token: string }) => entry.token);

        // `challenge` used to ship a different colour on each client. Phase 3 gave both
        // the same value; the entry stays until phase 4 removes the override block
        // itself, and this asserts the two sides cannot drift apart again in between.
        expect(drifted).toContain("scales.challenge");
        expect(tokens.scales.platformOverrides.challenge.mobile).toBe(tokens.scales.platformOverrides.challenge.web);
        expect(SCALE_ACCENT_COLORS.challenge).toBe(tokens.scales.platformOverrides.challenge.mobile);
    });
});

/**
 * Phases 1-2 froze the pre-migration literals to prove the token pipeline was a
 * no-op refactor. Phase 3 changed them all on purpose, so transcribing the new
 * values here would only assert that the generator agrees with itself.
 *
 * What is worth pinning is the intent: these groups have to stay wired to the
 * token file, and the palettes have to stay readable. Neither is satisfiable by
 * accident.
 */
const CONTRAST_FLOOR = 4.5;

/** Channel values of an opaque `#rrggbb`, 0-255. */
function channels(hex: string): [number, number, number] {
    return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
}

function relativeLuminance(hex: string): number {
    const [red, green, blue] = channels(hex).map((value) => {
        const c = value / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG 2.x contrast ratio. Both arguments must be opaque `#rrggbb`. */
function contrastRatio(a: string, b: string): number {
    const luminances = [relativeLuminance(a), relativeLuminance(b)];
    const high = Math.max(...luminances);
    const low = Math.min(...luminances);
    return (high + 0.05) / (low + 0.05);
}

describe("palette legibility", () => {
    const TEXT = ["foreground", "mutedForeground", "secondaryForeground", "placeholderColor"] as const;
    const SURFACES = ["background", "surface", "surfaceMuted", "mutedSurface", "input"] as const;

    it.each(Object.keys(GENERATED_PALETTES) as (keyof typeof GENERATED_PALETTES)[])(
        "%s keeps text readable on every one of its own surfaces",
        (mode) => {
            const palette = GENERATED_PALETTES[mode];

            for (const text of TEXT) {
                for (const surface of SURFACES) {
                    const ratio = contrastRatio(palette[text], palette[surface]);
                    expect(ratio, `${mode}: ${text} on ${surface}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
                }
            }
        },
    );

    it.each(Object.keys(GENERATED_PALETTES) as (keyof typeof GENERATED_PALETTES)[])(
        "%s keeps its status and accent colours readable",
        (mode) => {
            const palette = GENERATED_PALETTES[mode];

            for (const token of ["primary", "success", "warning", "danger", "info", "violet"] as const) {
                for (const surface of ["background", "surface"] as const) {
                    const ratio = contrastRatio(palette[token], palette[surface]);
                    expect(ratio, `${mode}: ${token} on ${surface}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
                }
            }

            const onPrimary = contrastRatio(palette.primaryForeground, palette.primary);
            expect(onPrimary, `${mode}: primaryForeground on primary`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
        },
    );

    /**
     * `amber` is a border colour (the login notice draws its outline with it) and
     * `amberSoft` the fill behind it. Before phase 3 every palette but `light` set
     * `amber` to a 10% tint, so the outline was invisible in the app's default theme.
     */
    it.each(Object.keys(GENERATED_PALETTES) as (keyof typeof GENERATED_PALETTES)[])(
        "%s gives the amber notice a border you can actually see",
        (mode) => {
            const palette = GENERATED_PALETTES[mode];
            expect(palette.amber, `${mode}: amber must be an opaque border colour`).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(contrastRatio(palette.amber, palette.surface), `${mode}: amber on surface`).toBeGreaterThanOrEqual(
                3,
            );
        },
    );
});

describe("token groups stay wired", () => {
    it("keeps the live export palette reading the export document tokens", () => {
        expect(WEB_AUDIT_EXPORT_PALETTE.headerFill).toBe(GENERATED_EXPORT_DOCUMENT_COLORS.headerFill);
        expect(WEB_AUDIT_EXPORT_PALETTE.subtitleText).toBe(GENERATED_EXPORT_DOCUMENT_COLORS.subtitleText);
        expect(WEB_AUDIT_EXPORT_PALETTE.summaryFill).toBe(GENERATED_EXPORT_DOCUMENT_COLORS.summaryFill);
    });

    /** Documents print on white and are read outside the app, so they do not follow the theme. */
    it("keeps export document text readable on the page it prints on", () => {
        const doc = GENERATED_EXPORT_DOCUMENT_COLORS;
        const pairs: readonly (readonly [keyof typeof doc, keyof typeof doc])[] = [
            ["headerText", "headerFill"],
            ["subtitleText", "headerFill"],
            ["summaryText", "summaryFill"],
            ["sectionTitleText", "sectionFill"],
            ["sectionText", "sectionFill"],
            ["bodyText", "rowEven"],
            ["bodyText", "rowOdd"],
            ["sheetBodyText", "rowEven"],
            ["mutedText", "rowEven"],
            ["scoreAccentText", "summaryNeutralFill"],
        ];

        for (const [text, fill] of pairs) {
            expect(contrastRatio(doc[text], doc[fill]), `${text} on ${fill}`).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
        }
    });

    /**
     * The splash screen and adaptive-icon background render before any JS runs, so
     * app.config.js bakes these into the native build. A recolour that misses them
     * leaves the app launching in the old palette and then flipping.
     */
    it("launches on the same colours the app then renders", () => {
        expect(GENERATED_NATIVE_SPLASH_COLORS.dark).toBe(GENERATED_PALETTES.dark.background);
        expect(GENERATED_NATIVE_SPLASH_COLORS.light).toBe(GENERATED_PALETTES.light.background);
        // The adaptive-icon background is deliberately still the light plate the
        // current foreground mark was drawn for - see knownDrift, phase 5.
        expect(GENERATED_NATIVE_SPLASH_COLORS.adaptiveIconBackground).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    /**
     * Shadows, glass and the modal scrim were warm-tinted rather than neutral - the
     * dark glass was rgba(36,32,29) and the light accent glow terracotta. Nothing
     * would error if a recolour skipped them; the app would just keep brown edges on
     * every elevated surface and on the tab bar. So they are asserted against the
     * palette they are meant to be tints of, not against transcribed values.
     */
    it("derives the tinted surfaces from the palette they sit on", () => {
        const rgb = (hex: string) => channels(hex).join(", ");
        const surfaces = GENERATED_MOBILE_SURFACE_COLORS;

        expect(surfaces.darkGlassSurface).toContain(rgb(GENERATED_PALETTES.dark.surface));
        expect(surfaces.darkTabBarSurface).toContain(rgb(GENERATED_PALETTES.dark.background));
        expect(surfaces.darkGlassBorder).toContain(rgb(GENERATED_PALETTES.dark.foreground));
        expect(surfaces.darkShadowAccent).toContain(rgb(GENERATED_PALETTES.dark.primary));
        expect(surfaces.lightShadowAccent).toContain(rgb(GENERATED_PALETTES.light.primary));
        expect(surfaces.lightGlassBorder).toContain(rgb(GENERATED_PALETTES.light.foreground));

        for (const [name, value] of Object.entries(surfaces)) {
            expect(value, `${name} must be a colour`).toMatch(/^(#[0-9A-Fa-f]{6}|rgba?\()/);
        }
    });
});
