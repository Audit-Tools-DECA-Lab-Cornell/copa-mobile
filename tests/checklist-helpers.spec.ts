import { describe, expect, it } from "vitest";

import { toggleChecklistOption, setChecklistOtherText } from "lib/audit/checklist-helpers";

describe("toggleChecklistOption", () => {
    it("preserves question_note when toggling an option on", () => {
        const result = toggleChecklistOption([], "option_a", "", {
            question_note: "my comment",
        });

        expect(result.question_note).toBe("my comment");
        expect(result.selected_option_keys).toEqual(["option_a"]);
    });

    it("preserves question_note when toggling an option off", () => {
        const result = toggleChecklistOption(["option_a"], "option_a", "", {
            selected_option_keys: ["option_a"],
            question_note: "my comment",
        });

        expect(result.question_note).toBe("my comment");
        expect(result.selected_option_keys).toEqual([]);
    });

    it("does not include question_note when it is absent", () => {
        const result = toggleChecklistOption([], "option_a", "", {});

        expect("question_note" in result).toBe(false);
    });

    it("preserves question_note when toggling 'other' with existing text", () => {
        const result = toggleChecklistOption([], "other", "some detail", {
            question_note: "my comment",
        });

        expect(result.question_note).toBe("my comment");
        expect(result.other_details).toEqual({ text: "some detail" });
    });
});

describe("setChecklistOtherText", () => {
    it("preserves question_note when updating other text", () => {
        const result = setChecklistOtherText(["other"], "updated text", {
            selected_option_keys: ["other"],
            question_note: "my comment",
        });

        expect(result.question_note).toBe("my comment");
        expect(result.other_details).toEqual({ text: "updated text" });
    });

    it("does not include question_note when it is absent", () => {
        const result = setChecklistOtherText(["other"], "updated text", {
            selected_option_keys: ["other"],
        });

        expect("question_note" in result).toBe(false);
    });
});
