import { describe, expect, test } from "bun:test";
import { getOptionGridItemWidth } from "./option-grid";

/**
 * Choice grids should give three-option questions an even tablet-friendly layout.
 */
describe("getOptionGridItemWidth", () => {
    test("uses a three-column width for three-option sets", () => {
        expect(getOptionGridItemWidth(3)).toBe("31.5%");
    });

    test("falls back to a two-column width for other option counts", () => {
        expect(getOptionGridItemWidth(2)).toBe("48.5%");
        expect(getOptionGridItemWidth(4)).toBe("48.5%");
        expect(getOptionGridItemWidth(0)).toBe("48.5%");
    });
});
