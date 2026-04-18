import { Fragment } from "react";
import { ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, ColorTokens, Paragraph, Text, XStack, YStack } from "tamagui";

import {
    getSectionQuestionTableColumnMetrics,
    type SectionQuestionTableColumnMetrics,
    type SectionQuestionTableScaleContent,
} from "components/playspace-audit/section-question-table-layout";
import { getScaleAccentColor, getScaleSoftColor, useDesignSystem } from "lib/design-system";
import { getActiveScaleKeysForQuestion } from "lib/audit/selectors";
import type { InstrumentQuestion, QuestionResponsePayload, QuestionScale, ScaleKey } from "lib/audit/types";
import { useResponsiveLayout } from "lib/responsive-layout";
import { formatQuestionKeyForDisplay, parsePromptSegments } from "lib/audit/prompt-segments";

interface QuestionTableRow {
    readonly question: InstrumentQuestion;
    readonly selectedAnswers: QuestionResponsePayload;
}

interface SectionQuestionTableProps {
    readonly rows: readonly QuestionTableRow[];
    readonly disabled: boolean;
    readonly onSelectAnswer: (questionKey: string, scaleKey: string, optionKey: string) => void;
}

const SCALE_COLUMN_ORDER: readonly ScaleKey[] = ["provision", "diversity", "challenge", "sociability"];

/**
 * Tablet-first section matrix that lays out prompts on the left and scale
 * selectors in columns to the right.
 */
export function SectionQuestionTable({ rows, disabled, onSelectAnswer }: Readonly<SectionQuestionTableProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");
    const visibleScaleKeys = getVisibleScaleKeys(rows);
    const scaleContentByKey = getScaleContentByKey(rows, visibleScaleKeys, (scaleKey) =>
        t(`section.table.scaleColumns.${scaleKey}`),
    );
    const columnMetrics = getSectionQuestionTableColumnMetrics({
        layout,
        scaleKeys: visibleScaleKeys,
        scaleContentByKey,
    });

    return (
        <YStack gap="$3">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                directionalLockEnabled
                bounces={false}
                style={{ width: "100%" }}
            >
                <YStack
                    width={columnMetrics.tableWidth}
                    rounded={ds.radii.sm}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    overflow="hidden"
                    bg={ds.colors.surface}
                >
                    <XStack bg={ds.colors.surfaceMuted} width={columnMetrics.tableWidth}>
                        <HeaderCell
                            width={columnMetrics.promptColumnWidth}
                            label={t("section.table.itemColumn")}
                            showTrailingBorder
                        />
                        {visibleScaleKeys.map((scaleKey, columnIndex) => (
                            <HeaderCell
                                key={scaleKey}
                                width={readScaleColumnWidth(columnMetrics, scaleKey)}
                                label={t(`section.table.scaleColumns.${scaleKey}`)}
                                showTrailingBorder={columnIndex < visibleScaleKeys.length - 1}
                                accentColor={getScaleAccentColor(scaleKey, ds.colors)}
                            />
                        ))}
                    </XStack>

                    {rows.map((row, rowIndex) => {
                        const activeScaleKeys = getActiveScaleKeysForQuestion(row.question, row.selectedAnswers);

                        return (
                            <XStack
                                key={row.question.question_key}
                                borderTopWidth={rowIndex === 0 ? 0 : 1}
                                borderColor={ds.colors.border}
                                bg={rowIndex % 2 === 0 ? ds.colors.surface : ds.colors.surfaceMuted}
                                items="stretch"
                            >
                                <QuestionPromptCell question={row.question} width={columnMetrics.promptColumnWidth} />
                                {visibleScaleKeys.map((scaleKey, columnIndex) => {
                                    const scale = row.question.scales.find(
                                        (currentScale) => currentScale.key === scaleKey,
                                    );
                                    const showTrailingBorder = columnIndex < visibleScaleKeys.length - 1;

                                    if (scale === undefined) {
                                        return (
                                            <EmptyScaleCell
                                                key={`${row.question.question_key}.${scaleKey}`}
                                                width={readScaleColumnWidth(columnMetrics, scaleKey)}
                                                text={t("section.table.notAvailable")}
                                                showTrailingBorder={showTrailingBorder}
                                            />
                                        );
                                    }

                                    if (scaleKey !== "provision" && !activeScaleKeys.includes(scaleKey)) {
                                        return (
                                            <EmptyScaleCell
                                                key={`${row.question.question_key}.${scaleKey}`}
                                                width={readScaleColumnWidth(columnMetrics, scaleKey)}
                                                text={t("section.table.followUpPending")}
                                                showTrailingBorder={showTrailingBorder}
                                            />
                                        );
                                    }

                                    return (
                                        <ScaleOptionCell
                                            key={`${row.question.question_key}.${scaleKey}`}
                                            questionKey={row.question.question_key}
                                            scale={scale}
                                            selectedOptionKey={
                                                typeof row.selectedAnswers[scale.key] === "string"
                                                    ? (row.selectedAnswers[scale.key] as string)
                                                    : undefined
                                            }
                                            width={readScaleColumnWidth(columnMetrics, scaleKey)}
                                            disabled={disabled}
                                            showTrailingBorder={showTrailingBorder}
                                            onSelectAnswer={onSelectAnswer}
                                        />
                                    );
                                })}
                            </XStack>
                        );
                    })}
                </YStack>
            </ScrollView>
        </YStack>
    );
}

