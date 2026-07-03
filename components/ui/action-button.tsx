import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { ActivityIndicator } from "react-native";
import { Button, Text, XStack } from "tamagui";

import { Download } from "@tamagui/lucide-icons-2";

interface ActionButtonProps {
    readonly label: string;
    readonly variant?: "default" | "primary";
    readonly onPress?: () => void;
    readonly disabled?: boolean;
    readonly isLoading?: boolean;
}

/**
 * Shared action button used for export controls on report screens.
 *
 * @param props Button label, visual variant, and loading state.
 * @returns Styled action button.
 */
export function ActionButton({
    label,
    variant = "default",
    onPress,
    disabled = false,
    isLoading = false,
}: Readonly<ActionButtonProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const isPrimary = variant === "primary";

    return (
        <Button
            flex={1}
            height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
            px={layout.isTablet ? "$4" : "$3"}
            rounded={ds.radii.md}
            borderWidth={isPrimary ? 0 : 1}
            borderColor={ds.colors.border}
            bg={isPrimary ? ds.colors.primary : ds.colors.input}
            disabled={disabled || isLoading}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            opacity={disabled || isLoading ? 0.6 : 1}
            onPress={onPress}
        >
            <XStack items="center" gap="$2">
                {isLoading ? (
                    <ActivityIndicator color={isPrimary ? ds.colors.primaryForeground : ds.colors.foreground} />
                ) : (
                    <Download
                        size={layout.isTablet ? 18 : 16}
                        color={isPrimary ? ds.colors.primaryForeground : ds.colors.foreground}
                    />
                )}
                <Text
                    color={isPrimary ? ds.colors.primaryForeground : ds.colors.foreground}
                    fontFamily={ds.fonts.bodySemiBold}
                    fontSize={layout.isTablet ? ds.typography.bodyMd.fontSize : ds.typography.bodySm.fontSize}
                    lineHeight={layout.isTablet ? ds.typography.bodyMd.lineHeight : ds.typography.bodySm.lineHeight}
                    numberOfLines={1}
                >
                    {label}
                </Text>
            </XStack>
        </Button>
    );
}
