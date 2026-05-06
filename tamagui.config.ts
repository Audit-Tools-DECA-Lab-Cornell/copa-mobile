import { defaultConfig } from "@tamagui/config/v5";
import { createAnimations } from "@tamagui/animations-react-native";
import { createFont, createTamagui, type Variable } from "tamagui";
import { themes } from "./themes";

const FONT_SIZE_DECREMENT = 1;
const FONT_LINE_HEIGHT_DECREMENT = 2;
const MINIMUM_FONT_SIZE = 10;
const MINIMUM_LINE_HEIGHT = 12;

// Accent color tokens — semantic, role-locked.
// Terracotta = interactive, Moss = scores/outcomes, Slate = info, Violet = methodology.
// See PVUA_DESIGN_SYSTEM_PHASE1.md §1.4.
const accentColors = {
    accentTerracotta: "#c58a5c",
    accentMoss: "#5e9470",
    accentSlate: "#7a90b7",
    accentViolet: "#9b86b2",

    accentTerracottaSurface: "rgba(197, 138, 92, 0.12)",
    accentMossSurface: "rgba(94, 148, 112, 0.12)",
    accentSlateSurface: "rgba(122, 144, 183, 0.12)",
    accentVioletSurface: "rgba(155, 134, 178, 0.12)",

    accentTerracottaBorder: "rgba(197, 138, 92, 0.28)",
    accentMossBorder: "rgba(94, 148, 112, 0.28)",
    accentSlateBorder: "rgba(122, 144, 183, 0.28)",
    accentVioletBorder: "rgba(155, 134, 178, 0.28)",

    accentTerracottaLight: "#a86332",
    accentMossLight: "#3d7554",
    accentSlateLight: "#4d6a9a",
    accentVioletLight: "#6b52a0",
} as const;

type FontMetricValue = number | Variable<number>;
type FontMetricScale = Readonly<Record<string, FontMetricValue>>;

/**
 * Resolve a Tamagui font metric token into a numeric value.
 *
 * @param value Raw font metric token from the base config.
 * @returns Numeric value that can be adjusted safely.
 */
function getFontMetricValue(value: FontMetricValue): number {
    return typeof value === "number" ? value : value.val;
}

/**
 * Reduce a Tamagui numeric metric scale while preserving a minimum floor.
 *
 * @param scale Font size or line-height token map from the base config.
 * @param decrement Amount to subtract from each numeric token.
 * @param minimumValue Smallest value allowed after reduction.
 * @returns A new metric scale with slightly smaller values.
 */
function shrinkFontMetricScale<TScale extends FontMetricScale>(
    scale: TScale,
    decrement: number,
    minimumValue: number,
): Record<string, number> {
    return Object.fromEntries(
        Object.entries(scale).map(([token, value]) => {
            return [token, Math.max(getFontMetricValue(value) - decrement, minimumValue)];
        }),
    );
}

/**
 * Create a Tamagui font token backed by a single native family.
 *
 * @param family Native font family name loaded through `expo-font`.
 * @param sourceFont Base Tamagui font token to inherit sizing from.
 * @returns Tamagui font configuration for the given family.
 */
function createStaticFont(family: string, sourceFont: typeof defaultConfig.fonts.body) {
    return createFont({
        ...sourceFont,
        family,
        size: shrinkFontMetricScale(sourceFont.size, FONT_SIZE_DECREMENT, MINIMUM_FONT_SIZE),
        lineHeight: shrinkFontMetricScale(sourceFont.lineHeight, FONT_LINE_HEIGHT_DECREMENT, MINIMUM_LINE_HEIGHT),
        face: {
            400: { normal: family },
            500: { normal: family },
            600: { normal: family },
            700: { normal: family },
        },
    });
}

/**
 * Create a fixed-purpose font with constant size, weight, and letter spacing.
 *
 * Used for design-system roles like eyebrows, badges, and counters where the
 * size token (`$1`, `$true`, etc.) should not affect the rendered size — every
 * token resolves to the same canonical metric.
 *
 * @param family Native font family name loaded through `expo-font`.
 * @param sourceFont Base Tamagui font token to inherit shape from.
 * @param fontSize Fixed pixel size for every size token.
 * @param weight Fixed font weight as a numeric string ("400" | "500" | etc.).
 * @param letterSpacingPx Fixed letter spacing in pixels (0.48 ≈ 0.03em at 16px).
 */
function createPurposeFont(
    family: string,
    sourceFont: typeof defaultConfig.fonts.body,
    fontSize: number,
    weight: "400" | "500" | "600" | "700",
    letterSpacingPx: number,
) {
    const sizeMap = Object.fromEntries(Object.keys(sourceFont.size).map((token) => [token, fontSize]));
    const lineHeightMap = Object.fromEntries(
        Object.keys(sourceFont.lineHeight).map((token) => [token, Math.round(fontSize * 1.4)]),
    );
    const letterSpacingMap = Object.fromEntries(
        Object.keys(sourceFont.letterSpacing ?? {}).map((token) => [token, letterSpacingPx]),
    );
    const weightMap = Object.fromEntries(Object.keys(sourceFont.weight ?? {}).map((token) => [token, weight]));

    return createFont({
        ...sourceFont,
        family,
        size: sizeMap,
        lineHeight: lineHeightMap,
        letterSpacing: letterSpacingMap,
        weight: weightMap,
        face: {
            400: { normal: family },
            500: { normal: family },
            600: { normal: family },
            700: { normal: family },
        },
    });
}

