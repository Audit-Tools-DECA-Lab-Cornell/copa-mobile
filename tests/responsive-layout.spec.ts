import { describe, expect, it, vi } from "vitest";
import {
    createResponsiveLayout,
    getResponsiveContentContainerStyle,
    getResponsiveTabBarLayout,
} from "lib/responsive-layout";

vi.mock("react-native", () => ({
    Platform: { OS: "android" },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
}));

describe("createResponsiveLayout", () => {
    it("uses tablet layout when an Android tablet reports a 600dp window", () => {
        // Given: Android's medium-width tablet class starts at 600dp.
        const tabletWindowWidth = 600;

        // When: the shared COPA layout tokens are resolved.
        const layout = createResponsiveLayout(tabletWindowWidth);

        // Then: tablet surfaces use the full tablet layout instead of the phone shell.
        expect(layout.isTablet).toBe(true);
        expect(layout.contentMaxWidth).toBeGreaterThan(tabletWindowWidth);
        expect(layout.screenPaddingHorizontal).toBeGreaterThan(15);
    });

    it("keeps narrow phones on the phone layout", () => {
        // Given: a typical phone portrait width.
        const phoneWindowWidth = 390;

        // When: the shared COPA layout tokens are resolved.
        const layout = createResponsiveLayout(phoneWindowWidth);

        // Then: phone surfaces keep the compact layout.
        expect(layout.isTablet).toBe(false);
        expect(layout.contentMaxWidth).toBe(560);
        expect(layout.screenPaddingHorizontal).toBe(15);
    });

    it("adds the top safe-area inset to standard screen top padding", () => {
        // Given: a phone layout and a reported status-bar safe area.
        const layout = createResponsiveLayout(390);
        const topInset = 24;

        // When: a headerless screen builds its responsive content container.
        const style = getResponsiveContentContainerStyle(layout, {
            bottomPadding: 32,
            topInset,
        });

        // Then: content starts below both the safe area and normal screen padding.
        expect(style.paddingTop).toBe(layout.screenPaddingVertical + topInset);
    });

    it("keeps tablet tab content clear after bottom safe-area padding is applied", () => {
        // Given: a tablet layout with a bottom system inset.
        const layout = createResponsiveLayout(600);

        // When: the bottom tab bar sizing is resolved.
        const tabBarLayout = getResponsiveTabBarLayout(layout);

        // Then: the height reserves separate space for content, padding, and the inset.
        expect(tabBarLayout.height).toBe(
            tabBarLayout.contentHeight + tabBarLayout.paddingTop + tabBarLayout.paddingBottom,
        );
        expect(tabBarLayout.height - tabBarLayout.paddingTop - tabBarLayout.paddingBottom).toBe(layout.buttonHeight);
    });
});
