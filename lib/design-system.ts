import { resolveFieldModePresentation } from "lib/preferences/field-mode";
import { TABLET_BREAKPOINT, TABLET_TYPOGRAPHY_BASE_SCALE } from "lib/responsive-layout-tokens";
import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { usePreferencesStore, type ResolvedTheme } from "stores/preferences-store";
import { ColorTokens } from "tamagui";

/**
 * Place workflow status used for status pill rendering.
 */
export type PlaceStatus = "not_started" | "in_progress" | "submitted";

/**
 * Color tone key for dashboard metric cards.
 */
export type MetricTone = "blue" | "green" | "purple" | "orange";

interface TypographyToken {
    readonly fontSize: number;
    readonly lineHeight: number;
}

/**
 * @param fontSize Shared font size for a semantic text role.
 * @param lineHeight Matching line height to preserve readable rhythm.
 * @returns Immutable typography token.
 */
function createTypographyToken(fontSize: number, lineHeight: number): TypographyToken {
    return { fontSize, lineHeight };
}

/**
 * @param value Color value to convert to a Tamagui color token.
 * @returns Immutable color token.
 */
function createColorToken(value: string): ColorTokens {
    return value as ColorTokens;
}

/** Color palette shape shared across light and dark themes. */
interface ColorPalette {
    readonly background: ColorTokens;
    readonly foreground: ColorTokens;
    readonly primary: ColorTokens;
    readonly primaryForeground: ColorTokens;
    readonly surface: ColorTokens;
    readonly surfaceMuted: ColorTokens;
    readonly mutedSurface: ColorTokens;
    readonly input: ColorTokens;
    readonly border: ColorTokens;
    readonly mutedForeground: ColorTokens;
    readonly secondaryForeground: ColorTokens;
    readonly success: ColorTokens;
    readonly warning: ColorTokens;
    readonly danger: ColorTokens;
    readonly info: ColorTokens;
    readonly violet: ColorTokens;
    readonly overlay: ColorTokens;
    readonly primarySoft: ColorTokens;
    readonly successSoft: ColorTokens;
    readonly warningSoft: ColorTokens;
    readonly dangerSoft: ColorTokens;
    readonly infoSoft: ColorTokens;
    readonly violetSoft: ColorTokens;
    readonly placeholderColor: ColorTokens;
    readonly amber: ColorTokens;
    readonly amberSoft: ColorTokens;
    readonly provision: ColorTokens;
    readonly provisionSoft: ColorTokens;
    readonly diversity: ColorTokens;
    readonly diversitySoft: ColorTokens;
    readonly challenge: ColorTokens;
    readonly challengeSoft: ColorTokens;
    readonly sociability: ColorTokens;
    readonly sociabilitySoft: ColorTokens;
}

interface ShadowPalette {
    readonly card: ColorTokens;
    readonly accent: ColorTokens;
}

interface GlassPalette {
    readonly elevatedSurface: ColorTokens;
    readonly elevatedBorder: ColorTokens;
    readonly elevatedShadow: ColorTokens;
    readonly tabBarSurface: ColorTokens;
    readonly tabBarBorder: ColorTokens;
}

