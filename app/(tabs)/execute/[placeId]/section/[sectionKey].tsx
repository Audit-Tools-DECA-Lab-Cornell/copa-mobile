import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { QuestionCard } from "components/playspace-audit/question-card";
import { designSystem } from "lib/design-system";
import { getQuestionAnswers, getSectionNote, getVisibleSections } from "lib/audit/selectors";
import type { InstrumentSection, QuestionScale } from "lib/audit/types";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/**
 * One section page.
 *
 * Answers are written directly to the Zustand store on every tap so they
 * persist across navigation and survive app restarts.  The store debounces
 * disk writes and a background timer pushes dirty sections to the API when
 * connectivity is available.
 *
 * The section note is kept in local state for responsive typing and flushed
 * to the store on blur, explicit save, or component unmount.
 */
export default function ExecuteSectionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        placeId?: string | string[];
        sectionKey?: string | string[];
    }>();
    const authSession = useAuthStore((state) => state.session);
    const hydrate = usePlayspaceAuditStore((state) => state.hydrate);
    const ensurePlaceAudit = usePlayspaceAuditStore((state) => state.ensurePlaceAudit);
    const applyLocalQuestionAnswer = usePlayspaceAuditStore(
        (state) => state.applyLocalQuestionAnswer,
    );
    const applyLocalSectionNote = usePlayspaceAuditStore((state) => state.applyLocalSectionNote);
    const instrument = usePlayspaceAuditStore((state) => state.instrument);
    const sessionsByPlaceId = usePlayspaceAuditStore((state) => state.sessionsByPlaceId);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const errorMessage = usePlayspaceAuditStore((state) => state.errorMessage);
    const dirtySections = usePlayspaceAuditStore((state) => state.dirtySections);

    const placeId = readSingleParam(params.placeId);
    const sectionKey = readSingleParam(params.sectionKey);
    const auditSession = placeId === null ? undefined : sessionsByPlaceId[placeId];

    const visibleSections = getVisibleSectionsStable(instrument, auditSession);

    const activeSection =
        sectionKey === null
            ? undefined
            : visibleSections.find((section) => section.section_key === sectionKey);

    const [localNote, setLocalNote] = useState("");
    const localNoteRef = useRef("");
    const noteInitializedRef = useRef(false);

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (!isHydrated || authSession === null || placeId === null) {
            return;
        }
        void ensurePlaceAudit(authSession, placeId).catch(() => {});
    }, [authSession, ensurePlaceAudit, isHydrated, placeId]);

    useEffect(() => {
        if (
            noteInitializedRef.current ||
            auditSession === undefined ||
            activeSection === undefined
        ) {
            return;
        }
        const storedNote = getSectionNote(auditSession, activeSection.section_key);
        setLocalNote(storedNote);
        localNoteRef.current = storedNote;
        noteInitializedRef.current = true;
    }, [auditSession, activeSection]);

    const flushNoteToStore = useCallback(() => {
        if (placeId !== null && sectionKey !== null) {
            applyLocalSectionNote(placeId, sectionKey, localNoteRef.current);
        }
    }, [placeId, sectionKey, applyLocalSectionNote]);

    useEffect(() => {
        return () => {
            if (placeId !== null && sectionKey !== null && noteInitializedRef.current) {
                applyLocalSectionNote(placeId, sectionKey, localNoteRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup must capture refs, not re-fire on every render
    }, [placeId, sectionKey]);

    const handleNoteChange = useCallback((text: string) => {
        setLocalNote(text);
        localNoteRef.current = text;
    }, []);

    const hasPendingLocalChanges =
        auditSession !== undefined &&
        Object.keys(dirtySections[auditSession.audit_id] ?? {}).length > 0;

    if (
        placeId === null ||
        sectionKey === null ||
        authSession === null ||
        auditSession === undefined ||
        activeSection === undefined
    ) {
        if (
            placeId !== null &&
            sectionKey !== null &&
            authSession !== null &&
            errorMessage !== null
        ) {
            return (
                <CenteredMessageCard
                    title={errorMessage.includes("403") ? "Access Denied" : "Section Unavailable"}
                    message={errorMessage}
                    actionLabel="Retry"
                    onAction={() => {
                        void ensurePlaceAudit(authSession, placeId).catch(() => {});
                    }}
                />
            );
        }

        return (
            <CenteredMessageCard
                title="Preparing Section"
                message="Loading the current section and any previously saved answers..."
            />
        );
    }

    const nextSection = getNextSection(visibleSections, activeSection.section_key);

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: designSystem.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: designSystem.spacing.screenPaddingHorizontal,
                paddingTop: designSystem.spacing.screenPaddingVertical,
                paddingBottom: 144,
                gap: 20,
            }}
        >
            <YStack gap="$3">
                <Text
                    color={designSystem.colors.foreground}
                    fontFamily={designSystem.fonts.headingBold}
                    fontSize={designSystem.typography.displayMd.fontSize}
                    lineHeight={designSystem.typography.displayMd.lineHeight}
                >
                    {activeSection.title}
                </Text>
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodyLg.fontSize}
                >
                    {activeSection.description ?? activeSection.instruction}
                </Paragraph>
            </YStack>

            <YStack gap="$3">
                {activeSection.questions.map((question) => {
                    const selectedAnswers = getQuestionAnswers(
                        auditSession,
                        activeSection.section_key,
                        question.question_key,
                    );

                    return (
                        <QuestionCard
                            key={question.question_key}
                            question={question}
                            selectedAnswers={selectedAnswers}
                            onSelectAnswer={(questionKey, scaleKey, optionKey) => {
                                const currentAnswers = getQuestionAnswers(
                                    auditSession,
                                    activeSection.section_key,
                                    questionKey,
                                );
                                const nextAnswers = buildNextQuestionAnswers(
                                    currentAnswers,
                                    question,
                                    scaleKey,
                                    optionKey,
                                );
                                applyLocalQuestionAnswer(
                                    placeId,
                                    activeSection.section_key,
                                    questionKey,
                                    nextAnswers,
                                );
                            }}
                        />
                    );
                })}
            </YStack>

            <YStack
                rounded={designSystem.radii.lg}
                borderWidth={1}
                borderColor={designSystem.colors.border}
                bg={designSystem.colors.surface}
                p="$4"
                gap="$3"
                style={{ boxShadow: designSystem.shadows.card }}
            >
                <Text
                    color={designSystem.colors.foreground}
                    fontFamily={designSystem.fonts.bodyBold}
                    fontSize={designSystem.typography.titleMd.fontSize}
                    lineHeight={designSystem.typography.titleMd.lineHeight}
                >
                    Section Notes
                </Text>
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodyLg.fontSize}
                    lineHeight={designSystem.typography.bodyLg.lineHeight}
                    marginBlockEnd={4}
                >
                    {activeSection.notes_prompt ??
                        "Add any reflections or recommendations for this section."}
                </Paragraph>
                <TextInput
                    multiline
                    value={localNote}
                    onChangeText={handleNoteChange}
                    onBlur={flushNoteToStore}
                    placeholder="Add section notes or recommendations..."
                    placeholderTextColor={designSystem.colors.mutedForeground}
                    style={{
                        minHeight: 120,
                        borderRadius: designSystem.radii.md,
                        borderWidth: 1,
                        borderColor: designSystem.colors.border,
                        backgroundColor: designSystem.colors.input,
                        color: designSystem.colors.foreground,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        textAlignVertical: "top",
                    }}
                />
            </YStack>

            {hasPendingLocalChanges ? (
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodySm.fontSize}
                >
                    Answers saved locally — will sync to server when online.
                </Paragraph>
            ) : null}

            {errorMessage === null ? null : (
                <Paragraph
                    color={designSystem.colors.warning}
                    fontFamily={designSystem.fonts.bodyMedium}
                >
                    {errorMessage}
                </Paragraph>
            )}

            <XStack gap="$2">
                <Button
                    flex={1}
                    height={52}
                    rounded={designSystem.radii.md}
                    borderWidth={1}
                    borderColor={designSystem.colors.border}
                    bg={designSystem.colors.input}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        flushNoteToStore();
                        router.replace(`/(tabs)/execute/${placeId}`);
                    }}
                >
                    <Text
                        color={designSystem.colors.foreground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.labelLg.fontSize}
                        textTransform="uppercase"
                        letterSpacing={0.5}
                    >
                        Back to overview
                    </Text>
                </Button>
                <Button
                    flex={1}
                    height={52}
                    rounded={designSystem.radii.md}
                    borderWidth={0}
                    bg={designSystem.colors.primary}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        flushNoteToStore();
                        if (nextSection === undefined) {
                            router.replace(`/(tabs)/execute/${placeId}`);
                            return;
                        }
                        router.replace(
                            `/(tabs)/execute/${placeId}/section/${nextSection.section_key}`,
                        );
                    }}
                >
                    <Text
                        color={designSystem.colors.primaryForeground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.labelLg.fontSize}
                        textTransform="uppercase"
                        letterSpacing={0.7}
                    >
                        {nextSection === undefined ? "Save section" : "Save and next"}
                    </Text>
                </Button>
            </XStack>
        </ScrollView>
    );
}

