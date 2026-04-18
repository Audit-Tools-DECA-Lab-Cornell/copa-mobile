import { memo, useMemo } from "react";
import { Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { DomainReportRow } from "lib/audit/report-helpers";
import { buildConstructRankings, formatConstructDomainLine } from "lib/audit/report-helpers";
import { formatPercentage } from "lib/audit/score-helpers";
import { useDesignSystem } from "lib/design-system";

export interface BestWorstTableProps {
    readonly domainRows: DomainReportRow[];
}

type ConstructKey = "provision" | "diversity" | "challenge" | "sociability" | "play_value" | "usability";

const CONSTRUCT_ROWS: readonly (readonly [ConstructKey, ConstructKey])[] = [
    ["provision", "diversity"],
    ["challenge", "sociability"],
    ["play_value", "usability"],
];

const CONSTRUCT_LABEL_KEYS: Record<ConstructKey, string> = {
    provision: "bestWorst.constructProvision",
    diversity: "bestWorst.constructDiversity",
    challenge: "bestWorst.constructChallenge",
    sociability: "bestWorst.constructSociability",
    play_value: "bestWorst.constructPlayValue",
    usability: "bestWorst.constructUsability",
};

/**
 * Best and worst domain per construct for the short report footer.
 */
export const BestWorstTable = memo(function BestWorstTable({ domainRows }: BestWorstTableProps) {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");

    const rankings = useMemo(() => buildConstructRankings(domainRows), [domainRows]);
    const rankingByKey = useMemo(() => {
        return new Map(rankings.map((r) => [r.constructKey, r] as const));
    }, [rankings]);

    if (domainRows.length < 2) {
        return (
            <YStack gap="$2" width="100%">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                >
                    {t("domain.bestWorstTitle")}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {t("bestWorst.insufficientData")}
                </Paragraph>
            </YStack>
        );
    }

    return (
        <YStack gap="$3" width="100%">
            <Text color={ds.colors.foreground} fontFamily={ds.fonts.bodyBold} fontSize={ds.typography.titleMd.fontSize}>
                {t("domain.bestWorstTitle")}
            </Text>
            <YStack gap="$2">
                {CONSTRUCT_ROWS.map((pair, rowIndex) => (
                    <XStack key={`construct-row-${rowIndex}`} gap="$2" flexWrap="wrap">
                        {pair.map((constructKey) => {
                            const ranking = rankingByKey.get(constructKey);
                            const best = ranking?.bestDomain ?? null;
                            const worst = ranking?.worstDomain ?? null;
                            const labelKey = CONSTRUCT_LABEL_KEYS[constructKey];
                            return (
                                <YStack
                                    key={constructKey}
                                    flex={1}
                                    overflow="hidden"
                                    style={{
                                        minWidth: 140,
                                        borderWidth: 1,
                                        borderColor: ds.colors.border,
                                        borderRadius: ds.radii.sm,
                                    }}
                                >
                                    <YStack bg={ds.colors.primary} p="$2">
                                        <Text
                                            color={ds.colors.primaryForeground}
                                            fontFamily={ds.fonts.bodyBold}
                                            fontSize={ds.typography.bodyXs.fontSize}
                                            style={{ textAlign: "center" }}
                                        >
                                            {t(labelKey)}
                                        </Text>
                                    </YStack>
                                    <YStack bg={ds.colors.input} p="$2" gap="$2">
                                        <YStack gap="$1">
                                            <Text
                                                color={ds.colors.mutedForeground}
                                                fontFamily={ds.fonts.bodyBold}
                                                fontSize={ds.typography.bodyXs.fontSize}
                                            >
                                                {t("bestWorst.bestScored")}
                                            </Text>
                                            {best === null ? (
                                                <Text
                                                    color={ds.colors.foreground}
                                                    fontSize={ds.typography.bodyXs.fontSize}
                                                >
                                                    —
                                                </Text>
                                            ) : (
                                                <YStack gap="$0.5">
                                                    <Text
                                                        color={ds.colors.foreground}
                                                        fontFamily={ds.fonts.bodyMedium}
                                                        fontSize={ds.typography.bodyXs.fontSize}
                                                    >
                                                        {best.domainTitle}
                                                    </Text>
                                                    <Text
                                                        color={ds.colors.mutedForeground}
                                                        fontSize={ds.typography.bodyXs.fontSize}
                                                    >
                                                        {formatConstructDomainLine(best.score, best.max)} ·{" "}
                                                        {formatPercentage(best.score, best.max)}
                                                    </Text>
                                                </YStack>
                                            )}
                                        </YStack>
                                        <Separator borderColor={ds.colors.border} />
                                        <YStack gap="$1">
                                            <Text
                                                color={ds.colors.mutedForeground}
                                                fontFamily={ds.fonts.bodyBold}
                                                fontSize={ds.typography.bodyXs.fontSize}
                                            >
                                                {t("bestWorst.worstScored")}
                                            </Text>
                                            {worst === null ? (
                                                <Text
                                                    color={ds.colors.foreground}
                                                    fontSize={ds.typography.bodyXs.fontSize}
                                                >
                                                    —
                                                </Text>
                                            ) : (
                                                <YStack gap="$0.5">
                                                    <Text
                                                        color={ds.colors.foreground}
                                                        fontFamily={ds.fonts.bodyMedium}
                                                        fontSize={ds.typography.bodyXs.fontSize}
                                                    >
                                                        {worst.domainTitle}
                                                    </Text>
                                                    <Text
                                                        color={ds.colors.mutedForeground}
                                                        fontSize={ds.typography.bodyXs.fontSize}
                                                    >
                                                        {formatConstructDomainLine(worst.score, worst.max)} ·{" "}
                                                        {formatPercentage(worst.score, worst.max)}
                                                    </Text>
                                                </YStack>
                                            )}
                                        </YStack>
                                    </YStack>
                                </YStack>
                            );
                        })}
                    </XStack>
                ))}
            </YStack>
        </YStack>
    );
});
