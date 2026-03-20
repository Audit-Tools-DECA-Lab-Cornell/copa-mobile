import { Fragment } from "react";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { designSystem } from "lib/design-system";
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
            rounded={designSystem.radii.lg}
            borderWidth={1}
            borderColor={designSystem.colors.border}
            bg={designSystem.colors.surface}
            p="$4"
            gap="$3.5"
            style={{
                boxShadow: designSystem.shadows.card,
            }}
        >
            <Text
                color={designSystem.colors.foreground}
                fontFamily={designSystem.fonts.bodyMedium}
                fontSize={designSystem.typography.titleSm.fontSize}
                lineHeight={designSystem.typography.titleSm.lineHeight}
            >
                <Text
                    color={designSystem.colors.secondaryForeground}
                    fontFamily={designSystem.fonts.bodySemiBold}
                    fontSize={designSystem.typography.bodyLg.fontSize}
                >
                    {"This playspace . . . \n"}
                </Text>
                {promptSegments.map((segment, index) => (
                    <Fragment key={`${question.question_key}-seg-${index.toString()}`}>
                        <Text
                            fontFamily={
                                segment.bold
                                    ? designSystem.fonts.bodyBold
                                    : designSystem.fonts.bodyRegular
                            }
                            fontSize={designSystem.typography.titleSm.fontSize}
                            color={
                                segment.bold
                                    ? designSystem.colors.primary
                                    : designSystem.colors.primaryForeground
                            }
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
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodyXs.fontSize}
                >
                    Diversity, Sociability, and Challenge appear only after a positive Quantity
                    answer.
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
    return (
        <YStack
            rounded={designSystem.radii.md}
            borderWidth={1}
            borderColor={designSystem.colors.border}
            bg={designSystem.colors.input}
            p="$3"
            gap="$2.5"
        >
            <YStack gap="$1">
                <Text
                    color={designSystem.colors.primary}
                    fontFamily={designSystem.fonts.bodyBold}
                    fontSize={designSystem.typography.titleSm.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.2}
                >
                    {scale.title}
                </Text>
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodySm.fontSize}
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
                            rounded={designSystem.radii.md}
                            height={42}
                            borderWidth={1}
                            borderColor={
                                isSelected
                                    ? designSystem.colors.primary
                                    : designSystem.colors.border
                            }
                            bg={
                                isSelected
                                    ? designSystem.colors.primarySoft
                                    : designSystem.colors.surfaceMuted
                            }
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={() => {
                                onSelectAnswer(questionKey, scale.key, option.key);
                            }}
                        >
                            <Text
                                color={
                                    isSelected
                                        ? designSystem.colors.primary
                                        : designSystem.colors.foreground
                                }
                                fontFamily={
                                    isSelected
                                        ? designSystem.fonts.bodyBold
                                        : designSystem.fonts.bodyMedium
                                }
                                fontSize={designSystem.typography.bodySm.fontSize}
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
