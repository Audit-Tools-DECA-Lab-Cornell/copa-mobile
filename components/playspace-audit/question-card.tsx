import { Fragment } from "react";
import { TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { getScaleAccentColor, getScaleSoftColor, useDesignSystem } from "lib/design-system";
import { getOptionGridItemWidth } from "lib/option-grid";
import { useResponsiveLayout } from "lib/responsive-layout";
import type { InstrumentQuestion, QuestionResponsePayload, QuestionScale } from "lib/audit/types";

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

/**
 * Convert raw instrument question keys into a human-readable audit label.
 */
function formatQuestionKey(questionKey: string): string {
    const match = /^q_(\d+)_(\d+)$/i.exec(questionKey);
    if (match === null) {
        return questionKey.replaceAll("_", " ").toUpperCase();
    }

    const [, sectionNumber, questionNumber] = match;
    return `Q ${sectionNumber}.${questionNumber}`;
}

interface QuestionCardProps {
    readonly question: InstrumentQuestion;
    readonly questionIndex: number;
    readonly totalQuestions: number;
    readonly selectedAnswers: QuestionResponsePayload;
    readonly disabled: boolean;
    readonly onChangeAnswers: (questionKey: string, nextAnswers: QuestionResponsePayload) => void;
}

/**
 * Render one playspace question with vertically stacked scales and gated follow-ups.
 *
 * @param props Question rendering props.
 * @returns Styled audit question card.
 */
export function QuestionCard({
    question,
    questionIndex,
    totalQuestions,
    selectedAnswers,
    disabled,
    onChangeAnswers,
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
    const selectedChecklistOptionKeys = readChecklistOptionKeys(selectedAnswers);
    const otherChecklistText = readChecklistOtherText(selectedAnswers);

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
            <XStack justify="space-between" items="center">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {`${questionIndex} of ${totalQuestions}`}
                </Text>
                <Text
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                >
                    {formatQuestionKey(question.question_key)}
                </Text>
            </XStack>
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={
                    layout.isTablet
                        ? ds.typography.titleMd.fontSize
                        : ds.typography.titleSm.fontSize
                }
                lineHeight={
                    layout.isTablet
                        ? ds.typography.titleMd.lineHeight
                        : ds.typography.titleSm.lineHeight
                }
            >
                <Text
                    color={ds.colors.secondaryForeground}
                    fontFamily={ds.fonts.bodySemiBold}
                    fontSize={
                        layout.isTablet
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
                                layout.isTablet
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

            {question.question_type === "checklist" ? (
                <ChecklistSelector
                    question={question}
                    selectedOptionKeys={selectedChecklistOptionKeys}
                    otherText={otherChecklistText}
                    disabled={disabled}
                    onChangeAnswers={onChangeAnswers}
                />
            ) : (
                <>
                    {question.scales.map((scale, scaleIndex) => {
                        if (scaleIndex > 0 && !showFollowUpScales) {
                            return null;
                        }

                        return (
                            <ScaleSelector
                                key={`${question.question_key}.${scale.key}`}
                                questionKey={question.question_key}
                                scale={scale}
                                selectedOptionKey={
                                    typeof selectedAnswers[scale.key] === "string"
                                        ? (selectedAnswers[scale.key] as string)
                                        : undefined
                                }
                                disabled={disabled}
                                onChangeAnswers={onChangeAnswers}
                                currentAnswers={selectedAnswers}
                                question={question}
                            />
                        );
                    })}
                </>
            )}

            {question.question_type === "scaled" &&
            question.scales.length > 1 &&
            !showFollowUpScales ? (
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
    readonly question: InstrumentQuestion;
    readonly scale: QuestionScale;
    readonly selectedOptionKey: string | undefined;
    readonly currentAnswers: QuestionResponsePayload;
    readonly disabled: boolean;
    readonly onChangeAnswers: (questionKey: string, nextAnswers: QuestionResponsePayload) => void;
}

/**
 * Render one scale selector inside a playspace question card.
 *
 * @param props Scale selector props.
 * @returns Selector surface for one scale.
 */
function ScaleSelector({
    questionKey,
    question,
    scale,
    selectedOptionKey,
    currentAnswers,
    disabled,
    onChangeAnswers,
}: Readonly<ScaleSelectorProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const isPhone = !layout.isTablet;
    console.log(
        "Scale option label lengths:",
        scale.options.map((option) => option.label.length),
    );
    const optionWidth = getOptionGridItemWidth(
        scale.options.length,
        Math.max(...scale.options.map((option) => option.label.length)),
        isPhone,
    );
    console.log("Option width:", optionWidth);
    const scaleAccent = getScaleAccentColor(scale.key, ds.colors);
    const scaleSoft = getScaleSoftColor(scale.key, ds.colors);
    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.input}
            p={layout.isTablet ? 16 : 12}
            gap={layout.isTablet ? "$3" : "$2.5"}
            borderLeftWidth={3}
            borderLeftColor={scaleAccent}
        >
            <YStack gap="$1">
                <Text
                    color={scaleAccent}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={
                        layout.isTablet
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
                        layout.isTablet
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
                            width={optionWidth}
                            rounded={ds.radii.md}
                            height={layout.isTablet ? layout.formOptionHeight : 52}
                            disabled={disabled}
                            borderWidth={isSelected ? 2 : 1}
                            borderColor={isSelected ? scaleAccent : ds.colors.border}
                            bg={isSelected ? scaleSoft : ds.colors.surfaceMuted}
                            opacity={disabled ? 0.6 : 1}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={() => {
                                if (disabled) {
                                    return;
                                }
                                onChangeAnswers(
                                    questionKey,
                                    buildNextScaledQuestionAnswers(
                                        currentAnswers,
                                        question,
                                        scale.key,
                                        option.key,
                                    ),
                                );
                            }}
                        >
                            <Text
                                color={isSelected ? scaleAccent : ds.colors.foreground}
                                fontFamily={isSelected ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                                fontSize={
                                    layout.isTablet
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

interface ChecklistSelectorProps {
    readonly question: InstrumentQuestion;
    readonly selectedOptionKeys: readonly string[];
    readonly otherText: string;
    readonly disabled: boolean;
    readonly onChangeAnswers: (questionKey: string, nextAnswers: QuestionResponsePayload) => void;
}

function ChecklistSelector({
    question,
    selectedOptionKeys,
    otherText,
    disabled,
    onChangeAnswers,
}: Readonly<ChecklistSelectorProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const isPhone = !layout.isTablet;

    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.input}
            p={layout.isTablet ? 16 : 12}
            gap={layout.isTablet ? "$3" : "$2.5"}
        >
            <XStack gap="$2" flexWrap="wrap" justify="space-between">
                {question.options.map((option) => {
                    const isSelected = selectedOptionKeys.includes(option.key);

                    return (
                        <Button
                            key={`${question.question_key}.${option.key}`}
                            width={getOptionGridItemWidth(
                                question.options.length,
                                Math.max(...question.options.map((option) => option.label.length)),
                                isPhone,
                            )}
                            rounded={ds.radii.md}
                            height={layout.isTablet ? layout.formOptionHeight : 42}
                            disabled={disabled}
                            borderWidth={isSelected ? 2 : 1}
                            borderColor={isSelected ? ds.colors.primary : ds.colors.border}
                            bg={isSelected ? ds.colors.primarySoft : ds.colors.surfaceMuted}
                            opacity={disabled ? 0.6 : 1}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={() => {
                                if (disabled) {
                                    return;
                                }
                                onChangeAnswers(
                                    question.question_key,
                                    toggleChecklistOption(
                                        selectedOptionKeys,
                                        option.key,
                                        otherText,
                                    ),
                                );
                            }}
                        >
                            <Text
                                color={isSelected ? ds.colors.primary : ds.colors.foreground}
                                fontFamily={isSelected ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                                fontSize={
                                    layout.isTablet
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
            {selectedOptionKeys.includes("other") ? (
                <TextInput
                    multiline
                    value={otherText}
                    editable={!disabled}
                    onChangeText={(nextText) => {
                        onChangeAnswers(
                            question.question_key,
                            setChecklistOtherText(selectedOptionKeys, nextText),
                        );
                    }}
                    placeholder="Describe other"
                    placeholderTextColor={ds.colors.mutedForeground}
                    style={{
                        minHeight: layout.isTablet ? 96 : 88,
                        borderRadius: ds.radii.md,
                        borderWidth: 1,
                        borderColor: ds.colors.border,
                        backgroundColor: ds.colors.surface,
                        color: ds.colors.foreground,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        textAlignVertical: "top",
                    }}
                />
            ) : null}
        </YStack>
    );
}

function readChecklistOptionKeys(selectedAnswers: QuestionResponsePayload): string[] {
    const selectedOptionKeys = selectedAnswers["selected_option_keys"];
    if (!Array.isArray(selectedOptionKeys)) {
        return [];
    }

    return selectedOptionKeys.filter((entry): entry is string => typeof entry === "string");
}

function readChecklistOtherText(selectedAnswers: QuestionResponsePayload): string {
    const otherDetails = selectedAnswers["other_details"];
    if (typeof otherDetails !== "object" || otherDetails === null) {
        return "";
    }
    if (!("text" in otherDetails)) {
        return "";
    }

    const text = otherDetails["text"];
    return typeof text === "string" ? text : "";
}

function toggleChecklistOption(
    selectedOptionKeys: readonly string[],
    optionKey: string,
    otherText: string,
): QuestionResponsePayload {
    const nextSelectedOptionKeys = selectedOptionKeys.includes(optionKey)
        ? selectedOptionKeys.filter((currentKey) => currentKey !== optionKey)
        : [...selectedOptionKeys, optionKey];

    const nextAnswers: QuestionResponsePayload = {
        selected_option_keys: nextSelectedOptionKeys,
    };

    if (nextSelectedOptionKeys.includes("other") && otherText.trim().length > 0) {
        nextAnswers.other_details = { text: otherText };
    }

    return nextAnswers;
}

function setChecklistOtherText(
    selectedOptionKeys: readonly string[],
    nextText: string,
): QuestionResponsePayload {
    const nextAnswers: QuestionResponsePayload = {
        selected_option_keys: [...selectedOptionKeys],
    };

    if (nextText.trim().length > 0) {
        nextAnswers.other_details = { text: nextText };
    }

    return nextAnswers;
}

function buildNextScaledQuestionAnswers(
    currentAnswers: QuestionResponsePayload,
    question: InstrumentQuestion,
    scaleKey: string,
    optionKey: string,
): QuestionResponsePayload {
    const nextAnswers: QuestionResponsePayload = {
        ...currentAnswers,
        [scaleKey]: optionKey,
    };

    if (scaleKey !== "quantity") {
        return nextAnswers;
    }

    const quantityScale = question.scales.find((currentScale) => currentScale.key === "quantity");
    const selectedOption = quantityScale?.options.find((option) => option.key === optionKey);
    if (selectedOption?.allows_follow_up_scales !== false) {
        return nextAnswers;
    }

    return { quantity: optionKey };
}
