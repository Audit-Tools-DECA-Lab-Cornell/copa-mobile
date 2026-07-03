import { Text, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

/**
 * Responsive navigation header title shared across audit execution, place, and
 * report screens.
 *
 * `size="md"` - dual-label screens (place name + mode / section subtitle).
 *   - Tablet:  `Primary  |  Secondary` on one line, ellipsized to fit the header.
 *   - Mobile:  `Primary` (bold `titleMd`) stacked above `Secondary` (regular `labelLg`).
 *
 * `size="lg"` - single-label screens (place name or report title, no subtitle).
 *   - Both:    single line at `titleLg` / `bodySemiBold`.
 *
 * Text is bounded by the native header title container and truncates with a
 * trailing ellipsis (`numberOfLines={1}` + `ellipsizeMode="tail"`) so long place
 * or section names never collide with the header's right-hand action.
 */
export interface AuditHeaderTitleProps {
    /** Primary label - place name, report title, etc. */
    readonly primary: string;
    /**
     * Optional secondary label - execution mode, section title, etc.
     * On tablet this renders inline with a `|` separator; on mobile it
     * stacks below the primary. Ignored when `size="lg"`.
     */
    readonly secondary?: string | undefined;
    /**
     * `"md"` (default) - dual-label header for screens that show a sub-context.
     * `"lg"` - single-label header for place / report title screens.
     */
    readonly size?: "md" | "lg";
}

export function AuditHeaderTitle({ primary, secondary, size = "md" }: AuditHeaderTitleProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    const isMd = size === "md";
    const primaryFont = isMd ? ds.fonts.bodyBold : ds.fonts.bodySemiBold;
    const primaryTypo = isMd ? ds.typography.titleMd : ds.typography.titleLg;

    if (layout.isTablet && secondary !== undefined) {
        // Tablet + secondary: one line, `Primary | Secondary`, ellipsized as a unit.
        return (
            <YStack justify="center" py="$1.5" shrink={1}>
                <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    fontSize={primaryTypo.fontSize}
                    lineHeight={primaryTypo.lineHeight}
                >
                    <Text color={ds.colors.primary} fontFamily={primaryFont}>
                        {primary}
                    </Text>
                    <Text color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyRegular}>
                        {`   |   ${secondary}`}
                    </Text>
                </Text>
            </YStack>
        );
    }

    // Mobile (or tablet with no secondary): primary alone or stacked over secondary.
    return (
        <YStack justify="center" my={isMd ? undefined : "$2.5"} py={isMd ? "$1.5" : undefined} shrink={1}>
            <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                color={ds.colors.primary}
                fontFamily={primaryFont}
                fontSize={primaryTypo.fontSize}
                lineHeight={primaryTypo.lineHeight}
            >
                {primary}
            </Text>
            {secondary !== undefined && (
                <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyRegular}
                    fontSize={ds.typography.labelLg.fontSize}
                    lineHeight={ds.typography.labelLg.lineHeight}
                >
                    {secondary}
                </Text>
            )}
        </YStack>
    );
}
