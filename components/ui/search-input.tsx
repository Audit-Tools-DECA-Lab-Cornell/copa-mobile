import { Search } from "@tamagui/lucide-icons";
import { Input, XStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";

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

    return (
        <XStack
            items="center"
            gap="$3"
            px="$4"
            height={52}
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.input}
        >
            <Search size={16} color={ds.colors.mutedForeground} />
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
                fontSize={ds.typography.bodyMd.fontSize}
            />
        </XStack>
    );
}
