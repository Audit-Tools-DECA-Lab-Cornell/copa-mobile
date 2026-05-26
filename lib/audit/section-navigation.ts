/**
 * Minimal shape required to compute adjacent execute-section routes.
 */
export interface SectionNavigationItem {
    readonly section_key: string;
}

/**
 * Return the section immediately before the active section in the current
 * visible-order list.
 *
 * @param sections Ordered visible sections for the current execution mode.
 * @param currentSectionKey Active section key.
 * @returns The previous section when one exists.
 */
export function getPreviousSection<TSection extends SectionNavigationItem>(
    sections: readonly TSection[],
    currentSectionKey: string,
): TSection | undefined {
    const currentIndex = sections.findIndex((section) => section.section_key === currentSectionKey);
    if (currentIndex <= 0) {
        return undefined;
    }
    return sections[currentIndex - 1];
}

/**
 * Return the section immediately after the active section in the current
 * visible-order list.
 *
 * @param sections Ordered visible sections for the current execution mode.
 * @param currentSectionKey Active section key.
 * @returns The next section when one exists.
 */
export function getNextSection<TSection extends SectionNavigationItem>(
    sections: readonly TSection[],
    currentSectionKey: string,
): TSection | undefined {
    const currentIndex = sections.findIndex((section) => section.section_key === currentSectionKey);
    if (currentIndex < 0) {
        return undefined;
    }
    return sections[currentIndex + 1];
}

/**
 * Build the app home route used when leaving the execute flow.
 *
 * @returns Root authenticated tab route.
 */
export function buildHomeRoute(): string {
    return "/(tabs)";
}

/**
 * Build the standalone section-overview route for the current place.
 *
 * @param placeId Active place identifier.
 * @param projectId Active project identifier.
 * @returns Overview route with encoded query params.
 */
export function buildSectionOverviewRoute(placeId: string, projectId: string): string {
    return `/execute/${placeId}/overview?projectId=${encodeURIComponent(projectId)}`;
}

/**
 * Build a route to a specific section screen.
 *
 * @param placeId Active place identifier.
 * @param projectId Active project identifier.
 * @param sectionKey Target section key.
 * @returns Section route with encoded query params.
 */
export function buildSectionRoute(placeId: string, projectId: string, sectionKey: string): string {
    return `/execute/${placeId}/section/${encodeURIComponent(sectionKey)}?projectId=${encodeURIComponent(projectId)}`;
}

/**
 * Build the final-comments route after the last visible section.
 *
 * @param placeId Active place identifier.
 * @param projectId Active project identifier.
 * @param lastSectionKey Final completed section key.
 * @returns Final-comments route with encoded query params.
 */
export function buildFinalCommentsRoute(placeId: string, projectId: string, lastSectionKey: string): string {
    return `/execute/${placeId}/final-comments?projectId=${encodeURIComponent(projectId)}&lastSectionKey=${encodeURIComponent(lastSectionKey)}`;
}
