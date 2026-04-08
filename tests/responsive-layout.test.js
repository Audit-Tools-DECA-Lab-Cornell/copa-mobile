import { describe, expect, test } from "bun:test";
import { createResponsiveLayoutTokens } from "lib/responsive-layout-tokens";

/**
 * Lock in the iPad layout tokens used by the feedback pass.
 */
describe("createResponsiveLayoutTokens", () => {
    test("uses one shared tablet structure above the phone breakpoint", () => {
        const compactTablet = createResponsiveLayoutTokens(834);
        const wideTablet = createResponsiveLayoutTokens(1366);

        expect(compactTablet.isTablet).toBe(true);
        expect(wideTablet.isTablet).toBe(true);
        expect(compactTablet.formMaxWidth).toBe(600);
        expect(wideTablet.formMaxWidth).toBe(600);
        expect(compactTablet.supportRailWidth).toBeLessThan(wideTablet.supportRailWidth);
        expect(compactTablet.twoPaneGap).toBeLessThan(wideTablet.twoPaneGap);
        expect(compactTablet.buttonHeight).toBeLessThan(wideTablet.buttonHeight);
        expect(compactTablet.summaryCardMinHeight).toBeLessThan(wideTablet.summaryCardMinHeight);
    });

    test("keeps phone values below the tablet breakpoint", () => {
        const phone = createResponsiveLayoutTokens(390);

        expect(phone.isTablet).toBe(false);
        expect(phone.supportRailWidth).toBe(0);
        expect(phone.homePageSupportRailWidth).toBe(0);
        expect(phone.buttonHeight).toBe(52);
    });
});
