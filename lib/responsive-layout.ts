import { useMemo } from "react";
import { useWindowDimensions, type ViewStyle } from "react-native";

export const FALLBACK_WINDOW_WIDTH = 390;
export const TABLET_BREAKPOINT = 720;
export const WIDE_TABLET_BREAKPOINT = 960;
export const PHONE_CONTENT_MAX_WIDTH = 560;
export const NARROW_TABLET_CONTENT_MAX_WIDTH = 1040;
export const WIDE_TABLET_CONTENT_MAX_WIDTH = 1200;
export const PHONE_FORM_MAX_WIDTH = 560;
export const NARROW_TABLET_FORM_MAX_WIDTH = 920;
export const WIDE_TABLET_FORM_MAX_WIDTH = 980;

const PHONE_LAYOUT_TOKENS = {
    screenPaddingHorizontal: 15,
    screenPaddingVertical: 16,
    contentMaxWidth: PHONE_CONTENT_MAX_WIDTH,
    formMaxWidth: PHONE_FORM_MAX_WIDTH,
    twoPaneGap: 20,
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
    supportRailWidth: 280,
    sectionGap: 28,
    cardPadding: 20,
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
    supportRailWidth: 320,
    sectionGap: 32,
    cardPadding: 24,
    buttonHeight: 60,
    formOptionHeight: 52,
    compactControlHeight: 46,
    queueCardMinHeight: 168,
    summaryCardMinHeight: 160,
    heroCardMinHeight: 208,
} as const;

const LEGACY_PHONE_CONTROL_HEIGHT = 52;
const LEGACY_TABLET_CONTROL_HEIGHT = 56;
const LEGACY_PHONE_COMPACT_CONTROL_HEIGHT = 36;
const LEGACY_TABLET_COMPACT_CONTROL_HEIGHT = 44;
const LEGACY_PHONE_STAT_CARD_MIN_HEIGHT = 0;
const LEGACY_TABLET_STAT_CARD_MIN_HEIGHT = 140;

interface ResponsiveContentWidthOptions {
    readonly bottomPadding: number;
    readonly gap?: number;
    readonly maxWidth?: number;
    readonly includeTopPadding?: boolean;
}

/**
 * Responsive layout values shared across phone and tablet screens.
 */
export interface ResponsiveLayout {
    readonly windowWidth: number;
    readonly isTablet: boolean;
    readonly isNarrowTablet: boolean;
    readonly isWideTablet: boolean;
    /** Compatibility alias until existing consumers adopt `isWideTablet`. */
    readonly isLargeTablet: boolean;
    readonly screenPaddingHorizontal: number;
    readonly screenPaddingVertical: number;
    readonly contentMaxWidth: number;
    readonly formMaxWidth: number;
    readonly twoPaneGap: number;
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
 * Resolve a max-width override to a safe positive value.
 *
 * @param maxWidth Requested content max-width override.
 * @param fallback Default content max-width for the active layout tier.
 * @returns Safe max-width value.
 */
function resolveMaxWidth(maxWidth: number | undefined, fallback: number): number {
    return typeof maxWidth === "number" && Number.isFinite(maxWidth) && maxWidth > 0
        ? maxWidth
        : fallback;
}

/**
 * Convert spare tablet width into symmetric gutters once the viewport is wider
 * than the intended content track.
 *
 * @param layout Responsive layout tokens for the current viewport.
 * @param resolvedMaxWidth Requested content max-width.
 * @returns Horizontal padding that centers tablet content without constraining
 *          the outer container.
 */
function getAdaptiveHorizontalPadding(
    layout: Readonly<ResponsiveLayout>,
    resolvedMaxWidth: number,
): number {
    if (!layout.isTablet) {
        return layout.screenPaddingHorizontal;
    }

    const centeredPadding = Math.floor((layout.windowWidth - resolvedMaxWidth) / 2);

    return centeredPadding > layout.screenPaddingHorizontal
        ? centeredPadding
        : layout.screenPaddingHorizontal;
}

/**
 * Build responsive presentation tokens for a given viewport width.
 *
 * @param width Raw window width from React Native or tests.
 * @returns Responsive layout tokens for the active breakpoint tier.
 */
export function createResponsiveLayout(width: number): ResponsiveLayout {
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
        // Compatibility alias until existing consumers migrate to `isWideTablet`.
        isLargeTablet: isWideTablet,
        screenPaddingHorizontal: tierTokens.screenPaddingHorizontal,
        screenPaddingVertical: tierTokens.screenPaddingVertical,
        contentMaxWidth: tierTokens.contentMaxWidth,
        formMaxWidth: tierTokens.formMaxWidth,
        twoPaneGap: tierTokens.twoPaneGap,
        supportRailWidth: tierTokens.supportRailWidth,
        sectionGap: tierTokens.sectionGap,
        cardPadding: tierTokens.cardPadding,
        buttonHeight: tierTokens.buttonHeight,
        formOptionHeight: tierTokens.formOptionHeight,
        controlHeight: isTablet ? LEGACY_TABLET_CONTROL_HEIGHT : LEGACY_PHONE_CONTROL_HEIGHT,
        compactControlHeight: isTablet
            ? LEGACY_TABLET_COMPACT_CONTROL_HEIGHT
            : LEGACY_PHONE_COMPACT_CONTROL_HEIGHT,
        queueCardMinHeight: tierTokens.queueCardMinHeight,
        summaryCardMinHeight: tierTokens.summaryCardMinHeight,
        heroCardMinHeight: tierTokens.heroCardMinHeight,
        statCardMinHeight: isTablet
            ? LEGACY_TABLET_STAT_CARD_MIN_HEIGHT
            : LEGACY_PHONE_STAT_CARD_MIN_HEIGHT,
    };
}

/**
 * Centralize tablet-aware padding and sizing so screens stay visually balanced
 * on iPad without disturbing compact phone layouts.
 *
 * @returns Responsive spacing and size tokens for the active viewport width.
 */
export function useResponsiveLayout(): ResponsiveLayout {
    const { width } = useWindowDimensions();

    return useMemo(() => createResponsiveLayout(width), [width]);
}

/**
 * Build a centered content container style for scroll and list screens.
 *
 * @param layout Responsive layout tokens for the current viewport.
 * @param options Padding, max-width, and gap overrides.
 * @returns View style that centers wide-screen content safely.
 */
export function getResponsiveContentContainerStyle(
    layout: Readonly<ResponsiveLayout>,
    options: Readonly<ResponsiveContentWidthOptions>,
): ViewStyle {
    const resolvedMaxWidth = resolveMaxWidth(options.maxWidth, layout.contentMaxWidth);
    const horizontalPadding = getAdaptiveHorizontalPadding(layout, resolvedMaxWidth);
    const usesAdaptiveTabletGutters =
        layout.isTablet && horizontalPadding > layout.screenPaddingHorizontal;
    const style: ViewStyle = {
        width: "100%",
        paddingHorizontal: horizontalPadding,
        paddingBottom: Math.max(options.bottomPadding, 0),
    };

    if (!usesAdaptiveTabletGutters) {
        style.alignSelf = "center";
        style.maxWidth = resolvedMaxWidth + layout.screenPaddingHorizontal * 2;
    }

    if (options.includeTopPadding !== false) {
        style.paddingTop = layout.screenPaddingVertical;
    }

    if (typeof options.gap === "number" && Number.isFinite(options.gap) && options.gap > 0) {
        style.gap = options.gap;
    }

    return style;
}