const DARK_COLORS = {
    background: createColorToken("#161311"),
    foreground: createColorToken("#E7DED3"),
    primary: createColorToken("#C58A5C"),
    primaryForeground: createColorToken("#FFFFFF"),
    surface: createColorToken("#24201D"),
    surfaceMuted: createColorToken("#2E2824"),
    mutedSurface: createColorToken("#352E2A"),
    input: createColorToken("#201C19"),
    border: createColorToken("#5A514A"),
    mutedForeground: createColorToken("#B8AEA3"),
    secondaryForeground: createColorToken("#DED3C6"),
    success: createColorToken("#6F9A7F"),
    warning: createColorToken("#B99A5A"),
    danger: createColorToken("#C98472"),
    info: createColorToken("#7B90B8"),
    violet: createColorToken("#9B86B2"),
    overlay: createColorToken("rgba(22, 19, 17, 0.92)"),
    primarySoft: createColorToken("rgba(197, 138, 92, 0.14)"),
    successSoft: createColorToken("rgba(111, 154, 127, 0.16)"),
    warningSoft: createColorToken("rgba(185, 154, 90, 0.16)"),
    dangerSoft: createColorToken("rgba(201, 132, 114, 0.18)"),
    infoSoft: createColorToken("rgba(123, 144, 184, 0.16)"),
    violetSoft: createColorToken("rgba(155, 134, 178, 0.16)"),
    amber: createColorToken("rgba(255, 180, 0, 0.1)"),
    amberSoft: createColorToken("rgba(255, 180, 0, 0.1)"),
    placeholderColor: createColorToken("#B8AEA3"),
    provision: createColorToken("#566E3D"),
    provisionSoft: createColorToken("#AEC596"),
    diversity: createColorToken("#BD4926"),
    diversitySoft: createColorToken("#EBAC99"),
    challenge: createColorToken("#0C4767"),
    challengeSoft: createColorToken("#B1D4E0"),
    sociability: createColorToken("#754170"),
    sociabilitySoft: createColorToken("#C596C0"),
} as const satisfies ColorPalette;

const DARK_SHADOWS = {
    card: `0 10px 24px ${createColorToken("rgba(0, 0, 0, 0.14)")}` as ColorTokens,
    accent: `0 0 14px ${createColorToken("rgba(197, 138, 92, 0.12)")}` as ColorTokens,
} as const satisfies ShadowPalette;

const DARK_GLASS = {
    elevatedSurface: createColorToken("rgba(36, 32, 29, 0.74)"),
    elevatedBorder: createColorToken("rgba(231, 222, 211, 0.2)"),
    elevatedShadow: `0 14px 28px ${createColorToken("rgba(0, 0, 0, 0.24)")}` as ColorTokens,
    tabBarSurface: createColorToken("rgba(22, 19, 17, 0.84)"),
    tabBarBorder: createColorToken("rgba(231, 222, 211, 0.14)"),
} as const satisfies GlassPalette;

const LIGHT_COLORS = {
    background: createColorToken("#FDFAF7"),
    foreground: createColorToken("#2A231E"),
    primary: createColorToken("#A66334"),
    primaryForeground: createColorToken("#FFFFFF"),
    surface: createColorToken("#FFFCF8"),
    surfaceMuted: createColorToken("#F4EEE7"),
    mutedSurface: createColorToken("#E9E2DB"),
    input: createColorToken("#FFFFFF"),
    border: createColorToken("#C8BCB0"),
    mutedForeground: createColorToken("#645A52"),
    secondaryForeground: createColorToken("#423831"),
    success: createColorToken("#3D6B4F"),
    warning: createColorToken("#9A7A3F"),
    danger: createColorToken("#B54A38"),
    info: createColorToken("#4A619A"),
    violet: createColorToken("#6B5A8A"),
    amber: createColorToken("#FFB400"),
    overlay: createColorToken("rgba(255, 255, 255, 0.56)"),
    primarySoft: createColorToken("rgba(166, 99, 52, 0.12)"),
    successSoft: createColorToken("rgba(61, 107, 79, 0.12)"),
    warningSoft: createColorToken("rgba(154, 122, 63, 0.12)"),
    dangerSoft: createColorToken("rgba(181, 74, 56, 0.12)"),
    infoSoft: createColorToken("rgba(74, 97, 154, 0.12)"),
    violetSoft: createColorToken("rgba(107, 90, 138, 0.12)"),
    amberSoft: createColorToken("rgba(204, 136, 0, 0.1)"),
    placeholderColor: createColorToken("#645A52"),
    provision: createColorToken("#566E3D"),
    provisionSoft: createColorToken("#AEC596"),
    diversity: createColorToken("#BD4926"),
    diversitySoft: createColorToken("#EBAC99"),
    challenge: createColorToken("#0C4767"),
    challengeSoft: createColorToken("#B1D4E0"),
    sociability: createColorToken("#754170"),
    sociabilitySoft: createColorToken("#C596C0"),
} as const satisfies ColorPalette;

