import { useState, type ReactNode } from "react";
import { Pressable } from "react-native";
import { ChevronDown } from "@tamagui/lucide-icons";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";

interface CollapsibleCardProps {
    readonly title: string;
    readonly subtitle?: string;
    readonly icon?: ReactNode;
    readonly defaultExpanded?: boolean;
    readonly children: ReactNode;
}

/**
 * Reusable card that reveals secondary content on demand.
 *
 * @param props Card heading, optional subtitle, and collapsible content.
 * @returns Expandable card surface.
 */
export function CollapsibleCard({
    title,
    subtitle,
    icon,
    defaultExpanded = false,
    children,
}: Readonly<CollapsibleCardProps>) {
    const ds = useDesignSystem();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p="$4"
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            <Pressable
                onPress={() => {
                    setIsExpanded((currentValue) => !currentValue);
                }}
            >
                <XStack items="center" gap="$3">
                    {icon}
                    <YStack flex={1} gap="$1">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.titleMd.fontSize}
                        >
                            {title}
                        </Text>
                        {subtitle === undefined ? null : (
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                            >
                                {subtitle}
                            </Paragraph>
                        )}
                    </YStack>
                    <ChevronDown
                        size={18}
                        color={ds.colors.mutedForeground}
                        style={{
                            transform: isExpanded ? [{ rotate: "180deg" }] : [{ rotate: "0deg" }],
                        }}
                    />
                </XStack>
            </Pressable>
            {isExpanded ? children : null}
        </YStack>
    );
}
