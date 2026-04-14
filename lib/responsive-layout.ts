import { useMemo } from "react";
import { useWindowDimensions, type ViewStyle } from "react-native";
import { createResponsiveLayoutTokens, type ResponsiveLayoutTokens } from "lib/responsive-layout-tokens";

export {
    FALLBACK_WINDOW_WIDTH,
    NARROW_TABLET_CONTENT_MAX_WIDTH,
    NARROW_TABLET_FORM_MAX_WIDTH,
    PHONE_CONTENT_MAX_WIDTH,
    PHONE_FORM_MAX_WIDTH,
    TABLET_BREAKPOINT,
    WIDE_TABLET_BREAKPOINT,
    WIDE_TABLET_CONTENT_MAX_WIDTH,
    WIDE_TABLET_FORM_MAX_WIDTH,
} from "lib/responsive-layout-tokens";

interface ResponsiveContentWidthOptions {
    readonly bottomPadding: number;
    readonly gap?: number;
    readonly maxWidth?: number;
    readonly includeTopPadding?: boolean;
}

/** Responsive layout values shared across phone and tablet screens. */
export type ResponsiveLayout = ResponsiveLayoutTokens;

/**
 * Resolve a max-width override to a safe positive value.
 *
 * @param maxWidth Requested content max-width override.
 * @param fallback Default content max-width for the active layout tier.
 * @returns Safe max-width value.
 */
function resolveMaxWidth(maxWidth: number | undefined, fallback: number): number {
    return typeof maxWidth === "number" && Number.isFinite(maxWidth) && maxWidth > 0 ? maxWidth : fallback;
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
function getAdaptiveHorizontalPadding(layout: Readonly<ResponsiveLayout>, resolvedMaxWidth: number): number {
    if (!layout.isTablet) {
        return layout.screenPaddingHorizontal;
    }

    const centeredPadding = Math.floor((layout.windowWidth - resolvedMaxWidth) / 2);

    return Math.max(centeredPadding, layout.screenPaddingHorizontal);
}

/**
 * Build responsive presentation tokens for a given viewport width.
 *
 * @param width Raw window width from React Native or tests.
 * @returns Responsive layout tokens for the active breakpoint tier.
 */
export function createResponsiveLayout(width: number): ResponsiveLayout {
    return createResponsiveLayoutTokens(width);
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
    const usesAdaptiveTabletGutters = layout.isTablet && horizontalPadding > layout.screenPaddingHorizontal;
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
