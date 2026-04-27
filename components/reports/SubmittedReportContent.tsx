import { memo, useCallback, useMemo, useState } from "react";
import { Pressable } from "react-native";
import { ChevronDown, ChevronUp, List } from "@tamagui/lucide-icons-2";
import { Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { DomainReportRow } from "lib/audit/report-helpers";
import type { AuditScoreTotals } from "lib/audit/types";
import { useDesignSystem } from "lib/design-system";
import { BestWorstTable } from "components/reports/BestWorstTable";
import { DomainCard } from "components/reports/DomainCard";
import { DomainItemsTable } from "components/reports/DomainItemsTable";
import { DomainScoreDisplay } from "components/reports/DomainScoreDisplay";
import { DomainSectionHeader, ExpandCollapseControl } from "components/reports/DomainSectionHeader";
import { useDomainExpansion } from "components/reports/use-domain-expansion";

export interface SubmittedReportContentProps {
    readonly domainRows: DomainReportRow[];
    readonly overallScores: AuditScoreTotals | null;
    readonly overallItemCount: number;
}

/**
 * Submitted-audit report: domain breakdown with optional item tables behind a per-domain toggle (web parity).
 */
export const SubmittedReportContent = memo(function SubmittedReportContent({
    domainRows,
    overallScores,
    overallItemCount,
}: SubmittedReportContentProps) {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");
    const [itemsOpenByDomain, setItemsOpenByDomain] = useState<Record<string, boolean>>({});

    const expansionKeys = useMemo(() => [...domainRows.map((row) => row.domainKey), "__overall__"], [domainRows]);

    const {
        expandAll,
        collapseAll: collapseDomains,
        toggle,
        isExpanded,
        allExpanded,
    } = useDomainExpansion(expansionKeys);

    const collapseAll = useCallback(() => {
        collapseDomains();
        setItemsOpenByDomain({});
    }, [collapseDomains]);

    const toggleDomainItems = useCallback((domainKey: string) => {
        setItemsOpenByDomain((previous) => ({
            ...previous,
            [domainKey]: previous[domainKey] !== true,
        }));
    }, []);

    return (
        <YStack gap="$4" width="100%">
            {domainRows.length > 0 ? (
                <ExpandCollapseControl onExpandAll={expandAll} onCollapseAll={collapseAll} allExpanded={allExpanded} />
            ) : null}

            {domainRows.map((row, index) => {
                const open = isExpanded(row.domainKey);
                const itemsOpen = itemsOpenByDomain[row.domainKey] === true;
                const hasQuestions = row.questions.length > 0;

                return (
                    <YStack key={row.domainKey} gap="$3" width="100%">
                        <DomainCard accessibilityLabel={row.domainTitle}>
                            <DomainSectionHeader
                                title={row.domainTitle}
                                isExpanded={open}
                                onToggle={() => {
                                    toggle(row.domainKey);
                                }}
                                scoreTotals={row.scoreTotals}
                            />
                            {open ? (
                                <YStack gap="$3" width="100%">
                                    <DomainScoreDisplay scoreTotals={row.scoreTotals} itemCount={row.itemCount} />
                                    <AuditorNotes notes={row.sectionNotes} domainKey={row.domainKey} />

                                    {hasQuestions ? (
                                        <YStack gap="$2" width="100%">
                                            <Pressable
                                                accessibilityRole="button"
                                                accessibilityState={{ expanded: itemsOpen }}
                                                onPress={() => {
                                                    toggleDomainItems(row.domainKey);
                                                }}
                                            >
                                                {({ pressed }) => (
                                                    <XStack
                                                        items="center"
                                                        gap="$2"
                                                        py="$1"
                                                        self="flex-start"
                                                        opacity={pressed ? 0.85 : 1}
                                                    >
                                                        <List size={16} color={ds.colors.mutedForeground} />
                                                        <Text
                                                            color={ds.colors.mutedForeground}
                                                            fontFamily={ds.fonts.bodyBold}
                                                            fontSize={ds.typography.bodySm.fontSize}
                                                        >
                                                            {itemsOpen
                                                                ? t("domain.hideItems", { ns: "reports" })
                                                                : t("domain.showItems", {
                                                                      ns: "reports",
                                                                      count: row.questions.length,
                                                                  })}
                                                        </Text>
                                                        {itemsOpen ? (
                                                            <ChevronUp size={16} color={ds.colors.mutedForeground} />
                                                        ) : (
                                                            <ChevronDown size={16} color={ds.colors.mutedForeground} />
                                                        )}
                                                    </XStack>
                                                )}
                                            </Pressable>
                                            {itemsOpen ? <DomainItemsTable questions={row.questions} /> : null}
                                        </YStack>
                                    ) : null}
                                </YStack>
                            ) : null}
                        </DomainCard>
                        {index < domainRows.length - 1 ? <Separator borderColor={ds.colors.border} /> : null}
                    </YStack>
                );
            })}

            <DomainCard accessibilityLabel={t("domain.overallScoresTitle")}>
                <DomainSectionHeader
                    title={t("domain.overallScoresTitle")}
                    isExpanded={isExpanded("__overall__")}
                    onToggle={() => {
                        toggle("__overall__");
                    }}
                    scoreTotals={overallScores}
                />
                {isExpanded("__overall__") ? (
                    <DomainScoreDisplay scoreTotals={overallScores} itemCount={overallItemCount} />
                ) : null}
            </DomainCard>

            <BestWorstTable domainRows={domainRows} />
        </YStack>
    );
});

interface AuditorNotesProps {
    readonly notes: string[];
    readonly domainKey: string;
}

const AuditorNotes = memo(function AuditorNotes({ notes, domainKey }: AuditorNotesProps) {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");

    if (notes.length === 0) {
        return (
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
                    style={{ fontStyle: "italic" }}
                >
                    {t("domain.noNotesPlaceholder")}
                </Paragraph>
            </YStack>
        );
    }

    return (
        <>
            {notes.map((note, noteIndex) => (
                <YStack key={`${domainKey}-note-${noteIndex.toString()}`} gap="$1">
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
            ))}
        </>
    );
});
