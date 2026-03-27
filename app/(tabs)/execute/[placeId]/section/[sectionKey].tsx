import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScrollView, TextInput } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { QuestionCard } from "components/playspace-audit/question-card";
import { useDesignSystem } from "lib/design-system";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import { getQuestionAnswers, getSectionNote, getVisibleSections } from "lib/audit/selectors";
import type {
    ExecutionMode,
    InstrumentSection,
    PlayspaceInstrument,
    QuestionScale,
} from "lib/audit/types";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/**
 * One section page.
 *
 * Answers are written directly to the Zustand store on every tap so they
 * persist across navigation and survive app restarts.  The store debounces
 * disk writes and event-driven sync pushes dirty sections to the API when
 * connectivity is available.
 *
 * The section note is kept in local state for responsive typing and flushed
 * to the store on blur, explicit save, or component unmount.
 */
export default function ExecuteSectionScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const navigation = useNavigation();
    const { t } = useTranslation(["audit", "common"]);
    const instrument = useLocalizedInstrument();
    const params = useLocalSearchParams<{
        placeId?: string | string[];
        projectId?: string | string[];
        sectionKey?: string | string[];
    }>();
    const authSession = useAuthStore((state) => state.session);
    const hydrate = usePlayspaceAuditStore((state) => state.hydrate);
    const currentUserId = usePlayspaceAuditStore((state) => state.currentUserId);
    const ensurePlaceAudit = usePlayspaceAuditStore((state) => state.ensurePlaceAudit);
    const applyLocalQuestionAnswer = usePlayspaceAuditStore(
        (state) => state.applyLocalQuestionAnswer,
    );
    const applyLocalSectionNote = usePlayspaceAuditStore((state) => state.applyLocalSectionNote);
    const sessionsByPairKey = usePlayspaceAuditStore((state) => state.sessionsByPairKey);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const errorMessage = usePlayspaceAuditStore((state) => state.errorMessage);
    const dirtySections = usePlayspaceAuditStore((state) => state.dirtySections);

    const placeId = readSingleParam(params.placeId);
    const projectId = readSingleParam(params.projectId);
    const sectionKey = readSingleParam(params.sectionKey);
    const pairKey =
        placeId === null || projectId === null ? null : getProjectPlaceKey(projectId, placeId);
    const auditSession = pairKey === null ? undefined : sessionsByPairKey[pairKey];

    const visibleSections = getVisibleSectionsStable(instrument, auditSession);

    const activeSection =
        sectionKey === null
            ? undefined
            : visibleSections.find((section) => section.section_key === sectionKey);

    useLayoutEffect(() => {
        if (activeSection !== undefined) {
            navigation.setOptions({ title: activeSection.title });
        }
    }, [navigation, activeSection]);

    const [localNote, setLocalNote] = useState("");
    const [isNoteFocused, setIsNoteFocused] = useState(false);
    const localNoteRef = useRef("");
    const noteInitializedRef = useRef(false);
    const scrollViewRef = useRef<ScrollView | null>(null);

    useEffect(() => {
        hydrate(authSession?.user.id ?? null).catch(() => undefined);
    }, [authSession, hydrate]);

    useEffect(() => {
        if (
            !isHydrated ||
            authSession === null ||
            currentUserId !== authSession.user.id ||
            placeId === null ||
            projectId === null
        ) {
            return;
        }
        ensurePlaceAudit(authSession, projectId, placeId).catch(() => undefined);
    }, [authSession, currentUserId, ensurePlaceAudit, isHydrated, placeId, projectId]);

    useEffect(() => {
        noteInitializedRef.current = false;
    }, [activeSection?.section_key, auditSession?.audit_id]);

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
        if (pairKey !== null && sectionKey !== null) {
            applyLocalSectionNote(pairKey, sectionKey, localNoteRef.current);
        }
    }, [pairKey, sectionKey, applyLocalSectionNote]);

    useEffect(() => {
        return () => {
            if (pairKey !== null && sectionKey !== null && noteInitializedRef.current) {
                applyLocalSectionNote(pairKey, sectionKey, localNoteRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup must capture refs, not re-fire on every render
    }, [pairKey, sectionKey]);

    const handleNoteChange = useCallback((text: string) => {
        setLocalNote(text);
        localNoteRef.current = text;
    }, []);

    const scrollSectionToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({
        contentReady: auditSession !== undefined && activeSection !== undefined,
        rerunKey: `${auditSession?.audit_id ?? "pending"}:${activeSection?.section_key ?? "none"}`,
        scrollToOffset: scrollSectionToOffset,
    });

    const hasPendingLocalChanges =
        auditSession !== undefined &&
        Object.keys(dirtySections[auditSession.audit_id] ?? {}).length > 0;

    if (
        placeId === null ||
        projectId === null ||
        pairKey === null ||
        sectionKey === null ||
        authSession === null ||
        currentUserId !== authSession.user.id ||
        auditSession === undefined ||
        activeSection === undefined
    ) {
        if (
            placeId !== null &&
            projectId !== null &&
            pairKey !== null &&
            sectionKey !== null &&
            authSession !== null &&
            errorMessage !== null
        ) {
            return (
                <CenteredMessageCard
                    title={
                        errorMessage.includes("403")
                            ? t("overview.accessDeniedTitle", { ns: "audit" })
                            : t("section.unavailableTitle", { ns: "audit" })
                    }
                    message={errorMessage}
                    actionLabel={t("actions.retry", { ns: "common" })}
                    onAction={() => {
                        ensurePlaceAudit(authSession, projectId, placeId).catch(() => undefined);
                    }}
                />
            );
        }

        return (
            <CenteredMessageCard
                title={t("section.preparingTitle", { ns: "audit" })}
                message={t("section.preparingMessage", { ns: "audit" })}
            />
        );
    }

    const nextSection = getNextSection(visibleSections, activeSection.section_key);
    const notesPanel = (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.titleMd.fontSize}
                lineHeight={ds.typography.titleMd.lineHeight}
            >
                {t("section.sectionNotes", { ns: "audit" })}
            </Text>
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyLg.fontSize}
                lineHeight={ds.typography.bodyLg.lineHeight}
                marginBlockEnd={4}
            >
                {activeSection.notes_prompt ?? t("section.notesDefault", { ns: "audit" })}
            </Paragraph>
            <TextInput
                multiline
                value={localNote}
                onChangeText={handleNoteChange}
                onFocus={() => {
                    setIsNoteFocused(true);
                }}
                onBlur={() => {
                    setIsNoteFocused(false);
                    flushNoteToStore();
                }}
                placeholder={t("section.notesPlaceholder", { ns: "audit" })}
                placeholderTextColor={ds.colors.mutedForeground}
                style={{
                    minHeight: layout.isTablet ? (isNoteFocused ? 200 : 112) : 120,
                    borderRadius: ds.radii.md,
                    borderWidth: 1,
                    borderColor: ds.colors.border,
                    backgroundColor: ds.colors.input,
                    color: ds.colors.foreground,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    textAlignVertical: "top",
                }}
            />
        </YStack>
    );
    const actionButtons = (
        <YStack gap="$2">
            <Button
                height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
                rounded={ds.radii.md}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.input}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
                    flushNoteToStore();
                    router.back();
                }}
            >
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelLg.fontSize}
                    textTransform="uppercase"
                    letterSpacing={0.5}
                >
                    {t("section.backToOverview", { ns: "audit" })}
                </Text>
            </Button>
            <Button
                height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
                rounded={ds.radii.md}
                borderWidth={0}
                bg={ds.colors.primary}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
                    flushNoteToStore();
                    if (nextSection === undefined) {
                        router.replace(
                            `/(tabs)/execute/${placeId}?projectId=${encodeURIComponent(projectId)}`,
                        );
                        return;
                    }
                    router.replace(
                        `/(tabs)/execute/${placeId}/section/${nextSection.section_key}?projectId=${encodeURIComponent(projectId)}`,
                    );
                }}
            >
                <Text
                    color={ds.colors.primaryForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelLg.fontSize}
                    textTransform="uppercase"
                    letterSpacing={0.7}
                >
                    {nextSection === undefined
                        ? t("section.saveSection", { ns: "audit" })
                        : t("section.saveAndNext", { ns: "audit" })}
                </Text>
            </Button>
        </YStack>
    );

    return (
        <ScrollView
            ref={scrollViewRef}
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 144,
                gap: layout.sectionGap,
                maxWidth: layout.isTablet ? layout.contentMaxWidth : layout.formMaxWidth,
            })}
        >
            <YStack gap="$3">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={
                        layout.isTablet
                            ? ds.typography.displayLg.fontSize
                            : ds.typography.displayMd.fontSize
                    }
                    lineHeight={
                        layout.isTablet
                            ? ds.typography.displayLg.lineHeight
                            : ds.typography.displayMd.lineHeight
                    }
                >
                    {activeSection.title}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyLg.fontSize}
                >
                    {activeSection.description ?? activeSection.instruction}
                </Paragraph>
            </YStack>

            {layout.isTablet ? (
                <XStack gap={layout.twoPaneGap} items="flex-start">
                    <YStack flex={1} gap="$3">
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
                                            pairKey,
                                            activeSection.section_key,
                                            questionKey,
                                            nextAnswers,
                                        );
                                    }}
                                />
                            );
                        })}
                    </YStack>
                    <YStack width={layout.supportRailWidth} gap="$3">
                        {hasPendingLocalChanges ? (
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                            >
                                {t("section.pendingSync", { ns: "audit" })}
                            </Paragraph>
                        ) : null}
                        {errorMessage === null ? null : (
                            <Paragraph
                                color={ds.colors.warning}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                lineHeight={ds.typography.bodySm.lineHeight}
                            >
                                {errorMessage}
                            </Paragraph>
                        )}
                        {actionButtons}
                        {notesPanel}
                    </YStack>
                </XStack>
            ) : (
                <YStack gap="$3">
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
                                            pairKey,
                                            activeSection.section_key,
                                            questionKey,
                                            nextAnswers,
                                        );
                                    }}
                                />
                            );
                        })}
                    </YStack>
                    {hasPendingLocalChanges ? (
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                        >
                            {t("section.pendingSync", { ns: "audit" })}
                        </Paragraph>
                    ) : null}
                    {errorMessage === null ? null : (
                        <Paragraph
                            color={ds.colors.warning}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                            lineHeight={ds.typography.bodySm.lineHeight}
                        >
                            {errorMessage}
                        </Paragraph>
                    )}
                    {actionButtons}
                    {notesPanel}
                </YStack>
            )}
        </ScrollView>
    );
}

