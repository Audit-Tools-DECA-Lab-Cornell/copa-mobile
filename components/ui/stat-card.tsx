import { Paragraph, Text, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";

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

    return (
        <YStack
            flex={1}
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            px="$4"
            py="$3"
            gap="$1"
            style={{ boxShadow: ds.shadows.card }}
        >
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelMd.fontSize}
                textTransform="uppercase"
                letterSpacing={0.7}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={ds.fonts.headingBold}
                fontSize={ds.typography.metricXs.fontSize}
                style={{ color: accentColor }}
            >
                {value}
            </Text>
            {helperText === undefined ? null : (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyXs.fontSize}
                >
                    {helperText}
                </Paragraph>
            )}
        </YStack>
    );
}
