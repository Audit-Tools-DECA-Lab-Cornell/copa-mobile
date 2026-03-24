/**
 * Build a stable project-place key for audit state maps and routes.
 *
 * @param projectId Project UUID.
 * @param placeId Place UUID.
 * @returns Stable composite key.
 */
export function getProjectPlaceKey(projectId: string, placeId: string): string {
    return `${projectId}:${placeId}`;
}
