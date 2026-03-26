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

    return (
        <Button
            height={layout.compactControlHeight}
            px={layout.isTablet ? "$3.5" : "$3"}
            rounded={ds.radii.full}
            borderWidth={1}
            borderColor={isSelected ? ds.colors.primary : ds.colors.border}
            bg={isSelected ? ds.colors.primarySoft : ds.colors.surface}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            onPress={onPress}
        >
            <Text
                color={isSelected ? ds.colors.primary : ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={
                    layout.isTablet
                        ? ds.typography.labelLg.fontSize
                        : ds.typography.labelMd.fontSize
                }
            >
                {label}
            </Text>
        </Button>
    );
}
