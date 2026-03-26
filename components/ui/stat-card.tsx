import { Paragraph, Text, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

interface StatCardProps {
    readonly label: string;
    readonly value: string;
    readonly accentColor: string;
    readonly helperText?: string;
}

/**
 * Compact metric card used on analytics and detail screens.
 *
 * @param props Card label, metric value, accent color, and optional helper text.
 * @returns Styled metric card surface.
 */
export function StatCard({ label, value, accentColor, helperText }: Readonly<StatCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    return (
        <YStack
            flex={1}
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            px={layout.cardPadding}
            py={layout.isTablet ? 18 : 12}
            gap={layout.isTablet ? 8 : 4}
            style={{
                minHeight: layout.statCardMinHeight,
                boxShadow: ds.shadows.card,
            }}
        >
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={
                    layout.isTablet
                        ? ds.typography.labelLg.fontSize
                        : ds.typography.labelMd.fontSize
                }
                textTransform="uppercase"
                letterSpacing={layout.isTablet ? 0.9 : 0.7}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={ds.fonts.headingBold}
                fontSize={
                    layout.isTablet
                        ? ds.typography.metricSm.fontSize
                        : ds.typography.metricXs.fontSize
                }
                lineHeight={
                    layout.isTablet
                        ? ds.typography.metricSm.lineHeight
                        : ds.typography.metricXs.lineHeight
                }
                style={{ color: accentColor, flexShrink: 1 }}
            >
                {value}
            </Text>
            {helperText === undefined ? null : (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={
                        layout.isTablet
                            ? ds.typography.bodySm.fontSize
                            : ds.typography.bodyXs.fontSize
                    }
                    lineHeight={
                        layout.isTablet
                            ? ds.typography.bodySm.lineHeight
                            : ds.typography.bodyXs.lineHeight
                    }
                >
                    {helperText}
                </Paragraph>
            )}
        </YStack>
    );
}