const LIGHT_FIELD_COLORS = {
    background: createColorToken("#FAFAF8"),
    foreground: createColorToken("#1F1A16"),
    primary: createColorToken("#965424"),
    primaryForeground: createColorToken("#FFFFFF"),
    surface: createColorToken("#FFFFFF"),
    surfaceMuted: createColorToken("#F2F3EF"),
    mutedSurface: createColorToken("#EAEBE6"),
    input: createColorToken("#FFFFFF"),
    border: createColorToken("#91857A"),
    mutedForeground: createColorToken("#413A34"),
    secondaryForeground: createColorToken("#241E19"),
    success: createColorToken("#28573A"),
    warning: createColorToken("#705700"),
    danger: createColorToken("#96392B"),
    info: createColorToken("#234A83"),
    violet: createColorToken("#5A467D"),
    overlay: createColorToken("rgba(255, 255, 255, 0.62)"),
    primarySoft: createColorToken("rgba(150, 84, 36, 0.16)"),
    successSoft: createColorToken("rgba(40, 87, 58, 0.16)"),
    warningSoft: createColorToken("rgba(112, 87, 0, 0.16)"),
    dangerSoft: createColorToken("rgba(150, 57, 43, 0.16)"),
    infoSoft: createColorToken("rgba(35, 74, 131, 0.16)"),
    violetSoft: createColorToken("rgba(90, 70, 125, 0.16)"),
    amber: createColorToken("rgba(255, 180, 0, 0.1)"),
    amberSoft: createColorToken("rgba(204, 136, 0, 0.1)"),
    placeholderColor: createColorToken("#413A34"),
    provision: createColorToken("#566E3D"),
    provisionSoft: createColorToken("#AEC596"),
    diversity: createColorToken("#BD4926"),
    diversitySoft: createColorToken("#EBAC99"),
    challenge: createColorToken("#0C4767"),
    challengeSoft: createColorToken("#B1D4E0"),
    sociability: createColorToken("#754170"),
    sociabilitySoft: createColorToken("#C596C0"),
} as const satisfies ColorPalette;

const LIGHT_SHADOWS = {
    card: `0 10px 24px ${createColorToken("rgba(60, 48, 42, 0.08)")}` as ColorTokens,
    accent: `0 0 14px ${createColorToken("rgba(176, 106, 56, 0.2)")}` as ColorTokens,
} as const satisfies ShadowPalette;

const LIGHT_GLASS = {
    elevatedSurface: createColorToken("rgba(255, 255, 255, 0.76)"),
    elevatedBorder: createColorToken("rgba(42, 35, 30, 0.12)"),
    elevatedShadow: `0 14px 28px ${createColorToken("rgba(60, 48, 42, 0.12)")}` as ColorTokens,
    tabBarSurface: createColorToken("rgba(255, 255, 255, 0.72)"),
    tabBarBorder: createColorToken("rgba(42, 35, 30, 0.1)"),
} as const satisfies GlassPalette;

