import { memo, useMemo, type ReactNode } from "react";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { DomainQuestionRow } from "lib/audit/report-helpers";
import { formatQuestionKeyForDisplay } from "lib/audit/prompt-segments";
import { formatScoreValue } from "lib/audit/score-helpers";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import { PromptRichText } from "components/reports/PromptRichText";

export interface DomainItemsTableProps {
    readonly questions: DomainQuestionRow[];
}

function formatPlayUsabilityCell(
    score: number | null,
    max: number | null,
    translate: {
        notApplicable: () => string;
        scoreAchieved: (scoreText: string) => string;
        maxScore: (maxText: string) => string;
    },
): string {
    const na = translate.notApplicable();
    if (score === null || max === null) {
        return `${translate.scoreAchieved(na)}\n${translate.maxScore(na)}`;
    }
    return `${translate.scoreAchieved(formatScoreValue(score))}\n${translate.maxScore(formatScoreValue(max))}`;
}

/** Column width constants scaled by viewport tier. */
interface ItemsTableLayout {
    readonly idColWidth: number;
    readonly itemColWidth: number;
    readonly scaleColWidth: number;
    readonly pvuColWidth: number;
    readonly minTableWidth: number;
}

function computeItemsTableLayout(isTablet: boolean, isWideTablet: boolean): ItemsTableLayout {
    const idColWidth = isTablet ? 92 : 80;
    const itemColWidth = isWideTablet ? 520 : isTablet ? 460 : 400;
    const scaleColWidth = isTablet ? 130 : 112;
    const pvuColWidth = isTablet ? 152 : 132;
    const minTableWidth = idColWidth + itemColWidth + scaleColWidth * 4 + pvuColWidth * 2;
    return { idColWidth, itemColWidth, scaleColWidth, pvuColWidth, minTableWidth };
}

/**
 * Per-question breakdown table for the extended report view.
 * Column widths adapt to the viewport tier.
 */
