/**
 * Resolve a reusable width for wrapped answer-option buttons.
 *
 * Three-option sets read best as an even 3-up tablet grid; all other counts
 * keep the existing 2-up layout. On phone screens the threshold is tighter
 * so options stack vertically when labels are too long to comfortably fit
 * side-by-side.
 *
 * @param optionCount Total visible options in the choice set.
 * @param optionLabelLength Maximum length of the option label text.
 * @param isPhone Whether the current device is a phone-width screen.
 * @returns Percentage width string for each option button.
 */
export function getOptionGridItemWidth(
    optionCount: number,
    optionLabelLength: number,
    isPhone: boolean = false,
): `${number}%` {
    const labelThreshold = isPhone ? 8 : 20;

    if (Number.isFinite(optionCount) && optionCount === 3 && optionLabelLength < labelThreshold) {
        return "31.5%";
    }

    return optionLabelLength < labelThreshold ? "48.5%" : "100%";
}