const DARK_HIGH_CONTRAST_COLORS = {
    background: createColorToken("#000000"),
    foreground: createColorToken("#FFFFFF"),
    primary: createColorToken("#FFD0A8"),
    primaryForeground: createColorToken("#000000"),
    surface: createColorToken("#0F0F0F"),
    surfaceMuted: createColorToken("#141414"),
    mutedSurface: createColorToken("#1A1A1A"),
    input: createColorToken("#050505"),
    border: createColorToken("#8E8E8E"),
    mutedForeground: createColorToken("#E7E7E7"),
    secondaryForeground: createColorToken("#F7F7F7"),
    success: createColorToken("#91D4A7"),
    warning: createColorToken("#F1CF6A"),
    danger: createColorToken("#F2A392"),
    info: createColorToken("#A8C2F5"),
    violet: createColorToken("#D0B8F4"),
    overlay: createColorToken("rgba(0, 0, 0, 0.94)"),
    primarySoft: createColorToken("rgba(255, 208, 168, 0.2)"),
    successSoft: createColorToken("rgba(145, 212, 167, 0.2)"),
    warningSoft: createColorToken("rgba(241, 207, 106, 0.2)"),
    dangerSoft: createColorToken("rgba(242, 163, 146, 0.2)"),
    infoSoft: createColorToken("rgba(168, 194, 245, 0.2)"),
    violetSoft: createColorToken("rgba(208, 184, 244, 0.2)"),
    amber: createColorToken("rgba(255, 180, 0, 0.1)"),
    amberSoft: createColorToken("rgba(255, 180, 0, 0.1)"),
    placeholderColor: createColorToken("#8E8E8E"),
    provision: createColorToken("#566E3D"),
    provisionSoft: createColorToken("#AEC596"),
    diversity: createColorToken("#BD4926"),
    diversitySoft: createColorToken("#EBAC99"),
    challenge: createColorToken("#0C4767"),
    challengeSoft: createColorToken("#B1D4E0"),
    sociability: createColorToken("#754170"),
    sociabilitySoft: createColorToken("#C596C0"),
} as const satisfies ColorPalette;

const LIGHT_HIGH_CONTRAST_COLORS = {
    background: createColorToken("#FFFFFF"),
    foreground: createColorToken("#111111"),
    primary: createColorToken("#8A4A1B"),
    primaryForeground: createColorToken("#FFFFFF"),
    surface: createColorToken("#FFFFFF"),
    surfaceMuted: createColorToken("#FAFAFA"),
    mutedSurface: createColorToken("#F3F3F3"),
    input: createColorToken("#FFFFFF"),
    border: createColorToken("#57504A"),
    mutedForeground: createColorToken("#39332E"),
    secondaryForeground: createColorToken("#1D1916"),
    success: createColorToken("#1F5B33"),
    warning: createColorToken("#6F5600"),
    danger: createColorToken("#8E231A"),
    info: createColorToken("#163A70"),
    violet: createColorToken("#4D3A70"),
    overlay: createColorToken("rgba(17, 17, 17, 0.68)"),
    primarySoft: createColorToken("rgba(138, 74, 27, 0.16)"),
    successSoft: createColorToken("rgba(31, 91, 51, 0.16)"),
    warningSoft: createColorToken("rgba(111, 86, 0, 0.16)"),
    dangerSoft: createColorToken("rgba(142, 35, 26, 0.16)"),
    infoSoft: createColorToken("rgba(22, 58, 112, 0.16)"),
    violetSoft: createColorToken("rgba(77, 58, 112, 0.16)"),
    amber: createColorToken("rgba(255, 180, 0, 0.1)"),
    amberSoft: createColorToken("rgba(255, 180, 0, 0.1)"),
    placeholderColor: createColorToken("#D1C4B6"),
    provision: createColorToken("#566E3D"),
    provisionSoft: createColorToken("#AEC596"),
    diversity: createColorToken("#BD4926"),
    diversitySoft: createColorToken("#EBAC99"),
    challenge: createColorToken("#0C4767"),
    challengeSoft: createColorToken("#B1D4E0"),
    sociability: createColorToken("#754170"),
    sociabilitySoft: createColorToken("#C596C0"),
} as const satisfies ColorPalette;

interface FontTokenScale {
    readonly bodyRegular: string;
    readonly bodyMedium: string;
    readonly bodySemiBold: string;
    readonly bodyBold: string;
    readonly headingMedium: string;
    readonly headingBold: string;
    readonly monoMedium: string;
    readonly monoBold: string;
}

const DEFAULT_FONT_TOKENS = {
    bodyRegular: "$body",
    bodyMedium: "$bodyMedium",
    bodySemiBold: "$bodySemiBold",
    bodyBold: "$bodyBold",
    headingMedium: "$headingMedium",
    headingBold: "$headingBold",
    monoMedium: "$monoMedium",
    monoBold: "$monoBold",
} as const satisfies FontTokenScale;

