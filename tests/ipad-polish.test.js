import { describe, expect, test } from "bun:test";
import {
    getCardTextLineLimit,
    getExecuteSidebarTopPadding,
    getSettingsPageMaxWidth,
} from "lib/responsive";

/**
 * Keep iPad follow-up polish rules centralized and regression-tested.
 */
describe("iPad polish helpers", () => {
    test("uses fixed line clamps for queue cards", () => {
        expect(getCardTextLineLimit("title")).toBe(1);
        expect(getCardTextLineLimit("supporting")).toBe(2);
        expect(getCardTextLineLimit("meta")).toBe(1);
    });

    test("lets settings use the wider tablet track", () => {
        expect(
            getSettingsPageMaxWidth({
                isTablet: true,
                contentMaxWidth: 1200,
                formMaxWidth: 600,
            }),
        ).toBe(1200);
        expect(
            getSettingsPageMaxWidth({
                isTablet: false,
                contentMaxWidth: 1200,
                formMaxWidth: 560,
            }),
        ).toBe(560);
    });

    test("offsets the execute sidebar only when the banner is absent", () => {
        expect(getExecuteSidebarTopPadding(true)).toBe(0);
        expect(getExecuteSidebarTopPadding(false)).toBe(36);
    });
});
