import { useState, type ReactNode } from "react";
import { Pressable } from "react-native";
import { ChevronDown } from "@tamagui/lucide-icons";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

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
    const layout = useResponsiveLayout();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap={layout.isTablet ? "$4.5" : "$3"}
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
                            fontSize={
                                layout.isWideTablet
                                    ? ds.typography.titleLg.fontSize
                                    : layout.isTablet
                                      ? ds.typography.titleLg.fontSize
                                      : ds.typography.titleMd.fontSize
                            }
                            lineHeight={
                                layout.isWideTablet
                                    ? ds.typography.titleLg.lineHeight
                                    : layout.isTablet
                                      ? ds.typography.titleLg.lineHeight
                                      : ds.typography.titleMd.lineHeight
                            }
                        >
                            {title}
                        </Text>
                        {subtitle === undefined ? null : (
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={
                                    layout.isWideTablet
                                        ? ds.typography.bodyLg.fontSize
                                        : layout.isTablet
                                          ? ds.typography.bodyMd.fontSize
                                          : ds.typography.bodySm.fontSize
                                }
                                lineHeight={
                                    layout.isWideTablet
                                        ? ds.typography.bodyLg.lineHeight
                                        : layout.isTablet
                                          ? ds.typography.bodyMd.lineHeight
                                          : ds.typography.bodySm.lineHeight
                                }
                            >
                                {subtitle}
                            </Paragraph>
                        )}
                    </YStack>
                    <ChevronDown
                        size={layout.isTablet ? 20 : 18}
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