const DYSLEXIC_FONT_TOKENS = {
    bodyRegular: "$bodyDyslexic",
    bodyMedium: "$bodyDyslexicMedium",
    bodySemiBold: "$bodyDyslexicSemiBold",
    bodyBold: "$bodyDyslexicBold",
    headingMedium: "$headingDyslexicMedium",
    headingBold: "$headingDyslexicBold",
    monoMedium: "$monoDyslexicMedium",
    monoBold: "$monoDyslexicBold",
} as const satisfies FontTokenScale;

type ActiveFontTokenScale = typeof DEFAULT_FONT_TOKENS | typeof DYSLEXIC_FONT_TOKENS;
type ActiveColorPalette =
    | typeof DARK_COLORS
    | typeof LIGHT_COLORS
    | typeof LIGHT_FIELD_COLORS
    | typeof DARK_HIGH_CONTRAST_COLORS
    | typeof LIGHT_HIGH_CONTRAST_COLORS;

type ActiveGlassPalette = typeof LIGHT_GLASS | typeof DARK_GLASS;

const FONT_WEIGHTS = {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
} as const;

const BASE_TYPOGRAPHY = {
    labelXs: createTypographyToken(9, 12),
    labelSm: createTypographyToken(10, 14),
    labelMd: createTypographyToken(11, 14),
    labelLg: createTypographyToken(12, 16),
    bodyXs: createTypographyToken(12, 16),
    bodySm: createTypographyToken(13, 16),
    bodyMd: createTypographyToken(14, 18),
    bodyLg: createTypographyToken(15, 20),
    titleSm: createTypographyToken(15, 20),
    titleMd: createTypographyToken(16, 20),
    titleLg: createTypographyToken(18, 24),
    metricXs: createTypographyToken(20, 24),
    metricSm: createTypographyToken(22, 26),
    metricMd: createTypographyToken(24, 28),
    metricLg: createTypographyToken(26, 30),
    displaySm: createTypographyToken(28, 32),
    displayMd: createTypographyToken(30, 34),
    displayLg: createTypographyToken(32, 36),
} as const;

const RADII = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
} as const;

const SPACING = {
    screenPaddingHorizontal: 15,
    screenPaddingVertical: 16,
} as const;

type TypographyScale = typeof BASE_TYPOGRAPHY;

interface SharedDesignTokens {
    readonly fonts: ActiveFontTokenScale;
    readonly fontWeights: typeof FONT_WEIGHTS;
    readonly typography: TypographyScale;
    readonly radii: typeof RADII;
    readonly spacing: typeof SPACING;
}

interface DesignSystemOptions {
    readonly fontScale: number;
    readonly highContrast: boolean;
    readonly dyslexicFont: boolean;
    readonly fieldMode: boolean;
    /** When true the typography scale is boosted by {@link TABLET_TYPOGRAPHY_BASE_SCALE}. */
    readonly isTablet?: boolean;
}

/** Complete theme token set for the active UI configuration. */
export type DesignSystemTheme = SharedDesignTokens & {
    readonly colors: ActiveColorPalette;
    readonly shadows: ShadowPalette;
    readonly glass: ActiveGlassPalette;
};

const MIN_DESIGN_FONT_SCALE = 0.85;
const MAX_DESIGN_FONT_SCALE = 1.3;

/**
 * Keep design-system font scaling within the supported accessibility range.
 *
 * @param scale Requested scale multiplier.
 * @returns Clamped font scale value.
 */
function clampDesignFontScale(scale: number): number {
    return Math.max(MIN_DESIGN_FONT_SCALE, Math.min(MAX_DESIGN_FONT_SCALE, scale));
}

/**
 * Scale one numeric text metric while keeping values crisp for native layout.
 *
 * @param value Base numeric token value.
 * @param scale User-selected font scale multiplier.
 * @returns Rounded scaled value.
 */
function scaleTypographyValue(value: number, scale: number): number {
    return Math.round(value * scale * 100) / 100;
}

