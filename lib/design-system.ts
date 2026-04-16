import { resolveFieldModePresentation } from "lib/preferences/field-mode";
import { useMemo } from "react";
import { usePreferencesStore, type ResolvedTheme } from "stores/preferences-store";

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

/** Color palette shape shared across light and dark themes. */
interface ColorPalette {
    readonly background: string;
    readonly foreground: string;
    readonly primary: string;
    readonly primaryForeground: string;
    readonly surface: string;
    readonly surfaceMuted: string;
    readonly mutedSurface: string;
    readonly input: string;
    readonly border: string;
    readonly mutedForeground: string;
    readonly secondaryForeground: string;
    readonly success: string;
    readonly warning: string;
    readonly danger: string;
    readonly info: string;
    readonly violet: string;
    readonly overlay: string;
    readonly primarySoft: string;
    readonly successSoft: string;
    readonly warningSoft: string;
    readonly dangerSoft: string;
    readonly infoSoft: string;
    readonly violetSoft: string;
    readonly placeholderColor: string;
    readonly amber: string;
    readonly amberSoft: string;
}

interface ShadowPalette {
    readonly card: string;
    readonly accent: string;
}

interface GlassPalette {
    readonly elevatedSurface: string;
    readonly elevatedBorder: string;
    readonly elevatedShadow: string;
    readonly tabBarSurface: string;
    readonly tabBarBorder: string;
}

const DARK_COLORS = {
    background: "#161311",
    foreground: "#E7DED3",
    primary: "#C58A5C",
    primaryForeground: "#FFFFFF",
    surface: "#24201D",
    surfaceMuted: "#2E2824",
    mutedSurface: "#352E2A",
    input: "#201C19",
    border: "#5A514A",
    mutedForeground: "#B8AEA3",
    secondaryForeground: "#DED3C6",
    success: "#6F9A7F",
    warning: "#B99A5A",
    danger: "#C98472",
    info: "#7B90B8",
    violet: "#9B86B2",
    overlay: "rgba(22, 19, 17, 0.92)",
    primarySoft: "rgba(197, 138, 92, 0.14)",
    successSoft: "rgba(111, 154, 127, 0.16)",
    warningSoft: "rgba(185, 154, 90, 0.16)",
    dangerSoft: "rgba(201, 132, 114, 0.18)",
    infoSoft: "rgba(123, 144, 184, 0.16)",
    violetSoft: "rgba(155, 134, 178, 0.16)",
    amber: "rgba(255, 180, 0, 0.1)",
    amberSoft: "rgba(255, 180, 0, 0.1)",
    placeholderColor: "#B8AEA3",
} as const satisfies ColorPalette;

const DARK_SHADOWS = {
    card: "0 10px 24px rgba(0, 0, 0, 0.14)",
    accent: "0 0 14px rgba(197, 138, 92, 0.12)",
} as const satisfies ShadowPalette;

const DARK_GLASS = {
    elevatedSurface: "rgba(36, 32, 29, 0.74)",
    elevatedBorder: "rgba(231, 222, 211, 0.2)",
    elevatedShadow: "0 14px 28px rgba(0, 0, 0, 0.24)",
    tabBarSurface: "rgba(22, 19, 17, 0.84)",
    tabBarBorder: "rgba(231, 222, 211, 0.14)",
} as const satisfies GlassPalette;

const LIGHT_COLORS = {
    background: "#FDFAF7",
    foreground: "#2A231E",
    primary: "#A66334",
    primaryForeground: "#FFFFFF",
    surface: "#FFFCF8",
    surfaceMuted: "#F4EEE7",
    mutedSurface: "#E9E2DB",
    input: "#FFFFFF",
    border: "#C8BCB0",
    mutedForeground: "#645A52",
    secondaryForeground: "#423831",
    success: "#3D6B4F",
    warning: "#9A7A3F",
    danger: "#B54A38",
    info: "#4A619A",
    violet: "#6B5A8A",
    amber: "FFB400",
    overlay: "rgba(255, 255, 255, 0.56)",
    primarySoft: "rgba(166, 99, 52, 0.12)",
    successSoft: "rgba(61, 107, 79, 0.12)",
    warningSoft: "rgba(154, 122, 63, 0.12)",
    dangerSoft: "rgba(181, 74, 56, 0.12)",
    infoSoft: "rgba(74, 97, 154, 0.12)",
    violetSoft: "rgba(107, 90, 138, 0.12)",
    amberSoft: "rgba(204, 136, 0, 0.1)",
    placeholderColor: "#645A52",
} as const satisfies ColorPalette;

const LIGHT_FIELD_COLORS = {
    background: "#FAFAF8",
    foreground: "#1F1A16",
    primary: "#965424",
    primaryForeground: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceMuted: "#F2F3EF",
    mutedSurface: "#EAEBE6",
    input: "#FFFFFF",
    border: "#91857A",
    mutedForeground: "#413A34",
    secondaryForeground: "#241E19",
    success: "#28573A",
    warning: "#705700",
    danger: "#96392B",
    info: "#234A83",
    violet: "#5A467D",
    overlay: "rgba(255, 255, 255, 0.62)",
    primarySoft: "rgba(150, 84, 36, 0.16)",
    successSoft: "rgba(40, 87, 58, 0.16)",
    warningSoft: "rgba(112, 87, 0, 0.16)",
    dangerSoft: "rgba(150, 57, 43, 0.16)",
    infoSoft: "rgba(35, 74, 131, 0.16)",
    violetSoft: "rgba(90, 70, 125, 0.16)",
    amber: "rgba(255, 180, 0, 0.1)",
    amberSoft: "rgba(204, 136, 0, 0.1)",
    placeholderColor: "#413A34",
} as const satisfies ColorPalette;

