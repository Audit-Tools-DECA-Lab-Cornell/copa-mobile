import { defaultConfig } from "@tamagui/config/v5";
import { createAnimations } from "@tamagui/animations-react-native";
import { createFont, createTamagui, type Variable } from "tamagui";
import { themes } from "./themes";

const FONT_SIZE_DECREMENT = 1;
const FONT_LINE_HEIGHT_DECREMENT = 2;
const MINIMUM_FONT_SIZE = 10;
const MINIMUM_LINE_HEIGHT = 12;

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
