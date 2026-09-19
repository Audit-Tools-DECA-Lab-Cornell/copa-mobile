/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source:      brand/tokens.json (checksum 766198809a6ad314)
 * Regenerate:  bun run tokens:build
 * Verify:      bun run tokens:check
 *
 * brand/tokens.json here is a VENDORED copy of copa-frontend/brand/tokens.json.
 * Colour is defined once, for both clients. Editing this file by hand will be
 * reverted by the next generator run and will fail CI.
 */

/**
 * Default appearance for this platform, resolved from brand/tokens.json. The palette
 * a first-time user sees is part of the brand, so it lives with the colours rather
 * than as a literal in the preferences store.
 */
export const GENERATED_DEFAULTS: { readonly theme: "light" | "dark" } = {
    theme: "dark"
};

export const GENERATED_PALETTES = {
    dark: {
        background: "#0E1419",
        foreground: "#E8EDF2",
        primary: "#61A5C2",
        primaryForeground: "#081826",
        surface: "#161D24",
        surfaceMuted: "#1D262E",
        mutedSurface: "#243039",
        input: "#111820",
        border: "#495765",
        mutedForeground: "#A6B3C0",
        secondaryForeground: "#C3CCD6",
        success: "#5FBF98",
        warning: "#E0A93C",
        danger: "#F08C7E",
        info: "#89C2D9",
        violet: "#B3A3D9",
        overlay: "rgba(14, 20, 25, 0.92)",
        primarySoft: "rgba(97, 165, 194, 0.16)",
        successSoft: "rgba(95, 191, 152, 0.16)",
        warningSoft: "rgba(224, 169, 60, 0.16)",
        dangerSoft: "rgba(240, 140, 126, 0.16)",
        infoSoft: "rgba(137, 194, 217, 0.16)",
        violetSoft: "rgba(179, 163, 217, 0.16)",
        amber: "#E0A93C",
        amberSoft: "rgba(224, 169, 60, 0.12)",
        placeholderColor: "#A6B3C0"
    },
    light: {
        background: "#F7F9FB",
        foreground: "#14181D",
        primary: "#01497C",
        primaryForeground: "#FFFFFF",
        surface: "#FFFFFF",
        surfaceMuted: "#EDF1F5",
        mutedSurface: "#E2E8EE",
        input: "#FFFFFF",
        border: "#B1BDC9",
        mutedForeground: "#5C6773",
        secondaryForeground: "#3A424B",
        success: "#0F6B45",
        warning: "#8A5A00",
        danger: "#B3261E",
        info: "#297596",
        violet: "#5B4C8A",
        overlay: "rgba(255, 255, 255, 0.56)",
        primarySoft: "rgba(1, 73, 124, 0.12)",
        successSoft: "rgba(15, 107, 69, 0.12)",
        warningSoft: "rgba(138, 90, 0, 0.12)",
        dangerSoft: "rgba(179, 38, 30, 0.12)",
        infoSoft: "rgba(41, 117, 150, 0.12)",
        violetSoft: "rgba(91, 76, 138, 0.12)",
        amber: "#8A5A00",
        amberSoft: "rgba(138, 90, 0, 0.12)",
        placeholderColor: "#5C6773"
    },
    lightField: {
        background: "#FFFFFF",
        foreground: "#000000",
        primary: "#00335C",
        primaryForeground: "#FFFFFF",
        surface: "#FFFFFF",
        surfaceMuted: "#F2F5F8",
        mutedSurface: "#E6EBF0",
        input: "#FFFFFF",
        border: "#5A6A77",
        mutedForeground: "#37414D",
        secondaryForeground: "#14181D",
        success: "#0A4A31",
        warning: "#5C3D00",
        danger: "#8C1D18",
        info: "#00456E",
        violet: "#3F3168",
        overlay: "rgba(255, 255, 255, 0.62)",
        primarySoft: "rgba(0, 51, 92, 0.16)",
        successSoft: "rgba(10, 74, 49, 0.16)",
        warningSoft: "rgba(92, 61, 0, 0.16)",
        dangerSoft: "rgba(140, 29, 24, 0.16)",
        infoSoft: "rgba(0, 69, 110, 0.16)",
        violetSoft: "rgba(63, 49, 104, 0.16)",
        amber: "#5C3D00",
        amberSoft: "rgba(92, 61, 0, 0.12)",
        placeholderColor: "#37414D"
    },
    darkHighContrast: {
        background: "#000000",
        foreground: "#FFFFFF",
        primary: "#A9D6E5",
        primaryForeground: "#000000",
        surface: "#0F0F0F",
        surfaceMuted: "#141414",
        mutedSurface: "#1A1A1A",
        input: "#050505",
        border: "#9AA6B2",
        mutedForeground: "#D0D0D0",
        secondaryForeground: "#EDEDED",
        success: "#8FE3C0",
        warning: "#FFD166",
        danger: "#FFB4A8",
        info: "#C4E4F2",
        violet: "#D4C6F5",
        overlay: "rgba(0, 0, 0, 0.94)",
        primarySoft: "rgba(169, 214, 229, 0.2)",
        successSoft: "rgba(143, 227, 192, 0.2)",
        warningSoft: "rgba(255, 209, 102, 0.2)",
        dangerSoft: "rgba(255, 180, 168, 0.2)",
        infoSoft: "rgba(196, 228, 242, 0.2)",
        violetSoft: "rgba(212, 198, 245, 0.2)",
        amber: "#FFD166",
        amberSoft: "rgba(255, 209, 102, 0.12)",
        placeholderColor: "#D0D0D0"
    },
    lightHighContrast: {
        background: "#FFFFFF",
        foreground: "#111111",
        primary: "#00335C",
        primaryForeground: "#FFFFFF",
        surface: "#FFFFFF",
        surfaceMuted: "#FAFAFA",
        mutedSurface: "#F3F3F3",
        input: "#FFFFFF",
        border: "#3D4750",
        mutedForeground: "#37414D",
        secondaryForeground: "#1A1F26",
        success: "#0A4A31",
        warning: "#5C3D00",
        danger: "#8C1D18",
        info: "#00456E",
        violet: "#3F3168",
        overlay: "rgba(17, 17, 17, 0.68)",
        primarySoft: "rgba(0, 51, 92, 0.16)",
        successSoft: "rgba(10, 74, 49, 0.16)",
        warningSoft: "rgba(92, 61, 0, 0.16)",
        dangerSoft: "rgba(140, 29, 24, 0.16)",
        infoSoft: "rgba(0, 69, 110, 0.16)",
        violetSoft: "rgba(63, 49, 104, 0.16)",
        amber: "#5C3D00",
        amberSoft: "rgba(92, 61, 0, 0.12)",
        placeholderColor: "#37414D"
    },
} as const;