/**
 * Memoization-safe wrapper: returns visible sections without creating a new
 * array reference when the inputs haven't meaningfully changed.
 */
function getVisibleSectionsStable(
    instrument: { readonly sections: readonly InstrumentSection[] } | null,
    auditSession: { readonly selected_execution_mode: string | null } | undefined,
): InstrumentSection[] {
    if (instrument === null || auditSession === undefined) {
        return EMPTY_SECTIONS;
    }
    const mode = auditSession.selected_execution_mode;
    if (mode === null) {
        return EMPTY_SECTIONS;
    }
    return getVisibleSections(
        instrument as Parameters<typeof getVisibleSections>[0],
        mode as Parameters<typeof getVisibleSections>[1],
    );
}

const EMPTY_SECTIONS: InstrumentSection[] = [];

interface CenteredMessageCardProps {
    readonly title: string;
    readonly message: string;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
}

/**
 * @param props Message card props.
 * @returns Centered loading/error card.
 */
function CenteredMessageCard({
    title,
    message,
    actionLabel,
    onAction,
}: Readonly<CenteredMessageCardProps>) {
    return (
        <YStack
            flex={1}
            justify="center"
            px={designSystem.spacing.screenPaddingHorizontal}
            bg={designSystem.colors.background}
        >
            <YStack
                rounded={designSystem.radii.lg}
                borderWidth={1}
                borderColor={designSystem.colors.border}
                bg={designSystem.colors.surface}
                p="$4"
                gap="$2"
            >
                <Text
                    color={designSystem.colors.foreground}
                    fontFamily={designSystem.fonts.bodyBold}
                    fontSize={designSystem.typography.titleLg.fontSize}
                >
                    {title}
                </Text>
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                >
                    {message}
                </Paragraph>
                {actionLabel !== undefined && typeof onAction === "function" ? (
                    <Button
                        mt="$2"
                        height={44}
                        rounded={designSystem.radii.md}
                        borderWidth={1}
                        borderColor={designSystem.colors.border}
                        bg={designSystem.colors.input}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={onAction}
                    >
                        <Text
                            color={designSystem.colors.foreground}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={designSystem.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.1}
                        >
                            {actionLabel}
                        </Text>
                    </Button>
                ) : null}
            </YStack>
        </YStack>
    );
}

