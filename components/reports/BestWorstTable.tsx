import { memo, useMemo } from "react";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { DomainReportRow } from "lib/audit/report-helpers";
import { buildConstructRankings, formatConstructDomainLine } from "lib/audit/report-helpers";
import { formatPercentage } from "lib/audit/score-helpers";
import { getScaleAccentColor, useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";

export interface BestWorstTableProps {
    readonly domainRows: DomainReportRow[];
}

type ConstructKey = "provision" | "diversity" | "challenge" | "sociability" | "play_value" | "usability";

// Phone: 2 per row (3 rows). Tablet: 3 per row (2 rows).
const PHONE_CONSTRUCT_ROWS: readonly (readonly [ConstructKey, ConstructKey])[] = [
    ["provision", "diversity"],
    ["challenge", "sociability"],
    ["play_value", "usability"],
];

const TABLET_CONSTRUCT_ROWS: readonly (readonly [ConstructKey, ConstructKey, ConstructKey])[] = [
    ["provision", "diversity", "challenge"],
    ["sociability", "play_value", "usability"],
];

const CONSTRUCT_LABEL_KEYS: Record<ConstructKey, string> = {
    provision: "bestWorst.constructProvision",
    diversity: "bestWorst.constructDiversity",
    challenge: "bestWorst.constructChallenge",
    sociability: "bestWorst.constructSociability",
    play_value: "bestWorst.constructPlayValue",
    usability: "bestWorst.constructUsability",
};

function getConstructAccentColor(key: ConstructKey, ds: ReturnType<typeof useDesignSystem>): string {
    if (key === "play_value") return ds.colors.warning;
    if (key === "usability") return ds.colors.primary;
    return getScaleAccentColor(key as Parameters<typeof getScaleAccentColor>[0], ds.colors);
}

interface ConstructCellProps {
    readonly constructKey: ConstructKey;
    readonly label: string;
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly best: { domainTitle: string; score: number; max: number } | null;
    readonly worst: { domainTitle: string; score: number; max: number } | null;
}

function ConstructCell({ constructKey, label, ds, best, worst }: ConstructCellProps) {
    const { t } = useTranslation("reports");
    const accentColor = getConstructAccentColor(constructKey, ds);

    return (
        <YStack
            flex={1}
            overflow="hidden"
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            style={{ minWidth: 130 }}
        >
            {/* Header */}
            <YStack px="$2.5" py="$1.5" style={{ backgroundColor: accentColor }}>
                <Text
                    color={ds.colors.primaryForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.bodyXs.fontSize}
                    style={{ textAlign: "center" }}
                    numberOfLines={1}
                >
                    {label}
                </Text>
            </YStack>

            {/* Best scored */}
            <YStack
                px="$2.5"
                pt="$2"
                pb="$1.5"
                gap="$0.5"
                borderBottomWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.successSoft}
            >
                <XStack items="center" gap="$1" mb="$0.5">
                    <YStack width={6} height={6} rounded={9999} style={{ backgroundColor: ds.colors.success }} />
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyXs.fontSize}
                    >
                        {t("bestWorst.bestScored")}
                    </Text>
                </XStack>
                {best === null ? (
                    <Text color={ds.colors.mutedForeground} fontSize={ds.typography.bodyXs.fontSize}>
                        —
                    </Text>
                ) : (
                    <>
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyXs.fontSize}
                            numberOfLines={2}
                        >
                            {best.domainTitle}
                        </Text>
                        <Text color={ds.colors.mutedForeground} fontSize={ds.typography.bodyXs.fontSize}>
                            {formatConstructDomainLine(best.score, best.max)} · {formatPercentage(best.score, best.max)}
                        </Text>
                    </>
                )}
            </YStack>

            {/* Worst scored */}
            <YStack px="$2.5" pt="$2" pb="$2" gap="$0.5" bg={ds.colors.dangerSoft}>
                <XStack items="center" gap="$1">
                    <YStack width={6} height={6} rounded={9999} style={{ backgroundColor: ds.colors.danger }} />
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyXs.fontSize}
                    >
                        {t("bestWorst.worstScored")}
                    </Text>
                </XStack>
                {worst === null ? (
                    <Text color={ds.colors.mutedForeground} fontSize={ds.typography.bodyXs.fontSize}>
                        —
                    </Text>
                ) : (
                    <>
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyXs.fontSize}
                            numberOfLines={2}
                        >
                            {worst.domainTitle}
                        </Text>
                        <Text color={ds.colors.mutedForeground} fontSize={ds.typography.bodyXs.fontSize}>
                            {formatConstructDomainLine(worst.score, worst.max)} ·{" "}
                            {formatPercentage(worst.score, worst.max)}
                        </Text>
                    </>
                )}
            </YStack>
        </YStack>
    );
}

/**
 * Best and worst domain per construct.
 *
 * Phone: 2-column grid (3 rows).
 * Tablet: 3-column grid (2 rows).
 */
export const BestWorstTable = memo(function BestWorstTable({ domainRows }: BestWorstTableProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("reports");

    const rankings = useMemo(() => buildConstructRankings(domainRows), [domainRows]);
    const rankingByKey = useMemo(() => new Map(rankings.map((r) => [r.constructKey, r] as const)), [rankings]);

    return (
        <YStack gap="$3" width="100%">
            <XStack items="center" gap="$2">
                <YStack width={3} height={18} rounded={2} style={{ backgroundColor: ds.colors.primary }} />
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                >
                    {t("domain.bestWorstTitle")}
                </Text>
            </XStack>

            {domainRows.length < 2 ? (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {t("bestWorst.insufficientData")}
                </Paragraph>
            ) : layout.isTablet ? (
                <YStack gap="$2">
                    {TABLET_CONSTRUCT_ROWS.map((row, rowIndex) => (
                        <XStack key={`row-${rowIndex}`} gap="$2">
                            {row.map((constructKey) => {
                                const ranking = rankingByKey.get(constructKey);
                                return (
                                    <ConstructCell
                                        key={constructKey}
                                        constructKey={constructKey}
                                        label={t(CONSTRUCT_LABEL_KEYS[constructKey])}
                                        ds={ds}
                                        best={ranking?.bestDomain ?? null}
                                        worst={ranking?.worstDomain ?? null}
                                    />
                                );
                            })}
                        </XStack>
                    ))}
                </YStack>
            ) : (
                <YStack gap="$2">
                    {PHONE_CONSTRUCT_ROWS.map((row, rowIndex) => (
                        <XStack key={`row-${rowIndex}`} gap="$2">
                            {row.map((constructKey) => {
                                const ranking = rankingByKey.get(constructKey);
                                return (
                                    <ConstructCell
                                        key={constructKey}
                                        constructKey={constructKey}
                                        label={t(CONSTRUCT_LABEL_KEYS[constructKey])}
                                        ds={ds}
                                        best={ranking?.bestDomain ?? null}
                                        worst={ranking?.worstDomain ?? null}
                                    />
                                );
                            })}
                        </XStack>
                    ))}
                </YStack>
            )}
        </YStack>
    );
});
