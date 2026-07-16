import { useMemo, useState } from "react";
import { Info } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Sheet, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";

/**
 * In-context legend for the score abbreviations (PV/U/Q/V/C/S) used across
 * report cards and tables (7.1/G6: no jargon without a key). An info button
 * opens a bottom sheet mapping each abbreviation to its localized full name,
 * reusing the same translation keys as the report tables so the terminology
 * can never drift.
 */
export function ScoreLegendInfo() {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");
    const [isOpen, setIsOpen] = useState(false);

    const legendRows = useMemo(
        () => [
            { short: t("playValueShort"), full: t("extendedTable.columnPlayValue") },
            { short: t("usabilityShort"), full: t("extendedTable.columnUsability") },
            { short: t("provisionShort"), full: t("extendedTable.columnProvision") },
            { short: t("varietyShort"), full: t("extendedTable.columnVariety") },
            { short: t("challengeShort"), full: t("extendedTable.columnChallenge") },
            { short: t("sociabilityShort"), full: t("extendedTable.columnSociability") },
        ],
        [t],
    );

    return (
        <>
            <Button
                chromeless
                circular
                p="$1.5"
                accessibilityLabel={t("legend.open")}
                onPress={() => {
                    setIsOpen(true);
                }}
            >
                <Info size={18} color={ds.colors.mutedForeground} />
            </Button>
            <Sheet
                modal
                open={isOpen}
                onOpenChange={setIsOpen}
                snapPoints={[45]}
                snapPointsMode="percent"
                dismissOnSnapToBottom
            >
                <Sheet.Overlay opacity={0.5} />
                <Sheet.Frame bg={ds.colors.surface} p="$4" gap="$3">
                    <Sheet.Handle bg={ds.colors.border} />
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.titleMd.fontSize}
                        lineHeight={ds.typography.titleMd.lineHeight}
                    >
                        {t("legend.title")}
                    </Text>
                    <YStack gap="$2.5">
                        {legendRows.map((row) => (
                            <XStack key={row.short} items="center" gap="$3">
                                <YStack
                                    width={44}
                                    rounded={ds.radii.sm}
                                    bg={ds.colors.mutedSurface}
                                    px="$1.5"
                                    py="$1"
                                    items="center"
                                >
                                    <Text
                                        color={ds.colors.foreground}
                                        fontFamily={ds.fonts.monoBold}
                                        fontSize={ds.typography.bodySm.fontSize}
                                    >
                                        {row.short}
                                    </Text>
                                </YStack>
                                <Paragraph
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.bodyLg.fontSize}
                                    flex={1}
                                >
                                    {row.full}
                                </Paragraph>
                            </XStack>
                        ))}
                    </YStack>
                </Sheet.Frame>
            </Sheet>
        </>
    );
}