/**
 * Memoization-safe wrapper: returns visible sections without creating a new
 * array reference when the inputs haven't meaningfully changed.
 */
function getVisibleSectionsStable(
    instrument: PlayspaceInstrument,
    auditSession: { readonly selected_execution_mode: string | null } | undefined,
): InstrumentSection[] {
    if (auditSession === undefined) {
        return EMPTY_SECTIONS;
    }
    const mode = auditSession.selected_execution_mode;
    if (!isExecutionMode(mode)) {
        return EMPTY_SECTIONS;
    }
    return getVisibleSections(instrument, mode);
}

const EMPTY_SECTIONS: InstrumentSection[] = [];

/**
 * Validate that a persisted mode string matches the supported execution modes.
 *
 * @param value Persisted execution mode value.
 * @returns True when the value is a supported execution mode.
 */
function isExecutionMode(value: string | null): value is ExecutionMode {
    return value === "audit" || value === "survey" || value === "both";
}

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
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    return (
        <YStack
            flex={1}
            justify="center"
            px={layout.screenPaddingHorizontal}
            bg={ds.colors.background}
        >
            <YStack
                width="100%"
                style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p="$4"
                gap="$2"
            >
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleLg.fontSize}
                >
                    {title}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyLg.fontSize}
                >
                    {message}
                </Paragraph>
                {actionLabel !== undefined && typeof onAction === "function" ? (
                    <Button
                        mt="$2"
                        height={44}
                        rounded={ds.radii.md}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.input}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={onAction}
                    >
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
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