const LIGHT_SHADOWS = {
    card: "0 10px 24px rgba(60, 48, 42, 0.08)",
    accent: "0 0 14px rgba(176, 106, 56, 0.2)",
} as const satisfies ShadowPalette;

const LIGHT_GLASS = {
    elevatedSurface: "rgba(255, 255, 255, 0.76)",
    elevatedBorder: "rgba(42, 35, 30, 0.12)",
    elevatedShadow: "0 14px 28px rgba(60, 48, 42, 0.12)",
    tabBarSurface: "rgba(255, 255, 255, 0.72)",
    tabBarBorder: "rgba(42, 35, 30, 0.1)",
} as const satisfies GlassPalette;

const DARK_HIGH_CONTRAST_COLORS = {
    background: "#000000",
    foreground: "#FFFFFF",
    primary: "#FFD0A8",
    primaryForeground: "#000000",
    surface: "#0F0F0F",
    surfaceMuted: "#141414",
    mutedSurface: "#1A1A1A",
    input: "#050505",
    border: "#8E8E8E",
    mutedForeground: "#E7E7E7",
    secondaryForeground: "#F7F7F7",
    success: "#91D4A7",
    warning: "#F1CF6A",
    danger: "#F2A392",
    info: "#A8C2F5",
    violet: "#D0B8F4",
    overlay: "rgba(0, 0, 0, 0.94)",
    primarySoft: "rgba(255, 208, 168, 0.2)",
    successSoft: "rgba(145, 212, 167, 0.2)",
    warningSoft: "rgba(241, 207, 106, 0.2)",
    dangerSoft: "rgba(242, 163, 146, 0.2)",
    infoSoft: "rgba(168, 194, 245, 0.2)",
    violetSoft: "rgba(208, 184, 244, 0.2)",
    amber: "rgba(255, 180, 0, 0.1)",
    amberSoft: "rgba(255, 180, 0, 0.1)",
    placeholderColor: "#8E8E8E",
} as const satisfies ColorPalette;

const LIGHT_HIGH_CONTRAST_COLORS = {
    background: "#FFFFFF",
    foreground: "#111111",
    primary: "#8A4A1B",
    primaryForeground: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceMuted: "#FAFAFA",
    mutedSurface: "#F3F3F3",
    input: "#FFFFFF",
    border: "#57504A",
    mutedForeground: "#39332E",
    secondaryForeground: "#1D1916",
    success: "#1F5B33",
    warning: "#6F5600",
    danger: "#8E231A",
    info: "#163A70",
    violet: "#4D3A70",
    overlay: "rgba(17, 17, 17, 0.68)",
    primarySoft: "rgba(138, 74, 27, 0.16)",
    successSoft: "rgba(31, 91, 51, 0.16)",
    warningSoft: "rgba(111, 86, 0, 0.16)",
    dangerSoft: "rgba(142, 35, 26, 0.16)",
    infoSoft: "rgba(22, 58, 112, 0.16)",
    violetSoft: "rgba(77, 58, 112, 0.16)",
    amber: "rgba(255, 180, 0, 0.1)",
    amberSoft: "rgba(255, 180, 0, 0.1)",
    placeholderColor: "#D1C4B6",
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
    const fontScale = clampDesignFontScale(fieldModePresentation.effectiveFontScale);
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

    return useMemo(() => {
        return getDesignSystem(resolvedTheme, {
            fontScale,
            highContrast,
            dyslexicFont,
            fieldMode,
        });
    }, [dyslexicFont, fieldMode, fontScale, highContrast, resolvedTheme]);
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
            return colors.violet;
        case "diversity":
            return colors.success;
        case "challenge":
            return colors.danger;
        case "sociability":
            return colors.info;
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
            return colors.violetSoft;
        case "diversity":
            return colors.successSoft;
        case "challenge":
            return colors.dangerSoft;
        case "sociability":
            return colors.infoSoft;
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
    readonly accent: string;
    readonly surface: string;
    readonly text: string;
}

/**
 * @param tone Dashboard metric tone.
 * @param colors Optional active color palette.
 * @returns Accent, surface, and text colors for the metric.
 */
export function getMetricTone(tone: MetricTone, colors: ActiveColorPalette = DARK_COLORS): DesignTone {
    const c = colors;

    if (tone === "green") {
        return { accent: c.success, surface: c.successSoft, text: c.success };
    }
    if (tone === "purple") {
        return { accent: c.violet, surface: c.violetSoft, text: c.violet };
    }
    if (tone === "orange") {
        return { accent: c.warning, surface: c.warningSoft, text: c.warning };
    }
    return { accent: c.primary, surface: c.primarySoft, text: c.primary };
}

/**
 * @param status Place workflow status.
 * @param colors Optional active color palette.
 * @returns Accent, surface, and text colors for the status.
 */
export function getPlaceStatusTone(status: PlaceStatus, colors: ActiveColorPalette = DARK_COLORS): DesignTone {
    const c = colors;

    if (status === "submitted") {
        return { accent: c.success, surface: c.successSoft, text: c.success };
    }
    if (status === "in_progress") {
        return { accent: c.primary, surface: c.primarySoft, text: c.primary };
    }
    return { accent: c.danger, surface: c.dangerSoft, text: c.danger };
}