/**
 * Build a scaled typography token set from the base semantic metrics.
 *
 * @param scale User-selected font scale multiplier.
 * @returns Typography tokens adjusted for accessibility settings.
 */
function scaleTypography(scale: number): TypographyScale {
    return Object.fromEntries(
        Object.entries(BASE_TYPOGRAPHY).map(([token, value]) => {
            return [
                token,
                createTypographyToken(
                    scaleTypographyValue(value.fontSize, scale),
                    scaleTypographyValue(value.lineHeight, scale),
                ),
            ];
        }),
    ) as TypographyScale;
}

/**
 * Resolve the active color palette, optionally swapping in a higher-contrast variant.
 *
 * @param theme Resolved app theme.
 * @param highContrast Whether high-contrast mode is enabled.
 * @param prefersFieldPalette Whether the outdoor field palette should be used.
 * @returns Active semantic color palette.
 */
function getColorPalette(
    theme: ResolvedTheme,
    highContrast: boolean,
    prefersFieldPalette: boolean,
): ActiveColorPalette {
    if (theme === "light") {
        if (prefersFieldPalette) {
            return LIGHT_FIELD_COLORS;
        }

        return highContrast ? LIGHT_HIGH_CONTRAST_COLORS : LIGHT_COLORS;
    }

    return highContrast ? DARK_HIGH_CONTRAST_COLORS : DARK_COLORS;
}

/**
 * Build a complete design system token set for a given theme.
 *
 * @param theme Resolved light or dark theme.
 * @returns Full design system object.
 */
export function getDesignSystem(theme: ResolvedTheme, options: Partial<DesignSystemOptions> = {}): DesignSystemTheme {
    const fieldModePresentation = resolveFieldModePresentation({
        fieldMode: options.fieldMode ?? false,
        fontScale: options.fontScale ?? 1,
        highContrast: options.highContrast ?? false,
        theme,
    });
    // Clamp the user-preference scale to the supported range, then apply the
    // tablet baseline boost on top so the stored preference operates as a
    // relative adjustment around the boosted base rather than replacing it.
    const clampedUserScale = clampDesignFontScale(fieldModePresentation.effectiveFontScale);
    const fontScale = (options.isTablet ?? false) ? clampedUserScale * TABLET_TYPOGRAPHY_BASE_SCALE : clampedUserScale;
    const dyslexicFont = options.dyslexicFont ?? false;

    return {
        fonts: dyslexicFont ? DYSLEXIC_FONT_TOKENS : DEFAULT_FONT_TOKENS,
        fontWeights: FONT_WEIGHTS,
        typography: scaleTypography(fontScale),
        radii: RADII,
        spacing: SPACING,
        colors: getColorPalette(
            theme,
            fieldModePresentation.useHighContrastPalette,
            fieldModePresentation.prefersFieldPalette,
        ),
        shadows: theme === "light" ? LIGHT_SHADOWS : DARK_SHADOWS,
        glass: theme === "light" ? LIGHT_GLASS : DARK_GLASS,
    };
}

/**
 * React hook that returns the active design system based on the user's
 * resolved theme preference.
 *
 * @returns Active design system tokens.
 */
export function useDesignSystem(): DesignSystemTheme {
    const resolvedTheme = usePreferencesStore((state) => state.resolvedTheme);
    const fontScale = usePreferencesStore((state) => state.fontScale);
    const highContrast = usePreferencesStore((state) => state.highContrast);
    const dyslexicFont = usePreferencesStore((state) => state.dyslexicFont);
    const fieldMode = usePreferencesStore((state) => state.fieldMode);
    const { width } = useWindowDimensions();
    const isTablet = width >= TABLET_BREAKPOINT;

    return useMemo(() => {
        return getDesignSystem(resolvedTheme, {
            fontScale,
            highContrast,
            dyslexicFont,
            fieldMode,
            isTablet,
        });
    }, [dyslexicFont, fieldMode, fontScale, highContrast, resolvedTheme, isTablet]);
}

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function parseBooleanFlag(rawValue: string | undefined, fallback: boolean): boolean {
    if (typeof rawValue !== "string") {
        return fallback;
    }

    const normalizedValue = rawValue.trim().toLowerCase();
    if (normalizedValue.length === 0) {
        return fallback;
    }

    return TRUE_VALUES.has(normalizedValue);
}

