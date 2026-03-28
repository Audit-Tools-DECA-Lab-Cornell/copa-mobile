export const FALLBACK_WINDOW_WIDTH = 390;
export const TABLET_BREAKPOINT = 720;
export const WIDE_TABLET_BREAKPOINT = 960;
export const PHONE_CONTENT_MAX_WIDTH = 560;
export const NARROW_TABLET_CONTENT_MAX_WIDTH = 1040;
export const WIDE_TABLET_CONTENT_MAX_WIDTH = 1200;
export const PHONE_FORM_MAX_WIDTH = 560;
export const NARROW_TABLET_FORM_MAX_WIDTH = 600;
export const WIDE_TABLET_FORM_MAX_WIDTH = 600;

const PHONE_LAYOUT_TOKENS = {
    screenPaddingHorizontal: 15,
    screenPaddingVertical: 16,
    contentMaxWidth: PHONE_CONTENT_MAX_WIDTH,
    formMaxWidth: PHONE_FORM_MAX_WIDTH,
    twoPaneGap: 20,
    homePageSupportRailWidth: 0,
    supportRailWidth: 0,
    sectionGap: 20,
    cardPadding: 16,
    buttonHeight: 52,
    formOptionHeight: 42,
    compactControlHeight: 36,
    queueCardMinHeight: 0,
    summaryCardMinHeight: 0,
    heroCardMinHeight: 0,
} as const;

const NARROW_TABLET_LAYOUT_TOKENS = {
    screenPaddingHorizontal: 28,
    screenPaddingVertical: 24,
    contentMaxWidth: NARROW_TABLET_CONTENT_MAX_WIDTH,
    formMaxWidth: NARROW_TABLET_FORM_MAX_WIDTH,
    twoPaneGap: 24,
    homePageSupportRailWidth: 250,
    supportRailWidth: 340,
    sectionGap: 28,
    cardPadding: 16,
    buttonHeight: 56,
    formOptionHeight: 48,
    compactControlHeight: 44,
    queueCardMinHeight: 152,
    summaryCardMinHeight: 144,
    heroCardMinHeight: 192,
} as const;

const WIDE_TABLET_LAYOUT_TOKENS = {
    screenPaddingHorizontal: 36,
    screenPaddingVertical: 28,
    contentMaxWidth: WIDE_TABLET_CONTENT_MAX_WIDTH,
    formMaxWidth: WIDE_TABLET_FORM_MAX_WIDTH,
    twoPaneGap: 32,
    homePageSupportRailWidth: 290,
    supportRailWidth: 390,
    sectionGap: 32,
    cardPadding: 16,
    buttonHeight: 60,
    formOptionHeight: 52,
    compactControlHeight: 46,
    queueCardMinHeight: 168,
    summaryCardMinHeight: 160,
    heroCardMinHeight: 208,
} as const;

const LEGACY_PHONE_CONTROL_HEIGHT = 52;
const LEGACY_TABLET_CONTROL_HEIGHT = 56;
const LEGACY_PHONE_STAT_CARD_MIN_HEIGHT = 0;
const LEGACY_TABLET_STAT_CARD_MIN_HEIGHT = 140;

/**
 * Responsive layout values shared across phone and tablet screens.
 */
export interface ResponsiveLayoutTokens {
    readonly windowWidth: number;
    readonly isTablet: boolean;
    readonly isNarrowTablet: boolean;
    readonly isWideTablet: boolean;
    readonly isLargeTablet: boolean;
    readonly screenPaddingHorizontal: number;
    readonly screenPaddingVertical: number;
    readonly contentMaxWidth: number;
    readonly formMaxWidth: number;
    readonly twoPaneGap: number;
    readonly homePageSupportRailWidth: number;
    readonly supportRailWidth: number;
    readonly sectionGap: number;
    readonly cardPadding: number;
    readonly buttonHeight: number;
    readonly formOptionHeight: number;
    readonly controlHeight: number;
    readonly compactControlHeight: number;
    readonly queueCardMinHeight: number;
    readonly summaryCardMinHeight: number;
    readonly heroCardMinHeight: number;
    readonly statCardMinHeight: number;
}

/**
 * Guard against invalid dimension values before deriving breakpoint tokens.
 *
 * @param width Raw window width from React Native.
 * @returns Safe width value for layout calculations.
 */
function normalizeWindowWidth(width: number): number {
    return Number.isFinite(width) && width > 0 ? width : FALLBACK_WINDOW_WIDTH;
}

/**
 * Build responsive presentation tokens for a given viewport width.
 *
 * @param width Raw window width from React Native or tests.
 * @returns Responsive layout tokens for the active breakpoint tier.
 */
export function createResponsiveLayoutTokens(width: number): ResponsiveLayoutTokens {
    const windowWidth = normalizeWindowWidth(width);
    const isTablet = windowWidth >= TABLET_BREAKPOINT;
    const isWideTablet = windowWidth >= WIDE_TABLET_BREAKPOINT;
    const isNarrowTablet = isTablet && !isWideTablet;
    const tierTokens = isWideTablet
        ? WIDE_TABLET_LAYOUT_TOKENS
        : isTablet
          ? NARROW_TABLET_LAYOUT_TOKENS
          : PHONE_LAYOUT_TOKENS;

    return {
        windowWidth,
        isTablet,
        isNarrowTablet,
        isWideTablet,
        isLargeTablet: isWideTablet,
        screenPaddingHorizontal: tierTokens.screenPaddingHorizontal,
        screenPaddingVertical: tierTokens.screenPaddingVertical,
        contentMaxWidth: tierTokens.contentMaxWidth,
        formMaxWidth: tierTokens.formMaxWidth,
        twoPaneGap: tierTokens.twoPaneGap,
        homePageSupportRailWidth: tierTokens.homePageSupportRailWidth,
        supportRailWidth: tierTokens.supportRailWidth,
        sectionGap: tierTokens.sectionGap,
        cardPadding: tierTokens.cardPadding,
        buttonHeight: tierTokens.buttonHeight,
        formOptionHeight: tierTokens.formOptionHeight,
        controlHeight: isTablet ? LEGACY_TABLET_CONTROL_HEIGHT : LEGACY_PHONE_CONTROL_HEIGHT,
        compactControlHeight: tierTokens.compactControlHeight,
        queueCardMinHeight: tierTokens.queueCardMinHeight,
        summaryCardMinHeight: tierTokens.summaryCardMinHeight,
        heroCardMinHeight: tierTokens.heroCardMinHeight,
        statCardMinHeight: isTablet
            ? LEGACY_TABLET_STAT_CARD_MIN_HEIGHT
            : LEGACY_PHONE_STAT_CARD_MIN_HEIGHT,
    };
}