/** Canonical PV scale accents for this platform, resolved from brand/tokens.json. */
export const GENERATED_SCALE_ACCENTS = {
    provision: "#0A4A31",
    variety: "#C2410C",
    challenge: "#26708F",
    sociability: "#7C3560",
} as const;

/** Headline construct accents (Play Value / Usability). Shared verbatim with copa-frontend. */
export const GENERATED_CONSTRUCT_ACCENTS = {
    playValue: "#4A3F99",
    usability: "#985952",
} as const;

/** Colours for generated PDF/XLSX documents. Documents print on white, so they do not follow the app theme. */
export const GENERATED_EXPORT_DOCUMENT_COLORS = {
    headerFill: "#013A63",
    headerText: "#FFFFFF",
    sectionFill: "#D9EAF5",
    sectionTitleText: "#012A4A",
    sectionText: "#14181D",
    sectionInstructionText: "#3A424B",
    sectionNotesText: "#5C6773",
    rowEven: "#F7F9FB",
    rowOdd: "#FFFFFF",
    bodyText: "#14181D",
    sheetBodyText: "#3A424B",
    mutedText: "#5C6773",
    border: "#D6DCE2",
    borderStrong: "#89C2D9",
    summaryFill: "#01497C",
    summaryText: "#FFFFFF",
    summaryNeutralFill: "#EDF1F5",
    scoreAccentText: "#013A63",
    subtitleText: "#A9D6E5",
} as const;

/** Native launch surfaces, read by app.config.js before any JS runs. */
export const GENERATED_NATIVE_SPLASH_COLORS = {
    light: "#F7F9FB",
    dark: "#0E1419",
    adaptiveIconBackground: "#F7F9FB",
} as const;

/** Shadow, glass (blur overlay) and modal scrim values. Mostly warm-tinted, not neutral. */
export const GENERATED_MOBILE_SURFACE_COLORS = {
    darkShadowCard: "rgba(0, 0, 0, 0.14)",
    darkShadowAccent: "rgba(97, 165, 194, 0.12)",
    darkGlassSurface: "rgba(22, 29, 36, 0.74)",
    darkGlassBorder: "rgba(232, 237, 242, 0.2)",
    darkGlassShadow: "rgba(0, 0, 0, 0.24)",
    darkTabBarSurface: "rgba(14, 20, 25, 0.84)",
    darkTabBarBorder: "rgba(232, 237, 242, 0.14)",
    lightShadowCard: "rgba(20, 24, 29, 0.08)",
    lightShadowAccent: "rgba(1, 73, 124, 0.2)",
    lightGlassSurface: "rgba(255, 255, 255, 0.76)",
    lightGlassBorder: "rgba(20, 24, 29, 0.12)",
    lightGlassShadow: "rgba(20, 24, 29, 0.12)",
    lightTabBarSurface: "rgba(255, 255, 255, 0.72)",
    lightTabBarBorder: "rgba(20, 24, 29, 0.1)",
    modalScrim: "rgba(8, 24, 38, 0.6)",
} as const;
