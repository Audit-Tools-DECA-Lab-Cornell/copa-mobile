import { describe, expect, it } from "vitest";

import {
    buildFinalCommentsRoute,
    buildHomeRoute,
    buildSectionOverviewRoute,
    buildSectionRoute,
    getNextSection,
    getPreviousSection,
} from "lib/audit/section-navigation";

const sections = [{ section_key: "section_1" }, { section_key: "section_2" }, { section_key: "section_3" }] as const;

describe("section navigation", () => {
    it("returns the previous section when one exists", () => {
        expect(getPreviousSection(sections, "section_2")?.section_key).toBe("section_1");
    });

    it("returns undefined when the current section is the first visible section", () => {
        expect(getPreviousSection(sections, "section_1")).toBeUndefined();
    });

    it("returns the next section when one exists", () => {
        expect(getNextSection(sections, "section_2")?.section_key).toBe("section_3");
    });

    it("builds encoded execute routes for overview, section pages, and final comments", () => {
        expect(buildHomeRoute()).toBe("/(tabs)");
        expect(buildSectionOverviewRoute("place id", "project id")).toBe(
            "/execute/place id/overview?projectId=project%20id",
        );
        expect(buildSectionRoute("place id", "project id", "section/2")).toBe(
            "/execute/place id/section/section%2F2?projectId=project%20id",
        );
        expect(buildFinalCommentsRoute("place id", "project id", "section/2")).toBe(
            "/execute/place id/final-comments?projectId=project%20id&lastSectionKey=section%2F2",
        );
    });
});