export const DomainItemsTable = memo(function DomainItemsTable({ questions }: DomainItemsTableProps) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("reports");

    const cols = useMemo(
        () => computeItemsTableLayout(layout.isTablet, layout.isWideTablet),
        [layout.isTablet, layout.isWideTablet],
    );

    const translatePv = {
        notApplicable: () => t("extendedTable.notApplicable"),
        scoreAchieved: (scoreText: string) => t("extendedTable.scoreAchieved", { score: scoreText }),
        maxScore: (maxText: string) => t("extendedTable.maxScore", { max: maxText }),
    };

    if (questions.length === 0) return null;

    const cellFont = ds.typography.bodyXs.fontSize;
    const cellLine = ds.typography.bodyXs.lineHeight;
    const mutedDashOpacity = 0.55;

    const HeaderCell = ({
        children,
        width,
        isFirst = false,
    }: {
        children: string;
        width: number;
        isFirst?: boolean;
    }) => (
        <YStack
            width={width}
            p="$2"
            items="center"
            justify="center"
            borderLeftWidth={isFirst ? 0 : 1}
            borderColor={ds.colors.primaryForeground}
        >
            <Text
                color={ds.colors.primaryForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={cellFont}
                width="100%"
                style={{ textAlign: "center" }}
            >
                {children}
            </Text>
        </YStack>
    );

    const DataText = ({
        children,
        textAlign = "center",
        mono = false,
        muted = false,
        opacity,
        bold = false,
    }: {
        children: ReactNode;
        textAlign?: "center" | "left";
        mono?: boolean;
        muted?: boolean;
        opacity?: number;
        bold?: boolean;
    }) => (
        <Text
            color={muted ? ds.colors.mutedForeground : ds.colors.foreground}
            fontFamily={mono ? ds.fonts.monoMedium : bold ? ds.fonts.bodyBold : undefined}
            fontSize={cellFont}
            lineHeight={cellLine}
            width="100%"
            opacity={opacity}
            style={{ textAlign }}
        >
            {children}
        </Text>
    );

    function renderScaleCellState(options: {
        label: string | null;
        applicable: boolean;
        isNotApplicable: boolean;
        isUnsure: boolean;
        followUpScalesAsked?: boolean;
    }): ReactNode {
        const { label, applicable, isNotApplicable, isUnsure, followUpScalesAsked = true } = options;
        if (!applicable || !followUpScalesAsked) {
            return (
                <DataText textAlign="center" muted opacity={mutedDashOpacity}>
                    -
                </DataText>
            );
        }
        if (isNotApplicable) {
            return (
                <DataText textAlign="center" bold>
                    {t("extendedTable.notApplicableFull", { ns: "reports" })}
                </DataText>
            );
        }
        if (isUnsure) {
            return (
                <DataText textAlign="center" bold>
                    {t("extendedTable.unsure", { ns: "reports" })}
                </DataText>
            );
        }
        return <DataText textAlign="center">{label ?? "-"}</DataText>;
    }

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator>
            <YStack
                style={{
                    minWidth: cols.minTableWidth,
                    borderWidth: 1,
                    borderColor: ds.colors.border,
                    borderRadius: ds.radii.sm,
                }}
                overflow="hidden"
            >
                {/* Header */}
                <XStack bg={ds.colors.primary} borderBottomWidth={1} borderColor={ds.colors.border}>
                    <HeaderCell width={cols.idColWidth} isFirst>
                        {t("extendedTable.columnQuestionId", { ns: "reports" })}
                    </HeaderCell>
                    <HeaderCell width={cols.itemColWidth}>
                        {t("extendedTable.columnItems", { ns: "reports" })}
                    </HeaderCell>
                    <HeaderCell width={cols.scaleColWidth}>
                        {t("extendedTable.columnProvision", { ns: "reports" })}
                    </HeaderCell>
                    <HeaderCell width={cols.scaleColWidth}>
                        {t("extendedTable.columnVariety", { ns: "reports" })}
                    </HeaderCell>
                    <HeaderCell width={cols.scaleColWidth}>
                        {t("extendedTable.columnChallenge", { ns: "reports" })}
                    </HeaderCell>
                    <HeaderCell width={cols.scaleColWidth}>
                        {t("extendedTable.columnSociability", { ns: "reports" })}
                    </HeaderCell>
                    <HeaderCell width={cols.pvuColWidth}>
                        {t("extendedTable.columnPlayValue", { ns: "reports" })}
                    </HeaderCell>
                    <HeaderCell width={cols.pvuColWidth}>
                        {t("extendedTable.columnUsability", { ns: "reports" })}
                    </HeaderCell>
                </XStack>

                {/* Data rows */}
                {questions.map((question, index) => {
                    const isEven = index % 2 === 0;
                    const rowBg = isEven ? ds.colors.input : ds.colors.surface;
                    const borderProps = {
                        borderTopWidth: 1,
                        borderColor: ds.colors.border,
                    } as const;

                    const CellWrapper = ({
                        children,
                        width,
                        align = "center",
                        first = false,
                    }: {
                        children: ReactNode;
                        width: number;
                        align?: "center" | "flex-start";
                        first?: boolean;
                    }) => (
                        <YStack
                            width={width}
                            p="$2"
                            items={align}
                            justify="center"
                            borderLeftWidth={first ? 0 : 1}
                            borderColor={ds.colors.border}
                            bg={rowBg}
                        >
                            {children}
                        </YStack>
                    );

                    return (
                        <XStack key={question.questionKey} {...borderProps} accessibilityRole="none">
                            {/* Question ID */}
                            <CellWrapper width={cols.idColWidth} first>
                                <DataText textAlign="center" mono muted>
                                    {formatQuestionKeyForDisplay(question.questionKey)}
                                </DataText>
                            </CellWrapper>

                            {/* Prompt text */}
                            <CellWrapper width={cols.itemColWidth} align="flex-start">
                                <YStack gap="$1.5" width="100%">
                                    <PromptRichText
                                        raw={question.questionText}
                                        fontSize={cellFont}
                                        lineHeight={cellLine}
                                    />
                                    {question.checklistAnswerLabel !== null ? (
                                        <YStack
                                            rounded={ds.radii.sm}
                                            borderWidth={1}
                                            borderColor={ds.colors.border}
                                            bg={ds.colors.mutedSurface}
                                            px="$2"
                                            py="$1"
                                        >
                                            <Text
                                                color={ds.colors.mutedForeground}
                                                fontFamily={ds.fonts.bodyMedium}
                                                fontSize={ds.typography.bodyXs.fontSize}
                                                lineHeight={ds.typography.bodyXs.lineHeight}
                                            >
                                                <Text color={ds.colors.foreground} fontFamily={ds.fonts.bodyBold}>
                                                    {t("extendedTable.selectedLabel", {
                                                        ns: "reports",
                                                        defaultValue: "Selected: ",
                                                    })}
                                                </Text>
                                                {question.checklistAnswerLabel}
                                            </Text>
                                        </YStack>
                                    ) : null}
                                </YStack>
                            </CellWrapper>

                            {/* Provision */}
                            <CellWrapper width={cols.scaleColWidth}>
                                {renderScaleCellState({
                                    label: question.provisionLabel,
                                    applicable: question.provisionApplicable,
                                    isNotApplicable: question.provisionIsNotApplicable,
                                    isUnsure: question.provisionIsUnsure,
                                })}
                            </CellWrapper>

                            {/* Variety */}
                            <CellWrapper width={cols.scaleColWidth}>
                                {renderScaleCellState({
                                    label: question.varietyLabel,
                                    applicable: question.varietyApplicable,
                                    isNotApplicable: question.varietyIsNotApplicable,
                                    isUnsure: question.varietyIsUnsure,
                                    followUpScalesAsked: question.followUpScalesAsked,
                                })}
                            </CellWrapper>

                            {/* Challenge */}
                            <CellWrapper width={cols.scaleColWidth}>
                                {renderScaleCellState({
                                    label: question.challengeLabel,
                                    applicable: question.challengeApplicable,
                                    isNotApplicable: question.challengeIsNotApplicable,
                                    isUnsure: question.challengeIsUnsure,
                                    followUpScalesAsked: question.followUpScalesAsked,
                                })}
                            </CellWrapper>

                            {/* Sociability */}
                            <CellWrapper width={cols.scaleColWidth}>
                                {renderScaleCellState({
                                    label: question.sociabilityLabel,
                                    applicable: question.sociabilityApplicable,
                                    isNotApplicable: question.sociabilityIsNotApplicable,
                                    isUnsure: question.sociabilityIsUnsure,
                                    followUpScalesAsked: question.followUpScalesAsked,
                                })}
                            </CellWrapper>

                            {/* Play value */}
                            <CellWrapper width={cols.pvuColWidth} align="flex-start">
                                <DataText textAlign="left">
                                    {formatPlayUsabilityCell(
                                        question.playValueScore,
                                        question.playValueMax,
                                        translatePv,
                                    )}
                                </DataText>
                            </CellWrapper>

                            {/* Usability */}
                            <CellWrapper width={cols.pvuColWidth} align="flex-start">
                                <DataText textAlign="left">
                                    {formatPlayUsabilityCell(
                                        question.usabilityScore,
                                        question.usabilityMax,
                                        translatePv,
                                    )}
                                </DataText>
                            </CellWrapper>
                        </XStack>
                    );
                })}
            </YStack>
        </ScrollView>
    );
});
