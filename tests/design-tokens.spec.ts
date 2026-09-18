import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SCALE_ACCENT_COLORS, CONSTRUCT_ACCENT_COLORS } from "lib/audit/scale-colors";
import {
    GENERATED_CONSTRUCT_ACCENTS,
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

/**
 * Phase 2 moved colour literals that were scattered across the export pipeline
 * and the native config into `brand/tokens.json`. Like phase 1, it is meant to be
 * a no-op: the tokens must still resolve to exactly what those files hard-coded.
 *
 * The literals below are transcribed from the pre-phase-2 source and are expected
 * to change in phase 3, deliberately, alongside the tokens.
 */
describe("phase 2 token groups", () => {
    it("preserves the export document palette verbatim", () => {
        expect(GENERATED_EXPORT_DOCUMENT_COLORS).toEqual({
            headerFill: "#1F2937",
            headerText: "#FFFFFF",
            sectionFill: "#E2E8F0",
            sectionTitleText: "#0F172A",
            sectionText: "#0F172A",
            sectionInstructionText: "#4B5362",
            sectionNotesText: "#6B7280",
            rowEven: "#F8FAFC",
            rowOdd: "#FFFFFF",
            bodyText: "#1F2937",
            sheetBodyText: "#334155",
            mutedText: "#6B7280",
            border: "#E2E8F0",
            borderStrong: "#94A3B8",
            summaryFill: "#333F55",
            summaryText: "#FFFFFF",
            summaryNeutralFill: "#F1F5F9",
            scoreAccentText: "#1F2937",
            subtitleText: "#cbd5e1",
        });
    });

    it("keeps the live export palette wired to those tokens", () => {
        expect(WEB_AUDIT_EXPORT_PALETTE.headerFill).toBe(GENERATED_EXPORT_DOCUMENT_COLORS.headerFill);
        expect(WEB_AUDIT_EXPORT_PALETTE.subtitleText).toBe(GENERATED_EXPORT_DOCUMENT_COLORS.subtitleText);
        expect(WEB_AUDIT_EXPORT_PALETTE.summaryFill).toBe(GENERATED_EXPORT_DOCUMENT_COLORS.summaryFill);
    });

    /**
     * The splash screen and adaptive-icon background render before any JS runs,
     * so app.config.js bakes these into the native build. A recolour that misses
     * them leaves the app launching in the old palette.
     */
    it("preserves the native launch colours verbatim", () => {
        expect(GENERATED_NATIVE_SPLASH_COLORS).toEqual({
            light: "#F7F1EB",
            dark: "#0E0E0E",
            adaptiveIconBackground: "#F7F1EB",
        });
    });
});

/**
 * Shadows, glass and the modal scrim are mostly warm-tinted, not neutral black or
 * white - the dark glass is rgba(36,32,29) and the light accent glow is terracotta.
 * Nothing rendered would error if a recolour skipped them; the app would just keep
 * brown edges on every elevated surface and on the tab bar, which is exactly the
 * kind of leftover this phase exists to prevent.
 */
describe("mobile surface tokens", () => {
    it("preserves the shadow, glass and scrim values verbatim", () => {
        expect(GENERATED_MOBILE_SURFACE_COLORS).toEqual({
            darkShadowCard: "rgba(0, 0, 0, 0.14)",
            darkShadowAccent: "rgba(197, 138, 92, 0.12)",
            darkGlassSurface: "rgba(36, 32, 29, 0.74)",
            darkGlassBorder: "rgba(231, 222, 211, 0.2)",
            darkGlassShadow: "rgba(0, 0, 0, 0.24)",
            darkTabBarSurface: "rgba(22, 19, 17, 0.84)",
            darkTabBarBorder: "rgba(231, 222, 211, 0.14)",
            lightShadowCard: "rgba(60, 48, 42, 0.08)",
            lightShadowAccent: "rgba(176, 106, 56, 0.2)",
            lightGlassSurface: "rgba(255, 255, 255, 0.76)",
            lightGlassBorder: "rgba(42, 35, 30, 0.12)",
            lightGlassShadow: "rgba(60, 48, 42, 0.12)",
            lightTabBarSurface: "rgba(255, 255, 255, 0.72)",
            lightTabBarBorder: "rgba(42, 35, 30, 0.1)",
            modalScrim: "rgba(7, 9, 11, 0.55)",
        });
    });
});