const bodyFont = createStaticFont("Geist-Regular", defaultConfig.fonts.body);
const bodyMediumFont = createStaticFont("Geist-Medium", defaultConfig.fonts.body);
const bodySemiBoldFont = createStaticFont("Geist-SemiBold", defaultConfig.fonts.body);
const bodyBoldFont = createStaticFont("Geist-Bold", defaultConfig.fonts.body);
const headingMediumFont = createStaticFont("SpaceGrotesk-Medium", defaultConfig.fonts.heading);
const headingBoldFont = createStaticFont("SpaceGrotesk-Bold", defaultConfig.fonts.heading);
const monoFont = createStaticFont("JetBrainsMono-Regular", defaultConfig.fonts.body);
const monoMediumFont = createStaticFont("JetBrainsMono-Medium", defaultConfig.fonts.body);
const monoBoldFont = createStaticFont("JetBrainsMono-Bold", defaultConfig.fonts.body);
const bodyDyslexicFont = createStaticFont("OpenDyslexic-Regular", defaultConfig.fonts.body);
const bodyDyslexicMediumFont = createStaticFont("OpenDyslexic-Regular", defaultConfig.fonts.body);
const bodyDyslexicSemiBoldFont = createStaticFont("OpenDyslexic-Bold", defaultConfig.fonts.body);
const bodyDyslexicBoldFont = createStaticFont("OpenDyslexic-Bold", defaultConfig.fonts.body);
const headingDyslexicMediumFont = createStaticFont("OpenDyslexic-Regular", defaultConfig.fonts.heading);
const headingDyslexicBoldFont = createStaticFont("OpenDyslexic-Bold", defaultConfig.fonts.heading);
const monoDyslexicMediumFont = createStaticFont("OpenDyslexic-Regular", defaultConfig.fonts.body);
const monoDyslexicBoldFont = createStaticFont("OpenDyslexic-Bold", defaultConfig.fonts.body);

// Purpose-built font roles for the PVUA design system.
// Sizes are fixed so the size prop (`$true`, `$1`, etc.) does not affect them.
// See PVUA_DESIGN_SYSTEM_PHASE2_UPDATED.md for the typography correction:
// JetBrains Mono is reserved for opaque coded data only.
const headingEyebrowFont = createPurposeFont("SpaceGrotesk-Medium", defaultConfig.fonts.heading, 11, "500", 0.48);
const headingScoreDimFont = createPurposeFont("SpaceGrotesk-SemiBold", defaultConfig.fonts.heading, 10, "600", 0.2);
const bodyBadgeFont = createPurposeFont("Geist-Medium", defaultConfig.fonts.body, 11, "500", 0.22);
const bodyCounterFont = createPurposeFont("Geist-Regular", defaultConfig.fonts.body, 12, "400", 0);
const monoMetaFont = createPurposeFont("JetBrainsMono-Regular", defaultConfig.fonts.body, 11, "400", 0.44);

const animations = createAnimations({
    fast: {
        type: "spring",
        damping: 20,
        mass: 1.2,
        stiffness: 250,
    },
    medium: {
        type: "spring",
        damping: 10,
        mass: 0.9,
        stiffness: 100,
    },
    slow: {
        type: "spring",
        damping: 20,
        mass: 1.5,
        stiffness: 60,
    },
});

export const config = createTamagui({
    ...defaultConfig,
    animations,
    fonts: {
        ...defaultConfig.fonts,
        body: bodyFont,
        bodyMedium: bodyMediumFont,
        bodySemiBold: bodySemiBoldFont,
        bodyBold: bodyBoldFont,
        heading: headingBoldFont,
        headingMedium: headingMediumFont,
        headingBold: headingBoldFont,
        mono: monoFont,
        monoMedium: monoMediumFont,
        monoBold: monoBoldFont,
        bodyDyslexic: bodyDyslexicFont,
        bodyDyslexicMedium: bodyDyslexicMediumFont,
        bodyDyslexicSemiBold: bodyDyslexicSemiBoldFont,
        bodyDyslexicBold: bodyDyslexicBoldFont,
        headingDyslexicMedium: headingDyslexicMediumFont,
        headingDyslexicBold: headingDyslexicBoldFont,
        monoDyslexicMedium: monoDyslexicMediumFont,
        monoDyslexicBold: monoDyslexicBoldFont,
        // PVUA design system roles
        headingEyebrow: headingEyebrowFont,
        headingScoreDim: headingScoreDimFont,
        bodyBadge: bodyBadgeFont,
        bodyCounter: bodyCounterFont,
        monoMeta: monoMetaFont,
    },
    tokens: {
        ...defaultConfig.tokens,
        color: accentColors,
    },
    themes,
    media: {
        ...defaultConfig.media,
    },
});

type OurConfig = typeof config;

declare module "tamagui" {
    // This is required for Tamagui module augmentation.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface TamaguiCustomConfig extends OurConfig {}
}
