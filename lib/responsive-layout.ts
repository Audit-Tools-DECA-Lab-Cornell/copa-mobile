import { useMemo } from "react";
import { useWindowDimensions, type ViewStyle } from "react-native";

const FALLBACK_WINDOW_WIDTH = 390;
const TABLET_BREAKPOINT = 720;
const LARGE_TABLET_BREAKPOINT = 1180;
const PHONE_CONTENT_MAX_WIDTH = 560;
const TABLET_CONTENT_MAX_WIDTH = 1040;
const LARGE_TABLET_CONTENT_MAX_WIDTH = 1120;
const PHONE_FORM_MAX_WIDTH = 560;
const TABLET_FORM_MAX_WIDTH = 920;
const LARGE_TABLET_FORM_MAX_WIDTH = 980;

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
    readonly isLargeTablet: boolean;
    readonly screenPaddingHorizontal: number;
    readonly screenPaddingVertical: number;
    readonly contentMaxWidth: number;
    readonly formMaxWidth: number;
    readonly sectionGap: number;
    readonly cardPadding: number;
    readonly controlHeight: number;
    readonly compactControlHeight: number;
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
 * Clamp a max-width request to a safe positive number.
 *
 * @param maxWidth Requested content max-width.
 * @returns Safe positive max-width.
 */
function normalizeMaxWidth(maxWidth: number): number {
    return Number.isFinite(maxWidth) && maxWidth > 0 ? maxWidth : PHONE_CONTENT_MAX_WIDTH;
}

/**
 * Centralize tablet-aware padding and sizing so screens stay visually balanced
 * on iPad without disturbing compact phone layouts.
 *
 * @returns Responsive spacing and size tokens for the active viewport width.
 */
export function useResponsiveLayout(): ResponsiveLayout {
    const { width } = useWindowDimensions();

    return useMemo(() => {
        const windowWidth = normalizeWindowWidth(width);
        const isTablet = windowWidth >= TABLET_BREAKPOINT;
        const isLargeTablet = windowWidth >= LARGE_TABLET_BREAKPOINT;

        return {
            windowWidth,
            isTablet,
            isLargeTablet,
            screenPaddingHorizontal: isLargeTablet ? 36 : isTablet ? 28 : 15,
            screenPaddingVertical: isTablet ? 24 : 16,
            contentMaxWidth: isLargeTablet
                ? LARGE_TABLET_CONTENT_MAX_WIDTH
                : isTablet
                  ? TABLET_CONTENT_MAX_WIDTH
                  : PHONE_CONTENT_MAX_WIDTH,
            formMaxWidth: isLargeTablet
                ? LARGE_TABLET_FORM_MAX_WIDTH
                : isTablet
                  ? TABLET_FORM_MAX_WIDTH
                  : PHONE_FORM_MAX_WIDTH,
            sectionGap: isTablet ? 28 : 20,
            cardPadding: isTablet ? 20 : 16,
            controlHeight: isTablet ? 56 : 52,
            compactControlHeight: isTablet ? 44 : 36,
            statCardMinHeight: isTablet ? 140 : 0,
        };
    }, [width]);
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
    const resolvedMaxWidth = normalizeMaxWidth(options.maxWidth ?? layout.contentMaxWidth);
    const style: ViewStyle = {
        width: "100%",
        alignSelf: "center",
        maxWidth: resolvedMaxWidth + layout.screenPaddingHorizontal * 2,
        paddingHorizontal: layout.screenPaddingHorizontal,
        paddingBottom: Math.max(options.bottomPadding, 0),
    };

    if (options.includeTopPadding !== false) {
        style.paddingTop = layout.screenPaddingVertical;
    }

    if (typeof options.gap === "number" && Number.isFinite(options.gap) && options.gap > 0) {
        style.gap = options.gap;
    }

    return style;
}
