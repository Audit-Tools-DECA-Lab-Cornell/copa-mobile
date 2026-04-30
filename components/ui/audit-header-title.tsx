import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

/**
 * Responsive navigation header title shared across audit execution, place, and
 * report screens.
 *
 * `size="md"` — dual-label screens (place name + mode / section subtitle).
 *   - Tablet:  `Primary  |  Secondary` on one row at `titleMd` size.
 *   - Mobile:  `Primary` (bold `titleMd`) stacked above `Secondary` (regular `labelLg`).
 *
 * `size="lg"` — single-label screens (place name or report title, no subtitle).
 *   - Both:    single row at `titleLg` / `bodySemiBold`.
 */
export interface AuditHeaderTitleProps {
    /** Primary label — place name, report title, etc. */
    readonly primary: string;
    /**
     * Optional secondary label — execution mode, section title, etc.
     * On tablet this renders inline with a `|` separator; on mobile it
     * stacks below the primary. Ignored when `size="lg"`.
     */
    readonly secondary?: string | undefined;
    /**
     * `"md"` (default) — dual-label header for screens that show a sub-context.
     * `"lg"` — single-label header for place / report title screens.
     */
    readonly size?: "md" | "lg";
}

/** Truncate `text` and append `…` when it exceeds `maxLength`. */
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength)}...`;
}

/**
 * Tablet truncation limit (characters). Wide enough to accommodate long place
 * names while still preventing overflow at extreme widths.
 */
const TABLET_LIMIT = 120;
/** Mobile truncation limit for `size="md"` headers (place name + subtitle). */
const MOBILE_MD_LIMIT = 30;
/** Mobile truncation limit for `size="lg"` headers (place name only). */
const MOBILE_LG_LIMIT = 40;
/** Mobile truncation limit for the secondary label. */
const MOBILE_SECONDARY_LIMIT = 60;

export function AuditHeaderTitle({ primary, secondary, size = "md" }: AuditHeaderTitleProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    const isMd = size === "md";
    const primaryFont = isMd ? ds.fonts.bodyBold : ds.fonts.bodySemiBold;
    const primaryTypo = isMd ? ds.typography.titleMd : ds.typography.titleLg;

    const displayPrimary = truncateText(
        primary,
        layout.isTablet ? TABLET_LIMIT : isMd ? MOBILE_MD_LIMIT : MOBILE_LG_LIMIT,
    );
    const displaySecondary =
        secondary !== undefined
            ? truncateText(secondary, layout.isTablet ? TABLET_LIMIT : MOBILE_SECONDARY_LIMIT)
            : undefined;

    return (
        <YStack
            justify="center"
            py={isMd ? "$1.5" : undefined}
            my={isMd ? undefined : "$2.5"}
            overflowX={isMd ? undefined : "scroll"}
        >
            <ScrollView horizontal>
                {layout.isTablet && displaySecondary !== undefined ? (
                    // Tablet + secondary: one line with a pipe separator
                    <XStack items="center" gap="$2">
                        <Text
                            color={ds.colors.primary}
                            fontFamily={primaryFont}
                            fontSize={primaryTypo.fontSize}
                            lineHeight={primaryTypo.lineHeight}
                        >
                            {displayPrimary}
                        </Text>
                        <Text
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyRegular}
                            fontSize={primaryTypo.fontSize}
                            lineHeight={primaryTypo.lineHeight}
                        >
                            |
                        </Text>
                        <Text
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyRegular}
                            fontSize={primaryTypo.fontSize}
                            lineHeight={primaryTypo.lineHeight}
                        >
                            {displaySecondary}
                        </Text>
                    </XStack>
                ) : (
                    // Mobile (or tablet with no secondary): primary alone or stacked
                    <YStack justify="center">
                        <Text
                            color={ds.colors.primary}
                            fontFamily={primaryFont}
                            fontSize={primaryTypo.fontSize}
                            lineHeight={primaryTypo.lineHeight}
                        >
                            {displayPrimary}
                        </Text>
                        {displaySecondary !== undefined && (
                            <Text
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyRegular}
                                fontSize={ds.typography.labelLg.fontSize}
                                lineHeight={ds.typography.labelLg.lineHeight}
                            >
                                {displaySecondary}
                            </Text>
                        )}
                    </YStack>
                )}
            </ScrollView>
        </YStack>
    );
}
