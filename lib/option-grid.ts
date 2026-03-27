/**
 * Resolve a reusable width for wrapped answer-option buttons.
 *
 * Three-option sets read best as an even 3-up tablet grid; all other counts
 * keep the existing 2-up layout.
 *
 * @param optionCount Total visible options in the choice set.
 * @returns Percentage width string for each option button.
 */
export function getOptionGridItemWidth(optionCount: number): `${number}%` {
    if (Number.isFinite(optionCount) && optionCount === 3) {
        return "31.5%";
    }

    return "48.5%";
}
