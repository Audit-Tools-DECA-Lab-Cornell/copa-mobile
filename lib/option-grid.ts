/**
 * Resolve a reusable width for wrapped answer-option buttons.
 *
 * Three-option sets read best as an even 3-up tablet grid; all other counts
 * keep the existing 2-up layout.
 *
 * @param optionCount Total visible options in the choice set.
 * @param optionLabelLength Maximum length of the option label text.
 * @returns Percentage width string for each option button.
 */
export function getOptionGridItemWidth(
    optionCount: number,
    optionLabelLength: number,
): `${number}%` {
    if (Number.isFinite(optionCount) && optionCount === 3 && optionLabelLength < 20) {
        return "31.5%";
    }

    return optionLabelLength < 20 ? "48.5%" : "100%";
}
