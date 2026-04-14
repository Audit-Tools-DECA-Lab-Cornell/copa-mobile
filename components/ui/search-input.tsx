import { Search } from "@tamagui/lucide-icons-2";
import { type ColorTokens, Input, XStack } from "tamagui";
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
            px={layout.isTablet ? "$4" : "$3"}
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
                placeholderTextColor={ds.colors.placeholderColor as ColorTokens}
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={
                    layout.isTablet ? ds.typography.bodyLg.fontSize : ds.typography.bodyMd.fontSize
                }
            />
        </XStack>
    );
}
