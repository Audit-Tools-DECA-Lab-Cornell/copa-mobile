import type { ReactNode } from "react";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

export interface ScreenHeaderProps {
    /** Localized screen title (G1). */
    readonly title: string;
    /** Muted supporting line under the title. */
    readonly subtitle?: string;
    /** Right-aligned header actions (notification bell, sign-out, chips). */
    readonly actions?: ReactNode;
    /**
     * Optional row rendered above the title block on narrow screens (e.g.
     * Home's auditor identity row on phones). On tablets prefer folding this
     * content into `actions` so the header stays a single row (G9).
     */
    readonly aboveTitle?: ReactNode;
}

/**
 * Shared in-content header for the five tab screens (G10): one title scale,
 * one subtitle treatment, one actions row - replacing five ad-hoc versions.
 */
export function ScreenHeader({ title, subtitle, actions, aboveTitle }: Readonly<ScreenHeaderProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    const titleTypography = layout.isTablet ? ds.typography.displayLg : ds.typography.displayMd;

    return (
        <YStack gap="$4">
            {aboveTitle}
            <XStack justify="space-between" items={subtitle === undefined ? "center" : "flex-end"} gap="$4">
                <YStack gap="$1.5" flex={1}>
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={titleTypography.fontSize}
                        lineHeight={titleTypography.lineHeight}
                        letterSpacing={-0.7}
                        accessibilityRole="header"
                    >
                        {title}
                    </Text>
                    {subtitle === undefined ? null : (
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyLg.fontSize}
                            lineHeight={ds.typography.bodyLg.lineHeight}
                            style={{ maxWidth: layout.readableMaxWidth }}
                        >
                            {subtitle}
                        </Paragraph>
                    )}
                </YStack>
                {actions === undefined ? null : (
                    <XStack gap="$2" items="center">
                        {actions}
                    </XStack>
                )}
            </XStack>
        </YStack>
    );
}
