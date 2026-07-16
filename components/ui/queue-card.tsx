import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { isGlassUiEnabled, useDesignSystem, type DesignTone } from "lib/design-system";
import { getCardTextLineLimit } from "lib/responsive";
import { useResponsiveLayout } from "lib/responsive-layout";

export interface QueueCardShellProps {
    /** Status tone driving the left accent bar. */
    readonly tone: DesignTone;
    readonly onPress?: (() => void) | undefined;
    readonly children: ReactNode;
}

/**
 * Shared pressable card frame for queue lists (Places, Reports, Execute):
 * one border/surface/shadow treatment, one left status-accent bar, one
 * press effect (G10). Height is content-driven - no min-height voids (G5);
 * grid rows equalize via their stretch containers.
 */
export function QueueCardShell({ tone, onPress, children }: Readonly<QueueCardShellProps>) {
    const ds = useDesignSystem();
    const isGlassEnabled = isGlassUiEnabled();
    const layout = useResponsiveLayout();

    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => ({
                opacity: pressed ? 0.96 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
                flex: 1,
                height: "100%",
            })}
        >
            <YStack
                flex={1}
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
                bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
                overflow="hidden"
                style={{ boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card }}
            >
                <XStack flex={1}>
                    <YStack width={4} style={{ backgroundColor: tone.accent }} />
                    <YStack flex={1} p={layout.cardPadding} gap="$4">
                        {children}
                    </YStack>
                </XStack>
            </YStack>
        </Pressable>
    );
}

export interface QueueCardHeaderProps {
    readonly title: string;
    readonly subtitle: string;
    readonly statusLabel: string;
    readonly tone: DesignTone;
    /** Optional block rendered under the status pill (e.g. a score). */
    readonly trailing?: ReactNode;
}

/**
 * Shared queue-card header: status pill sits on its own row at the top (with
 * an optional trailing block, e.g. a score, aligned to the right), and the
 * title + subtitle span the full card width below. Stacking the status above
 * the name - rather than beside it - lets long place and project names breathe
 * across the whole card (G5/G10), matching the dashboard's active-work card.
 */
export function QueueCardHeader({ title, subtitle, statusLabel, tone, trailing }: Readonly<QueueCardHeaderProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    return (
        <YStack gap="$3">
            <XStack items="center" justify="space-between" gap="$3">
                <YStack
                    accessible={true}
                    accessibilityLabel={statusLabel}
                    self="flex-start"
                    rounded={ds.radii.full}
                    px="$2.5"
                    py="$1"
                    style={{ backgroundColor: tone.surface }}
                >
                    <Text
                        accessibilityElementsHidden={true}
                        importantForAccessibility="no"
                        style={{ color: tone.text }}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={0.5}
                    >
                        {statusLabel}
                    </Text>
                </YStack>
                {trailing}
            </XStack>
            <YStack gap="$1" style={{ minWidth: 0 }}>
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={layout.isTablet ? ds.typography.titleLg.fontSize : ds.typography.titleMd.fontSize}
                    lineHeight={layout.isTablet ? ds.typography.titleLg.lineHeight : ds.typography.titleMd.lineHeight}
                    numberOfLines={getCardTextLineLimit("title")}
                >
                    {title}
                </Text>
                <Paragraph
                    color={ds.colors.secondaryForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                    lineHeight={ds.typography.bodySm.lineHeight}
                    numberOfLines={getCardTextLineLimit("supporting")}
                >
                    {subtitle}
                </Paragraph>
            </YStack>
        </YStack>
    );
}

export interface QueueCardMetaRowProps {
    readonly icon?: ReactNode;
    readonly text: string;
}

/**
 * Shared muted single-line meta row (locality, last activity, ...).
 */
export function QueueCardMetaRow({ icon, text }: Readonly<QueueCardMetaRowProps>) {
    const ds = useDesignSystem();

    return (
        <XStack items="center" gap="$2">
            {icon}
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodySm.fontSize}
                numberOfLines={1}
                flex={1}
            >
                {text}
            </Paragraph>
        </XStack>
    );
}
