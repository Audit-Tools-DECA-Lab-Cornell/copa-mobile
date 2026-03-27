import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useResponsiveLayout } from "lib/responsive-layout";
import type { InstrumentQuestion, QuestionScale } from "lib/audit/types";

/**
 * One parsed segment of a prompt string with optional bold styling.
 */
interface PromptSegment {
    readonly text: string;
    readonly bold: boolean;
}

/**
 * Parse `**bold**` markers in a prompt string into renderable segments.
 *
 * @param raw Prompt string with optional `**bold**` markers.
 * @returns Ordered list of text segments with bold flags.
 */
function parsePromptSegments(raw: string): PromptSegment[] {
    const segments: PromptSegment[] = [];
    const parts = raw.split("**");
    for (let index = 0; index < parts.length; index++) {
        const part = parts[index] ?? "";
        if (part.length === 0) {
            continue;
        }
        segments.push({ text: part, bold: index % 2 === 1 });
    }
    return segments;
}

interface QuestionCardProps {
    readonly question: InstrumentQuestion;
    readonly selectedAnswers: Record<string, string>;
    readonly onSelectAnswer: (questionKey: string, scaleKey: string, optionKey: string) => void;
}

/**
 * Render one playspace question with vertically stacked scales and gated follow-ups.
 *
 * @param props Question rendering props.
 * @returns Styled audit question card.
 */
export function QuestionCard({
    question,
    selectedAnswers,
    onSelectAnswer,
}: Readonly<QuestionCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");
    const quantityScale = question.scales[0];
    const selectedQuantityKey =
        quantityScale !== undefined ? selectedAnswers[quantityScale.key] : undefined;
    const selectedQuantityOption = quantityScale?.options.find(
        (option) => option.key === selectedQuantityKey,
    );
    const showFollowUpScales = selectedQuantityOption?.allows_follow_up_scales === true;
    const promptSegments = parsePromptSegments(question.prompt);

    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap={layout.isTablet ? "$4.5" : "$3.5"}
            style={{
                boxShadow: ds.shadows.card,
            }}
        >
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={
                    layout.isWideTablet
                        ? ds.typography.titleLg.fontSize
                        : layout.isTablet
                          ? ds.typography.titleMd.fontSize
                          : ds.typography.titleSm.fontSize
                }
                lineHeight={
                    layout.isWideTablet
                        ? ds.typography.titleLg.lineHeight
                        : layout.isTablet
                          ? ds.typography.titleMd.lineHeight
                          : ds.typography.titleSm.lineHeight
                }
            >
                <Text
                    color={ds.colors.secondaryForeground}
                    fontFamily={ds.fonts.bodySemiBold}
                    fontSize={
                        layout.isWideTablet
                            ? ds.typography.bodyLg.fontSize
                            : layout.isTablet
                              ? ds.typography.titleSm.fontSize
                              : ds.typography.bodyLg.fontSize
                    }
                >
                    {`${t("thisPlayspace")}\n`}
                </Text>
                {promptSegments.map((segment, index) => (
                    <Fragment key={`${question.question_key}-seg-${index.toString()}`}>
                        <Text
                            fontFamily={segment.bold ? ds.fonts.bodyBold : ds.fonts.bodyRegular}
                            fontSize={
                                layout.isWideTablet
                                    ? ds.typography.titleLg.fontSize
                                    : layout.isTablet
                                      ? ds.typography.titleMd.fontSize
                                      : ds.typography.titleSm.fontSize
                            }
                            color={segment.bold ? ds.colors.primary : ds.colors.foreground}
                        >
                            {segment.text}
                        </Text>
                    </Fragment>
                ))}
            </Text>

            {question.scales.map((scale, scaleIndex) => {
                if (scaleIndex > 0 && !showFollowUpScales) {
                    return null;
                }

                return (
                    <ScaleSelector
                        key={`${question.question_key}.${scale.key}`}
                        questionKey={question.question_key}
                        scale={scale}
                        selectedOptionKey={selectedAnswers[scale.key]}
                        onSelectAnswer={onSelectAnswer}
                    />
                );
            })}

            {question.scales.length > 1 && !showFollowUpScales ? (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyXs.fontSize}
                >
                    {t("section.followUpHidden")}
                </Paragraph>
            ) : null}
        </YStack>
    );
}

interface ScaleSelectorProps {
    readonly questionKey: string;
    readonly scale: QuestionScale;
    readonly selectedOptionKey: string | undefined;
    readonly onSelectAnswer: (questionKey: string, scaleKey: string, optionKey: string) => void;
}

/**
 * Render one scale selector inside a playspace question card.
 *
 * @param props Scale selector props.
 * @returns Selector surface for one scale.
 */
function ScaleSelector({
    questionKey,
    scale,
    selectedOptionKey,
    onSelectAnswer,
}: Readonly<ScaleSelectorProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.input}
            p={layout.isTablet ? 16 : 12}
            gap={layout.isTablet ? "$3" : "$2.5"}
        >
            <YStack gap="$1">
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={
                        layout.isWideTablet
                            ? ds.typography.titleLg.fontSize
                            : layout.isTablet
                              ? ds.typography.titleMd.fontSize
                              : ds.typography.titleSm.fontSize
                    }
                    textTransform="uppercase"
                    letterSpacing={1.2}
                >
                    {scale.title}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={
                        layout.isWideTablet
                            ? ds.typography.bodyLg.fontSize
                            : layout.isTablet
                              ? ds.typography.bodyMd.fontSize
                              : ds.typography.bodySm.fontSize
                    }
                >
                    {scale.prompt}
                </Paragraph>
            </YStack>

            <XStack gap="$2" flexWrap="wrap" justify="space-between">
                {scale.options.map((option) => {
                    const isSelected = selectedOptionKey === option.key;

                    return (
                        <Button
                            key={`${scale.key}.${option.key}`}
                            width="48.5%"
                            rounded={ds.radii.md}
                            height={layout.isTablet ? layout.formOptionHeight : 42}
                            borderWidth={1}
                            borderColor={isSelected ? ds.colors.primary : ds.colors.border}
                            bg={isSelected ? ds.colors.primarySoft : ds.colors.surfaceMuted}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={() => {
                                onSelectAnswer(questionKey, scale.key, option.key);
                            }}
                        >
                            <Text
                                color={isSelected ? ds.colors.primary : ds.colors.foreground}
                                fontFamily={isSelected ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                                fontSize={
                                    layout.isWideTablet
                                        ? ds.typography.bodyLg.fontSize
                                        : layout.isTablet
                                          ? ds.typography.bodyMd.fontSize
                                          : ds.typography.bodySm.fontSize
                                }
                                numberOfLines={2}
                                style={{ textAlign: "center" }}
                            >
                                {option.label}
                            </Text>
                        </Button>
                    );
                })}
            </XStack>
        </YStack>
    );
}
