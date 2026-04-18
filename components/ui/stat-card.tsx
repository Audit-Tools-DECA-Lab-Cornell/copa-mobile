import { isGlassUiEnabled, useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { Paragraph, Text, YStack } from "tamagui";

interface StatCardProps {
    readonly label: string;
    readonly value: string;
    readonly accentColor: string;
    readonly helperText?: string | undefined;
    readonly minHeight?: number;
    readonly dense?: boolean;
}

/**
 * Compact metric card used on analytics and detail screens.
 *
 * @param props Card label, metric value, accent color, and optional helper text.
 * @returns Styled metric card surface.
 */
export function StatCard({ label, value, accentColor, helperText, minHeight, dense = false }: Readonly<StatCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const isGlassEnabled = isGlassUiEnabled();
    const resolvedMinHeight = minHeight ?? (layout.isTablet ? layout.summaryCardMinHeight : 0);
    const tabletLabelFontSize = dense ? ds.typography.labelMd.fontSize : ds.typography.labelLg.fontSize;
    const tabletLabelLineHeight = dense ? ds.typography.labelMd.lineHeight : ds.typography.labelLg.lineHeight;
    const tabletMetricFontSize = dense ? ds.typography.metricXs.fontSize : ds.typography.metricSm.fontSize;
    const tabletMetricLineHeight = dense ? ds.typography.metricXs.lineHeight : ds.typography.metricSm.lineHeight;
    const tabletBodyFontSize = dense ? ds.typography.bodyXs.fontSize : ds.typography.bodySm.fontSize;
    const tabletBodyLineHeight = dense ? ds.typography.bodyXs.lineHeight : ds.typography.bodySm.lineHeight;

    return (
        <YStack
            flex={1}
            justify="space-between"
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
            bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
            px={layout.cardPadding}
            py={layout.isTablet ? (dense ? 14 : 20) : 12}
            gap={layout.isTablet ? (dense ? 8 : 12) : 4}
            style={{
                minHeight: resolvedMinHeight,
                boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card,
            }}
        >
            <YStack gap={layout.isTablet ? (dense ? "$1.5" : "$2.5") : "$1"}>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={layout.isTablet ? tabletLabelFontSize : ds.typography.labelMd.fontSize}
                    lineHeight={layout.isTablet ? tabletLabelLineHeight : ds.typography.labelMd.lineHeight}
                    textTransform="uppercase"
                    letterSpacing={layout.isTablet ? (dense ? 0.8 : 1.05) : 0.7}
                >
                    {label}
                </Paragraph>
                <Text
                    fontFamily={ds.fonts.headingBold}
                    fontSize={layout.isTablet ? tabletMetricFontSize : ds.typography.metricXs.fontSize}
                    lineHeight={layout.isTablet ? tabletMetricLineHeight : ds.typography.metricXs.lineHeight}
                    style={{ color: accentColor, flexShrink: 1 }}
                >
                    {value}
                </Text>
            </YStack>
            {helperText === undefined ? null : (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={layout.isTablet ? tabletBodyFontSize : ds.typography.bodyXs.fontSize}
                    lineHeight={layout.isTablet ? tabletBodyLineHeight : ds.typography.bodyXs.lineHeight}
                >
                    {helperText}
                </Paragraph>
            )}
        </YStack>
    );
}
