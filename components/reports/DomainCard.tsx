import { memo, type ReactNode } from "react";
import { YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

export interface DomainCardProps {
    readonly children: ReactNode;
    readonly accessibilityLabel?: string;
}

/**
 * Elevated surface for one domain section in short/extended reports.
 * Padding and shadow scale fluidly with the active viewport tier.
 */
export const DomainCard = memo(function DomainCard({ children, accessibilityLabel }: DomainCardProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    // Scale card padding: phone 14px → narrow tablet 16px → wide tablet 20px
    const cardPadding = layout.isWideTablet ? 20 : layout.isTablet ? 16 : 14;
    const borderRadius = layout.isTablet ? ds.radii.xl : ds.radii.lg;

    return (
        <YStack
            accessibilityLabel={accessibilityLabel}
            rounded={borderRadius}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={cardPadding}
            gap="$3"
            style={{
                boxShadow: ds.shadows.card,
                // Slight inner-top highlight for depth on cards
                borderTopColor: ds.colors.mutedSurface,
            }}
        >
            {children}
        </YStack>
    );
});
