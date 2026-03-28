import { Search } from "@tamagui/lucide-icons";
import { Input, XStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

interface SearchInputProps {
    readonly value: string;
    readonly onChangeText: (nextValue: string) => void;
    readonly placeholder: string;
}

/**
 * Shared search field used by the high-density list screens.
 *
 * @param props Search field value and placeholder props.
 * @returns Styled search input row.
 */
export function SearchInput({ value, onChangeText, placeholder }: Readonly<SearchInputProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    return (
        <XStack
            items="center"
            gap="$3"
            px={layout.isWideTablet ? "$4.5" : "$4"}
            height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.input}
        >
            <Search size={layout.isTablet ? 18 : 16} color={ds.colors.mutedForeground} />
            <Input
                unstyled
                flex={1}
                value={value}
                onChangeText={onChangeText}
                autoCorrect={false}
                returnKeyType="search"
                placeholder={placeholder}
                placeholderTextColor="$placeholderColor"
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={
                    layout.isWideTablet
                        ? ds.typography.titleSm.fontSize
                        : layout.isTablet
                          ? ds.typography.bodyLg.fontSize
                          : ds.typography.bodyMd.fontSize
                }
            />
        </XStack>
    );
}
