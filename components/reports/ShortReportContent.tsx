import { memo, useMemo } from "react";
import { Paragraph, Separator, Text, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { DomainReportRow } from "lib/audit/report-helpers";
import type { AuditScoreTotals } from "lib/audit/types";
import { useDesignSystem } from "lib/design-system";
import { BestWorstTable } from "components/reports/BestWorstTable";
import { DomainCard } from "components/reports/DomainCard";
import { DomainScoreDisplay } from "components/reports/DomainScoreDisplay";
import { DomainSectionHeader, ExpandCollapseControl } from "components/reports/DomainSectionHeader";
import { useDomainExpansion } from "components/reports/use-domain-expansion";

export interface ShortReportContentProps {
    readonly domainRows: DomainReportRow[];
    readonly overallScores: AuditScoreTotals | null;
    /** Distinct scaled questions with at least one domain (avoids double-counting). */
    readonly overallItemCount: number;
}

/**
 * Short report: per-domain bars + tables (no item-level breakdown), overall scores, best/worst summary.
 */
export const ShortReportContent = memo(function ShortReportContent({
    domainRows,
    overallScores,
    overallItemCount,
}: ShortReportContentProps) {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");

    const expansionKeys = useMemo(() => [...domainRows.map((row) => row.domainKey), "__overall__"], [domainRows]);
    const { expandAll, collapseAll, toggle, isExpanded, allExpanded } = useDomainExpansion(expansionKeys);

    return (
        <YStack gap="$4" width="100%">
            {domainRows.length > 0 ? (
                <ExpandCollapseControl onExpandAll={expandAll} onCollapseAll={collapseAll} allExpanded={allExpanded} />
            ) : null}

            {domainRows.map((row, index) => {
                const open = isExpanded(row.domainKey);
                return (
                    <YStack key={row.domainKey} gap="$3" width="100%">
                        <DomainCard accessibilityLabel={row.domainTitle}>
                            <DomainSectionHeader
                                title={row.domainTitle}
                                isExpanded={open}
                                onToggle={() => toggle(row.domainKey)}
                                scoreTotals={row.scoreTotals}
                            />
                            {open ? (
                                <YStack gap="$3" width="100%">
                                    <DomainScoreDisplay scoreTotals={row.scoreTotals} itemCount={row.itemCount} />
                                    <AuditorNotes notes={row.sectionNotes} domainKey={row.domainKey} />
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
                    onToggle={() => toggle("__overall__")}
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
                <YStack key={`${domainKey}-note-${noteIndex}`} gap="$1">
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
