import { memo } from "react";
import { ScrollView } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { useTranslation } from "react-i18next";
import type { DomainQuestionRow } from "lib/audit/report-helpers";
import { formatQuestionKeyForDisplay } from "lib/audit/prompt-segments";
import { formatScoreValue } from "lib/audit/score-helpers";
import { useDesignSystem } from "lib/design-system";
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

function scaleCell(label: string | null, notAssessed: string): string {
    return label === null || label.trim().length === 0 ? notAssessed : label;
}

const ID_COL_WIDTH = 84;
const ITEM_COL_WIDTH = 440;
const SCALE_COL_WIDTH = 120;
const PVU_COL_WIDTH = 140;

/**
 * Per-question breakdown for extended report view.
 */
export const DomainItemsTable = memo(function DomainItemsTable({ questions }: DomainItemsTableProps) {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");
    const notAssessed = t("detail.metricNotAssessed", { ns: "reports" });
    const translatePv = {
        notApplicable: () => t("extendedTable.notApplicable"),
        scoreAchieved: (scoreText: string) => t("extendedTable.scoreAchieved", { score: scoreText }),
        maxScore: (maxText: string) => t("extendedTable.maxScore", { max: maxText }),
    };

    if (questions.length === 0) {
        return null;
    }

    const minTableWidth = ID_COL_WIDTH + ITEM_COL_WIDTH + SCALE_COL_WIDTH * 4 + PVU_COL_WIDTH * 2;
    const cellFont = ds.typography.bodyXs.fontSize;
    const cellLine = ds.typography.bodyXs.lineHeight;

    const DataText = ({
        children,
        textAlign = "center",
    }: Readonly<{
        children: string;
        textAlign?: "center" | "left" | "right";
    }>) => (
        <Text color={ds.colors.foreground} fontSize={cellFont} lineHeight={cellLine} width="100%" style={{ textAlign }}>
            {children}
        </Text>
    );

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator>
            <YStack
                style={{
                    minWidth: minTableWidth,
                    borderWidth: 1,
                    borderColor: ds.colors.border,
                    borderRadius: ds.radii.sm,
                }}
                overflow="hidden"
            >
                <XStack bg={ds.colors.primary} borderBottomWidth={1} borderColor={ds.colors.border}>
                    <YStack
                        width={ID_COL_WIDTH}
                        p="$2"
                        items="center"
                        justify="center"
                        borderRightWidth={1}
                        borderColor={ds.colors.border}
                    >
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyXs.fontSize}
                            style={{ textAlign: "center" }}
                        >
                            {t("extendedTable.columnQuestionId", { ns: "reports" })}
                        </Text>
                    </YStack>
                    <YStack
                        width={ITEM_COL_WIDTH}
                        p="$2"
                        items="center"
                        justify="center"
                        borderLeftWidth={1}
                        borderColor={ds.colors.border}
                    >
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyXs.fontSize}
                            width="100%"
                            style={{ textAlign: "center" }}
                        >
                            {t("extendedTable.columnItems", { ns: "reports" })}
                        </Text>
                    </YStack>
                    <YStack
                        width={SCALE_COL_WIDTH}
                        p="$2"
                        items="center"
                        justify="center"
                        borderLeftWidth={1}
                        borderColor={ds.colors.border}
                    >
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyXs.fontSize}
                            width="100%"
                            style={{ textAlign: "center" }}
                        >
                            {t("extendedTable.columnProvision", { ns: "reports" })}
                        </Text>
                    </YStack>
                    <YStack
                        width={SCALE_COL_WIDTH}
                        p="$2"
                        items="center"
                        justify="center"
                        borderLeftWidth={1}
                        borderColor={ds.colors.border}
                    >
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyXs.fontSize}
                            width="100%"
                            style={{ textAlign: "center" }}
                        >
                            {t("extendedTable.columnDiversity", { ns: "reports" })}
                        </Text>
                    </YStack>
                    <YStack
                        width={SCALE_COL_WIDTH}
                        p="$2"
                        items="center"
                        justify="center"
                        borderLeftWidth={1}
                        borderColor={ds.colors.border}
                    >
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyXs.fontSize}
                            width="100%"
                            style={{ textAlign: "center" }}
                        >
                            {t("extendedTable.columnChallenge", { ns: "reports" })}
                        </Text>
                    </YStack>
                    <YStack
                        width={SCALE_COL_WIDTH}
                        p="$2"
                        items="center"
                        justify="center"
                        borderLeftWidth={1}
                        borderColor={ds.colors.border}
                    >
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyXs.fontSize}
                            width="100%"
                            style={{ textAlign: "center" }}
                        >
                            {t("extendedTable.columnSociability", { ns: "reports" })}
                        </Text>
                    </YStack>
                    <YStack
                        width={PVU_COL_WIDTH}
                        p="$2"
                        items="center"
                        justify="center"
                        borderLeftWidth={1}
                        borderColor={ds.colors.border}
                    >
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyXs.fontSize}
                            width="100%"
                            style={{ textAlign: "center" }}
                        >
                            {t("extendedTable.columnPlayValue", { ns: "reports" })}
                        </Text>
                    </YStack>
                    <YStack
                        width={PVU_COL_WIDTH}
                        p="$2"
                        items="center"
                        justify="center"
                        borderLeftWidth={1}
                        borderColor={ds.colors.border}
                    >
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyXs.fontSize}
                            width="100%"
                            style={{ textAlign: "center" }}
                        >
                            {t("extendedTable.columnUsability", { ns: "reports" })}
                        </Text>
                    </YStack>
                </XStack>
                {questions.map((question, index) => {
                    const rowBg = index % 2 === 0 ? ds.colors.input : ds.colors.surface;
                    return (
                        <XStack
                            key={question.questionKey}
                            bg={rowBg}
                            borderTopWidth={1}
                            borderColor={ds.colors.border}
                            accessibilityRole="none"
                        >
                            <YStack
                                width={ID_COL_WIDTH}
                                p="$2"
                                items="center"
                                justify="center"
                                borderRightWidth={1}
                                borderColor={ds.colors.border}
                                bg={rowBg}
                            >
                                <Text
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.monoMedium}
                                    fontSize={ds.typography.bodyXs.fontSize}
                                    style={{ textAlign: "center" }}
                                >
                                    {formatQuestionKeyForDisplay(question.questionKey)}
                                </Text>
                            </YStack>
                            <YStack
                                width={ITEM_COL_WIDTH}
                                p="$2"
                                justify="center"
                                items="flex-start"
                                borderLeftWidth={1}
                                borderColor={ds.colors.border}
                                bg={rowBg}
                            >
                                <PromptRichText raw={question.questionText} fontSize={cellFont} lineHeight={cellLine} />
                            </YStack>
                            <YStack
                                width={SCALE_COL_WIDTH}
                                p="$2"
                                items="center"
                                justify="center"
                                borderLeftWidth={1}
                                borderColor={ds.colors.border}
                                bg={rowBg}
                            >
                                <DataText>{scaleCell(question.provisionLabel, notAssessed)}</DataText>
                            </YStack>
                            <YStack
                                width={SCALE_COL_WIDTH}
                                p="$2"
                                items="center"
                                justify="center"
                                borderLeftWidth={1}
                                borderColor={ds.colors.border}
                                bg={rowBg}
                            >
                                <DataText>{scaleCell(question.diversityLabel, notAssessed)}</DataText>
                            </YStack>
                            <YStack
                                width={SCALE_COL_WIDTH}
                                p="$2"
                                items="center"
                                justify="center"
                                borderLeftWidth={1}
                                borderColor={ds.colors.border}
                                bg={rowBg}
                            >
                                <DataText>
                                    {question.challengeApplicable
                                        ? scaleCell(question.challengeLabel, notAssessed)
                                        : t("extendedTable.notApplicable")}
                                </DataText>
                            </YStack>
                            <YStack
                                width={SCALE_COL_WIDTH}
                                p="$2"
                                items="center"
                                justify="center"
                                borderLeftWidth={1}
                                borderColor={ds.colors.border}
                                bg={rowBg}
                            >
                                <DataText>{scaleCell(question.sociabilityLabel, notAssessed)}</DataText>
                            </YStack>
                            <YStack
                                width={PVU_COL_WIDTH}
                                p="$2"
                                items="flex-start"
                                justify="center"
                                borderLeftWidth={1}
                                borderColor={ds.colors.border}
                                bg={rowBg}
                            >
                                <DataText textAlign="left">
                                    {formatPlayUsabilityCell(
                                        question.playValueScore,
                                        question.playValueMax,
                                        translatePv,
                                    )}
                                </DataText>
                            </YStack>
                            <YStack
                                width={PVU_COL_WIDTH}
                                p="$2"
                                items="flex-start"
                                justify="center"
                                borderLeftWidth={1}
                                borderColor={ds.colors.border}
                                bg={rowBg}
                            >
                                <DataText textAlign="left">
                                    {formatPlayUsabilityCell(
                                        question.usabilityScore,
                                        question.usabilityMax,
                                        translatePv,
                                    )}
                                </DataText>
                            </YStack>
                        </XStack>
                    );
                })}
            </YStack>
        </ScrollView>
    );
});
