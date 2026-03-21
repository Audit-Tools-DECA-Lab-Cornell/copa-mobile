import { Button, Text } from "tamagui";
import { useDesignSystem } from "lib/design-system";

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

    return (
        <Button
            height={36}
            px="$3"
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
                fontSize={ds.typography.labelMd.fontSize}
            >
                {label}
            </Text>
        </Button>
    );
}