interface HeaderCellProps {
    readonly width: number;
    readonly label: string;
    readonly showTrailingBorder: boolean;
    readonly accentColor?: string;
}

/**
 * Shared table header cell.
 */
function HeaderCell({ width, label, showTrailingBorder, accentColor }: Readonly<HeaderCellProps>) {
    const ds = useDesignSystem();

    return (
        <YStack
            width={width}
            px="$3"
            py="$2.5"
            borderRightWidth={showTrailingBorder ? 1 : 0}
            borderColor={ds.colors.border}
            justify="center"
        >
            <Text
                color={accentColor ? (accentColor as ColorTokens) : (ds.colors.mutedForeground as ColorTokens)}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.bodySm.fontSize}
                textTransform="uppercase"
                letterSpacing={1.1}
                style={{ textAlign: "center" }}
            >
                {label}
            </Text>
        </YStack>
    );
}

interface QuestionPromptCellProps {
    readonly question: InstrumentQuestion;
    readonly width: number;
}

/**
 * Left-most prompt cell for one table row.
 */
function QuestionPromptCell({ question, width }: Readonly<QuestionPromptCellProps>) {
    const ds = useDesignSystem();
    const { t } = useTranslation("audit");
    const promptSegments = parsePromptSegments(question.prompt);

    return (
        <YStack
            width={width}
            px="$3.5"
            py="$3.5"
            gap="$1.5"
            borderRightWidth={1}
            borderColor={ds.colors.border}
            justify="center"
        >
            <Text
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.bodySm.fontSize}
                textTransform="uppercase"
                letterSpacing={1.1}
            >
                {formatQuestionKeyForDisplay(question.question_key)}
            </Text>
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyMd.fontSize}
                lineHeight={ds.typography.bodyMd.lineHeight}
            >
                <Text
                    color={ds.colors.secondaryForeground}
                    fontFamily={ds.fonts.bodySemiBold}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {`${t("thisPlayspace")}\n`}
                </Text>
                {promptSegments.map((segment, index) => (
                    <Fragment key={`${question.question_key}-${index.toString()}`}>
                        <Text
                            color={segment.bold ? ds.colors.primary : ds.colors.foreground}
                            fontFamily={segment.bold ? ds.fonts.bodyBold : ds.fonts.bodyRegular}
                            fontSize={ds.typography.bodyMd.fontSize}
                            style={{ fontWeight: segment.bold ? "800" : "400" }}
                        >
                            {segment.text}
                        </Text>
                    </Fragment>
                ))}
            </Text>
        </YStack>
    );
}

interface ScaleOptionCellProps {
    readonly questionKey: string;
    readonly scale: QuestionScale;
    readonly selectedOptionKey: string | undefined;
    readonly width: number;
    readonly disabled: boolean;
    readonly showTrailingBorder: boolean;
    readonly onSelectAnswer: (questionKey: string, scaleKey: string, optionKey: string) => void;
}

/**
 * One active scale cell with vertically stacked options.
 */
