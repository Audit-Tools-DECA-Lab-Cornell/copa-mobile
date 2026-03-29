import { describe, expect, test } from "bun:test";
import { createResponsiveLayoutTokens } from "lib/responsive-layout-tokens";

/**
 * Lock in the iPad layout tokens used by the feedback pass.
 */
describe("createResponsiveLayoutTokens", () => {
    test("uses the updated narrow-tablet form width and support rail", () => {
        const layout = createResponsiveLayoutTokens(834);

        expect(layout.isTablet).toBe(true);
        expect(layout.isWideTablet).toBe(false);
        expect(layout.formMaxWidth).toBe(600);
        expect(layout.supportRailWidth).toBe(400);
        expect(layout.compactControlHeight).toBe(44);
    });

    test("uses the updated wide-tablet support rail", () => {
        const layout = createResponsiveLayoutTokens(1366);

        expect(layout.isWideTablet).toBe(true);
        expect(layout.formMaxWidth).toBe(600);
        expect(layout.supportRailWidth).toBe(460);
        expect(layout.compactControlHeight).toBe(46);
    });
});
