import { Fragment } from "react";
import { ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";

import { useDesignSystem } from "lib/design-system";
import { getActiveScaleKeysForQuestion } from "lib/audit/selectors";
import type {
    InstrumentQuestion,
    QuestionResponsePayload,
    QuestionScale,
    ScaleKey,
} from "lib/audit/types";
import { useResponsiveLayout } from "lib/responsive-layout";

interface PromptSegment {
    readonly text: string;
    readonly bold: boolean;
}

interface QuestionTableRow {
    readonly question: InstrumentQuestion;
    readonly selectedAnswers: QuestionResponsePayload;
}

interface SectionQuestionTableProps {
    readonly rows: readonly QuestionTableRow[];
    readonly disabled: boolean;
    readonly onSelectAnswer: (questionKey: string, scaleKey: string, optionKey: string) => void;
}

const SCALE_COLUMN_ORDER: readonly ScaleKey[] = [
    "quantity",
    "diversity",
    "challenge",
    "sociability",
];

/**
 * Tablet-first section matrix that lays out prompts on the left and scale
 * selectors in columns to the right.
 */
export function SectionQuestionTable({
    rows,
    disabled,
    onSelectAnswer,
}: Readonly<SectionQuestionTableProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");
    const visibleScaleKeys = getVisibleScaleKeys(rows);

    return (
        <YStack gap="$3">
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodySm.fontSize}
                lineHeight={ds.typography.bodySm.lineHeight}
            >
                {t("section.tableIntro")}
            </Paragraph>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <YStack
                    minW={Math.max(860, layout.windowWidth - layout.screenPaddingHorizontal * 2)}
                    rounded={ds.radii.lg}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    overflow="hidden"
                    bg={ds.colors.surface}
                >
                    <XStack bg={ds.colors.surfaceMuted}>
                        <HeaderCell
                            width={layout.isWideTablet ? 360 : 320}
                            label={t("section.table.itemColumn")}
                        />
                        {visibleScaleKeys.map((scaleKey) => (
                            <HeaderCell
                                key={scaleKey}
                                width={layout.isWideTablet ? 188 : 172}
                                label={t(`section.table.scaleColumns.${scaleKey}`)}
                            />
                        ))}
                    </XStack>

                    {rows.map((row, rowIndex) => {
                        const activeScaleKeys = getActiveScaleKeysForQuestion(
                            row.question,
                            row.selectedAnswers,
                        );

                        return (
                            <XStack
                                key={row.question.question_key}
                                borderTopWidth={rowIndex === 0 ? 0 : 1}
                                borderColor={ds.colors.border}
                                bg={rowIndex % 2 === 0 ? ds.colors.surface : ds.colors.surfaceMuted}
                                items="stretch"
                            >
                                <QuestionPromptCell question={row.question} />
                                {visibleScaleKeys.map((scaleKey) => {
                                    const scale = row.question.scales.find(
                                        (currentScale) => currentScale.key === scaleKey,
                                    );

                                    if (scale === undefined) {
                                        return (
                                            <EmptyScaleCell
                                                key={`${row.question.question_key}.${scaleKey}`}
                                                width={layout.isWideTablet ? 188 : 172}
                                                text={t("section.table.notAvailable")}
                                            />
                                        );
                                    }

                                    if (
                                        scaleKey !== "quantity" &&
                                        !activeScaleKeys.includes(scaleKey)
                                    ) {
                                        return (
                                            <EmptyScaleCell
                                                key={`${row.question.question_key}.${scaleKey}`}
                                                width={layout.isWideTablet ? 188 : 172}
                                                text={t("section.table.followUpPending")}
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
                                            width={layout.isWideTablet ? 188 : 172}
                                            disabled={disabled}
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
}

/**
 * Shared table header cell.
 */
function HeaderCell({ width, label }: Readonly<HeaderCellProps>) {
    const ds = useDesignSystem();

    return (
        <YStack
            width={width}
            px="$3"
            py="$2.5"
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
                style={{ textAlign: "center" }}
            >
                {label}
            </Text>
        </YStack>
    );
}

interface QuestionPromptCellProps {
    readonly question: InstrumentQuestion;
}

/**
 * Left-most prompt cell for one table row.
 */
function QuestionPromptCell({ question }: Readonly<QuestionPromptCellProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");
    const promptSegments = parsePromptSegments(question.prompt);

    return (
        <YStack
            width={layout.isWideTablet ? 360 : 320}
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
                {question.question_key}
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
    onSelectAnswer,
}: Readonly<ScaleOptionCellProps>) {
    const ds = useDesignSystem();

    return (
        <YStack
            width={width}
            px="$2.5"
            py="$3"
            gap="$2"
            borderRightWidth={1}
            borderColor={ds.colors.border}
            justify="center"
        >
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyXs.fontSize}
                lineHeight={ds.typography.bodyXs.lineHeight}
            >
                {scale.prompt}
            </Paragraph>
            {scale.options.map((option) => {
                const isSelected = selectedOptionKey === option.key;

                return (
                    <Button
                        key={`${questionKey}.${scale.key}.${option.key}`}
                        height="auto"
                        rounded={ds.radii.md}
                        disabled={disabled}
                        borderWidth={1}
                        borderColor={isSelected ? ds.colors.primary : ds.colors.border}
                        bg={isSelected ? ds.colors.primarySoft : ds.colors.input}
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
                                rounded={ds.radii.full}
                                borderWidth={2}
                                borderColor={isSelected ? ds.colors.primary : ds.colors.border}
                                items="center"
                                justify="center"
                            >
                                {isSelected ? (
                                    <YStack
                                        width={6}
                                        height={6}
                                        rounded={ds.radii.full}
                                        bg={ds.colors.primary}
                                    />
                                ) : null}
                            </YStack>
                            <Text
                                flex={1}
                                color={isSelected ? ds.colors.primary : ds.colors.foreground}
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
}

/**
 * Placeholder cell for scales that are unavailable or still gated.
 */
function EmptyScaleCell({ width, text }: Readonly<EmptyScaleCellProps>) {
    const ds = useDesignSystem();

    return (
        <YStack
            width={width}
            px="$3"
            py="$3"
            borderRightWidth={1}
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
 * Parse `**bold**` markers into prompt segments.
 */
function parsePromptSegments(raw: string): PromptSegment[] {
    const segments: PromptSegment[] = [];
    const parts = raw.split("**");

    for (let index = 0; index < parts.length; index += 1) {
        const part = parts[index] ?? "";
        if (part.length === 0) {
            continue;
        }

        segments.push({ text: part, bold: index % 2 === 1 });
    }

    return segments;
}

/**
 * Resolve the ordered scale columns that should appear for this section.
 */
function getVisibleScaleKeys(rows: readonly QuestionTableRow[]): ScaleKey[] {
    return SCALE_COLUMN_ORDER.filter((scaleKey) => {
        return rows.some((row) => row.question.scales.some((scale) => scale.key === scaleKey));
    });
}