/**
 * @param value Raw route parameter.
 * @returns First string value or null.
 */
function readSingleParam(value: string | string[] | undefined): string | null {
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim().length > 0) {
        return value[0];
    }
    return null;
}

/**
 * @param sections Ordered visible sections.
 * @param currentSectionKey Current section key.
 * @returns Next section or undefined when at the end.
 */
function getNextSection(
    sections: readonly InstrumentSection[],
    currentSectionKey: string,
): InstrumentSection | undefined {
    const currentIndex = sections.findIndex((section) => section.section_key === currentSectionKey);
    if (currentIndex < 0) {
        return undefined;
    }
    return sections[currentIndex + 1];
}

/**
 * Apply one option selection and clear gated follow-up answers when the
 * selected quantity option does not allow them.
 *
 * @param currentAnswers Current scale answers for one question.
 * @param question Question definition with scale metadata.
 * @param scaleKey Scale being changed.
 * @param optionKey Selected option key.
 * @returns Next scale answer map for the question.
 */
function buildNextQuestionAnswers(
    currentAnswers: Record<string, string>,
    question: { readonly scales: readonly QuestionScale[] },
    scaleKey: string,
    optionKey: string,
): Record<string, string> {
    const nextAnswers: Record<string, string> = {
        ...currentAnswers,
        [scaleKey]: optionKey,
    };

    if (scaleKey !== "quantity") {
        return nextAnswers;
    }

    const quantityScale = question.scales.find((scale) => scale.key === "quantity");
    const selectedOption = quantityScale?.options.find((option) => option.key === optionKey);
    if (selectedOption?.allows_follow_up_scales !== false) {
        return nextAnswers;
    }

    return { quantity: optionKey };
}
