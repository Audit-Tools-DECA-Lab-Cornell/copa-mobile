import { memo, useMemo } from "react";
import { Pressable } from "react-native";
import { Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import { ChevronDown } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import type { DomainReportRow } from "lib/audit/report-helpers";
import type { AuditScoreTotals } from "lib/audit/types";
import { useDesignSystem } from "lib/design-system";
import { BestWorstTable } from "components/reports/BestWorstTable";
import { DomainCard } from "components/reports/DomainCard";
import { DomainItemsTable } from "components/reports/DomainItemsTable";
import { DomainScoreBars } from "components/reports/DomainScoreBars";
import { DomainScoreTable } from "components/reports/DomainScoreTable";
import { useDomainExpansion } from "components/reports/use-domain-expansion";

export interface ExtendedReportContentProps {
    readonly domainRows: DomainReportRow[];
    readonly overallScores: AuditScoreTotals | null;
    /** Distinct scaled questions with at least one domain (avoids double-counting multi-domain questions). */
    readonly overallItemCount: number;
}

/**
 * Extended report: same as short with per-question item tables per domain.
 */
export const ExtendedReportContent = memo(function ExtendedReportContent({
    domainRows,
    overallScores,
    overallItemCount,
}: ExtendedReportContentProps) {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");

    const expansionKeys = useMemo(() => [...domainRows.map((row) => row.domainKey), "__overall__"], [domainRows]);
    const { expandAll, collapseAll, toggle, isExpanded, allExpanded } = useDomainExpansion(expansionKeys);

    return (
        <YStack gap="$4" width="100%">
            {domainRows.length > 0 ? (
                <XStack justify="flex-end" items="center" gap="$4" flexWrap="wrap">
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("domain.expandAll")}
                        onPress={expandAll}
                    >
                        <Text
                            color={ds.colors.primary}
                            fontFamily={allExpanded ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                        >
                            {t("domain.expandAll")}
                        </Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("domain.collapseAll")}
                        onPress={collapseAll}
                    >
                        <Text
                            color={ds.colors.primary}
                            fontFamily={allExpanded ? ds.fonts.bodyMedium : ds.fonts.bodyBold}
                            fontSize={ds.typography.bodySm.fontSize}
                        >
                            {t("domain.collapseAll")}
                        </Text>
                    </Pressable>
                </XStack>
            ) : null}

            {domainRows.map((row) => {
                const open = isExpanded(row.domainKey);
                return (
                    <YStack key={row.domainKey} gap="$3" width="100%">
                        <DomainCard accessibilityLabel={row.domainTitle}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{ expanded: open }}
                                accessibilityLabel={`${row.domainTitle}. ${open ? t("domain.collapseSection") : t("domain.expandSection")}`}
                                onPress={() => {
                                    toggle(row.domainKey);
                                }}
                            >
                                <XStack justify="space-between" items="center" gap="$2" width="100%">
                                    <Text
                                        color={ds.colors.foreground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.titleMd.fontSize}
                                        numberOfLines={2}
                                        ellipsizeMode="tail"
                                        flex={1}
                                    >
                                        {row.domainTitle}
                                    </Text>
                                    <ChevronDown
                                        size={22}
                                        color={ds.colors.mutedForeground}
                                        style={{
                                            transform: [{ rotate: open ? "0deg" : "-90deg" }],
                                        }}
                                    />
                                </XStack>
                            </Pressable>
                            {open ? (
                                <YStack gap="$3" width="100%">
                                    <DomainScoreBars scoreTotals={row.scoreTotals} />
                                    <DomainScoreTable scoreTotals={row.scoreTotals} itemCount={row.itemCount} />
                                    {row.sectionNotes.length === 0 ? (
                                        <YStack gap="$1">
                                            <Text
                                                color={ds.colors.mutedForeground}
                                                fontFamily={ds.fonts.bodyBold}
                                                fontSize={ds.typography.bodySm.fontSize}
                                            >
                                                {t("domain.auditorNotesLabel")}
                                            </Text>
                                            <Paragraph
                                                color={ds.colors.mutedForeground}
                                                fontFamily={ds.fonts.bodyMedium}
                                                fontSize={ds.typography.bodySm.fontSize}
                                            >
                                                {t("domain.noNotesPlaceholder")}
                                            </Paragraph>
                                        </YStack>
                                    ) : (
                                        row.sectionNotes.map((note, noteIndex) => (
                                            <YStack key={`${row.domainKey}-note-${noteIndex}`} gap="$1">
                                                <Text
                                                    color={ds.colors.mutedForeground}
                                                    fontFamily={ds.fonts.bodyBold}
                                                    fontSize={ds.typography.bodySm.fontSize}
                                                >
                                                    {t("domain.auditorNotesLabel")}
                                                </Text>
                                                <Paragraph
                                                    color={ds.colors.foreground}
                                                    fontFamily={ds.fonts.bodyMedium}
                                                    fontSize={ds.typography.bodySm.fontSize}
                                                >
                                                    {note}
                                                </Paragraph>
                                            </YStack>
                                        ))
                                    )}
                                    <DomainItemsTable questions={row.questions} />
                                </YStack>
                            ) : null}
                        </DomainCard>
                        <Separator borderColor={ds.colors.border} />
                    </YStack>
                );
            })}

            <DomainCard accessibilityLabel={t("domain.overallScoresTitle")}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isExpanded("__overall__") }}
                    accessibilityLabel={`${t("domain.overallScoresTitle")}. ${isExpanded("__overall__") ? t("domain.collapseSection") : t("domain.expandSection")}`}
                    onPress={() => {
                        toggle("__overall__");
                    }}
                >
                    <XStack justify="space-between" items="center" gap="$2" width="100%">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.titleMd.fontSize}
                        >
                            {t("domain.overallScoresTitle")}
                        </Text>
                        <ChevronDown
                            size={22}
                            color={ds.colors.mutedForeground}
                            style={{
                                transform: [{ rotate: isExpanded("__overall__") ? "0deg" : "-90deg" }],
                            }}
                        />
                    </XStack>
                </Pressable>
                {isExpanded("__overall__") ? (
                    <YStack gap="$3" width="100%">
                        <DomainScoreBars scoreTotals={overallScores} />
                        <DomainScoreTable scoreTotals={overallScores} itemCount={overallItemCount} />
                    </YStack>
                ) : null}
            </DomainCard>

            <BestWorstTable domainRows={domainRows} />
        </YStack>
    );
});
