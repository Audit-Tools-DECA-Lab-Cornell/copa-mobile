import { Button, Text } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

interface FilterChipProps {
    readonly label: string;
    readonly isSelected: boolean;
    readonly onPress: () => void;
}

/**
 * Compact pill button used for list filters and sort controls.
 *
 * @param props Chip label, selected state, and press handler.
 * @returns Rounded filter chip.
 */
export function FilterChip({ label, isSelected, onPress }: Readonly<FilterChipProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const resolvedHeight = Math.max(layout.compactControlHeight, 44);

    return (
        <Button
            height={resolvedHeight}
            px={layout.isWideTablet ? "$4" : layout.isTablet ? "$3.5" : "$3"}
            py={layout.isTablet ? "$2" : "$1.5"}
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={isSelected ? ds.colors.primary : ds.colors.border}
            bg={isSelected ? ds.colors.primarySoft : ds.colors.surface}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
            onPress={onPress}
        >
            <Text
                color={isSelected ? ds.colors.primary : ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={
                    layout.isWideTablet
                        ? ds.typography.labelLg.fontSize
                        : layout.isTablet
                          ? ds.typography.labelMd.fontSize
                          : ds.typography.labelSm.fontSize
                }
                letterSpacing={layout.isTablet ? 0.3 : 0.2}
            >
                {label}
            </Text>
        </Button>
    );
}
