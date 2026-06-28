import { describe, expect, it, vi } from "vitest";
import { createResponsiveLayout } from "lib/responsive-layout";

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
});
