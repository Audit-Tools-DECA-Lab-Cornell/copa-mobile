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
}

interface ShadowPalette {
    readonly card: string;
    readonly accent: string;
}

const DARK_COLORS = {
    background: "#1C1917",
    foreground: "#E7DED3",
    primary: "#C58A5C",
    primaryForeground: "#FFFFFF",
    surface: "#24201D",
    surfaceMuted: "#2B2622",
    mutedSurface: "#312B27",
    input: "#211D1A",
    border: "#3A3430",
    mutedForeground: "#AFA497",
    secondaryForeground: "#D2C7BB",
    success: "#6F9A7F",
    warning: "#B99A5A",
    danger: "#C98472",
    info: "#7B90B8",
    violet: "#9B86B2",
    overlay: "rgba(28, 25, 23, 0.9)",
    primarySoft: "rgba(197, 138, 92, 0.1)",
    successSoft: "rgba(111, 154, 127, 0.12)",
    warningSoft: "rgba(185, 154, 90, 0.12)",
    dangerSoft: "rgba(201, 132, 114, 0.12)",
    infoSoft: "rgba(123, 144, 184, 0.12)",
    violetSoft: "rgba(155, 134, 178, 0.12)",
} as const satisfies ColorPalette;

const DARK_SHADOWS = {
    card: "0 10px 24px rgba(0, 0, 0, 0.14)",
    accent: "0 0 14px rgba(197, 138, 92, 0.12)",
} as const satisfies ShadowPalette;

const LIGHT_COLORS = {
    background: "#FAF6F0",
    foreground: "#2C241E",
    primary: "#B06A38",
    primaryForeground: "#FFFFFF",
    surface: "#F3EEE8",
    surfaceMuted: "#EDE7E0",
    mutedSurface: "#E6E0D8",
    input: "#FEFCF9",
    border: "#D1C4B6",
    mutedForeground: "#6E6258",
    secondaryForeground: "#4A403A",
    success: "#3D6B4F",
    warning: "#9A7A3F",
    danger: "#B54A38",
    info: "#4A619A",
    violet: "#6B5A8A",
    overlay: "rgba(255, 255, 255, 0.5)",
    primarySoft: "rgba(176, 106, 56, 0.12)",
    successSoft: "rgba(61, 107, 79, 0.12)",
    warningSoft: "rgba(154, 122, 63, 0.12)",
    dangerSoft: "rgba(181, 74, 56, 0.12)",
    infoSoft: "rgba(74, 97, 154, 0.12)",
    violetSoft: "rgba(107, 90, 138, 0.12)",
} as const satisfies ColorPalette;

const LIGHT_SHADOWS = {
    card: "0 10px 24px rgba(60, 48, 42, 0.08)",
    accent: "0 0 14px rgba(176, 106, 56, 0.2)",
} as const satisfies ShadowPalette;

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
    | typeof DARK_HIGH_CONTRAST_COLORS
    | typeof LIGHT_HIGH_CONTRAST_COLORS;

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
}

/** Complete theme token set for the active UI configuration. */
export type DesignSystemTheme = SharedDesignTokens & {
    readonly colors: ActiveColorPalette;
    readonly shadows: ShadowPalette;
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
 * @returns Active semantic color palette.
 */
function getColorPalette(theme: ResolvedTheme, highContrast: boolean): ActiveColorPalette {
    if (theme === "light") {
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
export function getDesignSystem(
    theme: ResolvedTheme,
    options: Partial<DesignSystemOptions> = {},
): DesignSystemTheme {
    const fontScale = clampDesignFontScale(options.fontScale ?? 1);
    const highContrast = options.highContrast ?? false;
    const dyslexicFont = options.dyslexicFont ?? false;

    return {
        fonts: dyslexicFont ? DYSLEXIC_FONT_TOKENS : DEFAULT_FONT_TOKENS,
        fontWeights: FONT_WEIGHTS,
        typography: scaleTypography(fontScale),
        radii: RADII,
        spacing: SPACING,
        colors: getColorPalette(theme, highContrast),
        shadows: theme === "light" ? LIGHT_SHADOWS : DARK_SHADOWS,
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

    return useMemo(() => {
        return getDesignSystem(resolvedTheme, {
            fontScale,
            highContrast,
            dyslexicFont,
        });
    }, [dyslexicFont, fontScale, highContrast, resolvedTheme]);
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
export function getMetricTone(
    tone: MetricTone,
    colors: ActiveColorPalette = DARK_COLORS,
): DesignTone {
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
export function getPlaceStatusTone(
    status: PlaceStatus,
    colors: ActiveColorPalette = DARK_COLORS,
): DesignTone {
    const c = colors;

    if (status === "submitted") {
        return { accent: c.success, surface: c.successSoft, text: c.success };
    }
    if (status === "in_progress") {
        return { accent: c.primary, surface: c.primarySoft, text: c.primary };
    }
    return { accent: c.warning, surface: c.warningSoft, text: c.warning };
}
