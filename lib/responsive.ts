type CardTextRole = "title" | "supporting" | "meta";

interface SettingsPageMaxWidthOptions {
    readonly isTablet: boolean;
    readonly contentMaxWidth: number;
    readonly formMaxWidth: number;
}

/**
 * Keep the main queue-card text clamps consistent across iPad surfaces.
 *
 * @param role Text role within a compact place or audit card.
 * @returns Maximum number of lines allowed for the role.
 */
export function getCardTextLineLimit(role: CardTextRole): number {
    switch (role) {
        case "title":
            return 2;
        case "supporting":
            return 2;
        case "meta":
        default:
            return 1;
    }
}

/**
 * Let the settings screen use the wider content track on iPad while
 * preserving the narrower form width on phone.
 *
 * @param options Active responsive layout widths.
 * @returns Max width for the settings page content container.
 */
export function getSettingsPageMaxWidth(options: Readonly<SettingsPageMaxWidthOptions>): number {
    return options.isTablet ? options.contentMaxWidth : options.formMaxWidth;
}

/**
 * Offset the execute sidebar down when the sync banner is absent so the first
 * action aligns with the section filter row instead of the left-column title.
 *
 * @param hasSyncStatusCard Whether the sync-status banner is visible.
 * @returns Top padding in pixels for the sidebar stack.
 */
export function getExecuteSidebarTopPadding(hasSyncStatusCard: boolean): number {
    return hasSyncStatusCard ? 0 : 36;
}
