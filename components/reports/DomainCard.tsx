import { memo, type ReactNode } from "react";
import { YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

export interface DomainCardProps {
    readonly children: ReactNode;
    readonly accessibilityLabel?: string;
}

/**
 * Shared elevated surface for one domain section in short/extended reports.
 */
export const DomainCard = memo(function DomainCard({ children, accessibilityLabel }: DomainCardProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    return (
        <YStack
            accessibilityLabel={accessibilityLabel}
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            {children}
        </YStack>
    );
});