export function isGlassUiEnabled(): boolean {
    return parseBooleanFlag(process.env.EXPO_PUBLIC_GLASS_UI_ENABLED, true);
}
/** Union of every concrete color value across all theme palettes. */
type PaletteColorValue = ActiveColorPalette[keyof ColorPalette];

/**
 * Resolve the accent color for a given audit scale key.
 *
 * Each of the four instrument scales has a dedicated hue so auditors can
 * recognise the scale by color without re-reading the description.
 *
 * @param scaleKey Instrument scale key.
 * @param colors Active semantic color palette.
 * @returns Accent color string.
 */
export function getScaleAccentColor(scaleKey: string, colors: ActiveColorPalette): PaletteColorValue {
    switch (scaleKey) {
        case "provision":
            return colors.provision;
        case "diversity":
            return colors.diversity;
        case "challenge":
            return colors.challenge;
        case "sociability":
            return colors.sociability;
        default:
            return colors.primary;
    }
}

/**
 * Resolve the soft background tint for a given audit scale key.
 *
 * @param scaleKey Instrument scale key.
 * @param colors Active semantic color palette.
 * @returns Soft background color string.
 */
export function getScaleSoftColor(scaleKey: string, colors: ActiveColorPalette): PaletteColorValue {
    switch (scaleKey) {
        case "provision":
            return colors.provisionSoft;
        case "diversity":
            return colors.diversitySoft;
        case "challenge":
            return colors.challengeSoft;
        case "sociability":
            return colors.sociabilitySoft;
        default:
            return colors.primarySoft;
    }
}

/**
 * Default dark design system for backward compatibility.
 *
 * Screens that have not yet adopted `useDesignSystem()` can continue
 * importing this constant. They will always render in dark mode.
 */
export const designSystem: DesignSystemTheme = getDesignSystem("dark");

/**
 * Shared tone model for chips, badges, and accent surfaces.
 */
export interface DesignTone {
    readonly accent: ColorTokens;
    readonly surface: ColorTokens;
    readonly text: ColorTokens;
}

/**
 * @param tone Dashboard metric tone.
 * @param colors Optional active color palette.
 * @returns Accent, surface, and text colors for the metric.
 */
export function getMetricTone(tone: MetricTone, colors: ActiveColorPalette = DARK_COLORS): DesignTone {
    const c = colors;

    if (tone === "green") {
        return {
            accent: c.success as ColorTokens,
            surface: c.successSoft as ColorTokens,
            text: c.success as ColorTokens,
        };
    }
    if (tone === "purple") {
        return { accent: c.violet as ColorTokens, surface: c.violetSoft as ColorTokens, text: c.violet as ColorTokens };
    }
    if (tone === "orange") {
        return {
            accent: c.warning as ColorTokens,
            surface: c.warningSoft as ColorTokens,
            text: c.warning as ColorTokens,
        };
    }
    return { accent: c.primary as ColorTokens, surface: c.primarySoft as ColorTokens, text: c.primary as ColorTokens };
}

/**
 * @param status Place workflow status.
 * @param colors Optional active color palette.
 * @returns Accent, surface, and text colors for the status.
 */
export function getPlaceStatusTone(status: PlaceStatus, colors: ActiveColorPalette = DARK_COLORS): DesignTone {
    const c = colors;

    if (status === "submitted") {
        return {
            accent: c.success as ColorTokens,
            surface: c.successSoft as ColorTokens,
            text: c.success as ColorTokens,
        };
    }
    if (status === "in_progress") {
        return {
            accent: c.primary as ColorTokens,
            surface: c.primarySoft as ColorTokens,
            text: c.primary as ColorTokens,
        };
    }
    return { accent: c.danger as ColorTokens, surface: c.dangerSoft as ColorTokens, text: c.danger as ColorTokens };
}