function ScaleOptionCell({
    questionKey,
    scale,
    selectedOptionKey,
    width,
    disabled,
    showTrailingBorder,
    onSelectAnswer,
}: Readonly<ScaleOptionCellProps>) {
    const ds = useDesignSystem();
    const scaleAccent = getScaleAccentColor(scale.key, ds.colors);
    const scaleSoft = getScaleSoftColor(scale.key, ds.colors);

    return (
        <YStack
            width={width}
            px="$2.5"
            py="$3"
            gap="$2"
            borderRightWidth={showTrailingBorder ? 1 : 0}
            borderColor={ds.colors.border}
            justify="center"
        >
            {scale.options.map((option) => {
                const isSelected = selectedOptionKey === option.key;

                return (
                    <Button
                        key={`${questionKey}.${scale.key}.${option.key}`}
                        width="100%"
                        height="auto"
                        rounded={ds.radii.md}
                        disabled={disabled}
                        borderWidth={isSelected ? 2 : 1}
                        borderColor={isSelected ? (scaleAccent as ColorTokens) : (ds.colors.border as ColorTokens)}
                        bg={isSelected ? (scaleSoft as ColorTokens) : (ds.colors.input as ColorTokens)}
                        opacity={disabled ? 0.6 : 1}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={() => {
                            if (disabled) {
                                return;
                            }
                            onSelectAnswer(questionKey, scale.key, option.key);
                        }}
                    >
                        <XStack px="$2.5" py="$2" gap="$2" items="center">
                            <YStack
                                width={16}
                                height={16}
                                rounded={ds.radii.sm}
                                borderWidth={2}
                                borderColor={
                                    isSelected ? (scaleAccent as ColorTokens) : (ds.colors.border as ColorTokens)
                                }
                                items="center"
                                justify="center"
                            >
                                {isSelected ? (
                                    <YStack
                                        width={6}
                                        height={6}
                                        rounded={ds.radii.sm}
                                        bg={scaleAccent as ColorTokens}
                                    />
                                ) : null}
                            </YStack>
                            <Text
                                flex={1}
                                color={
                                    isSelected ? (scaleAccent as ColorTokens) : (ds.colors.foreground as ColorTokens)
                                }
                                fontFamily={isSelected ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                lineHeight={ds.typography.bodySm.lineHeight}
                            >
                                {option.label}
                            </Text>
                        </XStack>
                    </Button>
                );
            })}
        </YStack>
    );
}

interface EmptyScaleCellProps {
    readonly width: number;
    readonly text: string;
    readonly showTrailingBorder: boolean;
}

/**
 * Placeholder cell for scales that are unavailable or still gated.
 */
function EmptyScaleCell({ width, text, showTrailingBorder }: Readonly<EmptyScaleCellProps>) {
    const ds = useDesignSystem();

    return (
        <YStack
            width={width}
            px="$3"
            py="$3"
            borderRightWidth={showTrailingBorder ? 1 : 0}
            borderColor={ds.colors.border}
            justify="center"
        >
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodySm.fontSize}
                lineHeight={ds.typography.bodySm.lineHeight}
            >
                {text}
            </Paragraph>
        </YStack>
    );
}

/**
 * Resolve the ordered scale columns that should appear for this section.
 */
function getVisibleScaleKeys(rows: readonly QuestionTableRow[]): ScaleKey[] {
    return SCALE_COLUMN_ORDER.filter((scaleKey) => {
        return rows.some((row) => row.question.scales.some((scale) => scale.key === scaleKey));
    });
}

/**
 * Gather the longest option label for each visible scale so the scroll-first
 * layout can grant extra width only where the copy actually needs it.
 */
function getScaleContentByKey(
    rows: readonly QuestionTableRow[],
    scaleKeys: readonly ScaleKey[],
    getScaleHeaderLabel: (scaleKey: ScaleKey) => string,
): Partial<Record<ScaleKey, SectionQuestionTableScaleContent>> {
    const scaleContentByKey: Partial<Record<ScaleKey, SectionQuestionTableScaleContent>> = {};

    for (const scaleKey of scaleKeys) {
        let maxOptionLabelLength = 0;
        for (const row of rows) {
            const matchingScale = row.question.scales.find((scale) => scale.key === scaleKey);
            if (matchingScale === undefined) {
                continue;
            }

            for (const option of matchingScale.options) {
                maxOptionLabelLength = Math.max(maxOptionLabelLength, option.label.trim().length);
            }
        }

        scaleContentByKey[scaleKey] = {
            headerLabel: getScaleHeaderLabel(scaleKey),
            maxOptionLabelLength,
        };
    }

    return scaleContentByKey;
}

/**
 * Read a resolved width for one visible scale column, falling back to an even
 * split if a width is unexpectedly missing.
 */
function readScaleColumnWidth(columnMetrics: Readonly<SectionQuestionTableColumnMetrics>, scaleKey: ScaleKey): number {
    const resolvedWidth = columnMetrics.scaleColumnWidths[scaleKey];
    if (typeof resolvedWidth === "number") {
        return resolvedWidth;
    }

    const visibleScaleCount = Object.keys(columnMetrics.scaleColumnWidths).length;
    return visibleScaleCount === 0
        ? 0
        : Math.floor((columnMetrics.tableWidth - columnMetrics.promptColumnWidth) / visibleScaleCount);
}
