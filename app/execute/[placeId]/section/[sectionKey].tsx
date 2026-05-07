import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, TextInput } from "react-native";
import { type Href, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, YStack } from "tamagui";
import { AuditHeaderTitle } from "components/ui/audit-header-title";
import { QuestionCard } from "components/playspace-audit/question-card";
import { SectionQuestionTable } from "components/playspace-audit/section-question-table";
import { ExecuteSectionBottomNav } from "components/ui/execute-section-bottom-nav";
import { AuditProgressDots } from "components/ui/audit-progress-dots";
import { SyncStatusIsland } from "components/ui/sync-status-island";
import { canEditAuditInputs, shouldPersistCleanupWrite } from "lib/audit/store-sync-core";
import { useDesignSystem } from "lib/design-system";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import {
    getInstrumentSectionLocalProgress,
    getQuestionAnswers,
    getSectionNote,
    getVisibleSections,
    isInstrumentQuestionComplete,
} from "lib/audit/selectors";
import type {
    AuditSession,
    ExecutionMode,
    InstrumentSection,
    PlayspaceInstrument,
    QuestionResponsePayload,
    QuestionScale,
} from "lib/audit/types";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { requestImmediateAuditSync } from "lib/audit/use-audit-sync";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";
import { usePlacesStore } from "stores/places-store";
import { parsePromptSegments } from "lib/audit/prompt-segments";

/**
 * One section page.
 *
 * Answers are written directly to the Zustand store on every tap so they
 * persist across navigation and survive app restarts.  The store debounces
 * disk writes; foreground sync batches API pushes about 1.5–2s after edits,
 * with extra flushes on note blur, section change, and app background.
 *
 * The section note is kept in local state for responsive typing and flushed
 * to the store on blur, explicit save, or component unmount.
 */
export default function ExecuteSectionScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const navigation = useNavigation();
    const router = useRouter();
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
    const applyLocalQuestionAnswer = usePlayspaceAuditStore((state) => state.applyLocalQuestionAnswer);
    const applyLocalSectionNote = usePlayspaceAuditStore((state) => state.applyLocalSectionNote);
    const submitAuditSession = usePlayspaceAuditStore((state) => state.submitAuditSession);
    const isSavingDraft = usePlayspaceAuditStore((state) => state.isSavingDraft);
    const sessionsByPairKey = usePlayspaceAuditStore((state) => state.sessionsByPairKey);
    const syncStateByAuditId = usePlayspaceAuditStore((state) => state.syncStateByAuditId);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const errorMessage = usePlayspaceAuditStore((state) => state.errorMessage);
    const dirtySections = usePlayspaceAuditStore((state) => state.dirtySections);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);

    const placeId = readSingleParam(params.placeId);
    const projectId = readSingleParam(params.projectId);
    const sectionKey = readSingleParam(params.sectionKey);
    const pairKey = placeId === null || projectId === null ? null : getProjectPlaceKey(projectId, placeId);
    const auditSession = pairKey === null ? undefined : sessionsByPairKey[pairKey];

    const visibleSections = getVisibleSectionsStable(instrument!, auditSession);

    const activeSection =
        sectionKey === null ? undefined : visibleSections.find((section) => section.section_key === sectionKey);

    const [localNote, setLocalNote] = useState("");
    const [isNoteFocused, setIsNoteFocused] = useState(false);
    const [lastAnswerChangeTime, setLastAnswerChangeTime] = useState<number | undefined>();
    const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success">("idle");
    const [isSyncedDismissed, setIsSyncedDismissed] = useState(false);
    const localNoteRef = useRef("");
    const noteInitializedRef = useRef(false);
    const latestAuditSessionRef = useRef<AuditSession | undefined>(auditSession);
    const canEditInputsRef = useRef(false);
    const scrollViewRef = useRef<ScrollView | null>(null);

    const themedHeaderOptions = useMemo(
        () => ({
            headerShown: true,
            headerBackButtonMenuEnabled: true,
            headerBackButtonDisplayMode: "generic",
            headerBackVisible: true,
            headerBlurEffect: "light",
            headerStyle: { backgroundColor: ds.colors.surfaceMuted },
            headerTintColor: ds.colors.primary,
            contentStyle: { paddingTop: 20 },
            headerTitleStyle: {
                color: ds.colors.foreground,
                fontFamily: ds.fonts.bodyBold,
            },
        }),
        [ds],
    );

    useLayoutEffect(() => {
        if (activeSection !== undefined) {
            navigation.setOptions({
                ...themedHeaderOptions,
                headerTitle: () => (
                    <AuditHeaderTitle
                        primary={auditSession?.place_name ?? ""}
                        secondary={`Section: ${activeSection.title}`}
                    />
                ),
            });
        }
    }, [themedHeaderOptions, navigation, activeSection, auditSession]);

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

    const canEditInputs =
        auditSession !== undefined &&
        canEditAuditInputs({
            session: auditSession,
            phase: syncStateByAuditId[auditSession.audit_id]?.phase,
        });

    useEffect(() => {
        latestAuditSessionRef.current = auditSession;
    }, [auditSession]);

    useEffect(() => {
        canEditInputsRef.current = canEditInputs;
    }, [canEditInputs]);

    useEffect(() => {
        if (noteInitializedRef.current || auditSession === undefined || activeSection === undefined) {
            return;
        }
        const storedNote = getSectionNote(auditSession, activeSection.section_key);
        setLocalNote(storedNote);
        localNoteRef.current = storedNote;
        noteInitializedRef.current = true;
    }, [auditSession, activeSection]);

    const flushNoteToStore = useCallback(() => {
        const latestAuditSession = latestAuditSessionRef.current;
        if (
            pairKey === null ||
            sectionKey === null ||
            latestAuditSession === undefined ||
            !noteInitializedRef.current ||
            !canEditInputsRef.current
        ) {
            return;
        }

        if (
            !shouldPersistCleanupWrite({
                currentValue: getSectionNote(latestAuditSession, sectionKey),
                nextValue: localNoteRef.current,
            })
        ) {
            return;
        }

        applyLocalSectionNote(pairKey, sectionKey, localNoteRef.current);
    }, [pairKey, sectionKey, applyLocalSectionNote]);

    useEffect(() => {
        return () => {
            flushNoteToStore();
            requestImmediateAuditSync("section_change");
        };
    }, [sectionKey, flushNoteToStore]);

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
        auditSession !== undefined && Object.keys(dirtySections[auditSession.audit_id] ?? {}).length > 0;

    const handlePrevButton = useCallback(() => {
        flushNoteToStore();
        if (activeSection !== undefined) {
            const previousSection = getPreviousSection(visibleSections, activeSection.section_key);
            if (previousSection !== undefined && placeId !== null && projectId !== null) {
                router.replace(
                    `/execute/${placeId}/section/${previousSection.section_key}?projectId=${encodeURIComponent(
                        projectId,
                    )}` as Href,
                );
            }
        }
    }, [flushNoteToStore, visibleSections, activeSection, router, placeId, projectId]);

    // Reset the synced-pill dismissal flag whenever sync activity moves out of the synced
    // phase, so the next sync→synced transition shows the pill again. Declared here (before
    // any conditional return) to satisfy the rules of hooks; the inner condition handles the
    // unresolved auditSession case naturally.
    const auditSyncPhase = auditSession === undefined ? undefined : syncStateByAuditId[auditSession.audit_id]?.phase;
    useEffect(() => {
        if (auditSyncPhase !== "idle" && auditSyncPhase !== "submitted" && isSyncedDismissed) {
            setIsSyncedDismissed(false);
        }
    }, [auditSyncPhase, isSyncedDismissed]);

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

    const resolvedPlaceId = placeId;
    const resolvedProjectId = projectId;
    const resolvedPairKey = pairKey;
    const resolvedAuthSession = authSession;
    const resolvedAuditSession = auditSession;
    const resolvedActiveSection = activeSection;
    const sectionInstructionsPromptSegments = parsePromptSegments(
        resolvedActiveSection.description ?? resolvedActiveSection.instruction,
    );
    const nextSection = getNextSection(visibleSections, resolvedActiveSection.section_key);
    const activeSectionNumber =
        visibleSections.findIndex((s) => s.section_key === resolvedActiveSection.section_key) + 1;
    // Section is "answered" when every required question has a complete response. Used to drive
    // the Next button visual variant (outlined when unanswered, solid terracotta when answered).
    const hasUnansweredRequired = resolvedActiveSection.questions.some((question) => {
        if (!question.required) return false;
        const answers = getQuestionAnswers(
            resolvedAuditSession,
            resolvedActiveSection.section_key,
            question.question_key,
        );
        return !isInstrumentQuestionComplete(question, answers);
    });
    const questionByKey = new Map(resolvedActiveSection.questions.map((question) => [question.question_key, question]));
    const questionRows = resolvedActiveSection.questions.map((question) => {
        return {
            question,
            selectedAnswers: getQuestionAnswers(
                resolvedAuditSession,
                resolvedActiveSection.section_key,
                question.question_key,
            ),
        };
    });
    const proceedToNextOrSubmit = async (): Promise<void> => {
        if (nextSection !== undefined) {
            router.replace(
                `/execute/${resolvedPlaceId}/section/${nextSection.section_key}?projectId=${encodeURIComponent(resolvedProjectId)}` as Href,
            );
            return;
        }

        setSubmitState("submitting");
        try {
            const submittedSession = await submitAuditSession(resolvedAuthSession, resolvedAuditSession.audit_id);
            await loadPlaces(resolvedAuthSession).catch(() => undefined);
            // Show the success moment (moss checkmark + scale overshoot) before navigating.
            // The bottom-nav animation runs ~400ms; navigate after 600ms total.
            setSubmitState("success");
            setTimeout(() => {
                router.replace(
                    `/execute/${submittedSession.place_id}/overview?projectId=${encodeURIComponent(submittedSession.project_id)}` as Href,
                );
            }, 600);
        } catch {
            setSubmitState("idle");
            return;
        }
    };

    const handlePrimaryAction = async (): Promise<void> => {
        flushNoteToStore();

        const unansweredQuestions = resolvedActiveSection.questions.filter((question) => {
            if (!question.required) {
                return false;
            }
            const answers = getQuestionAnswers(
                resolvedAuditSession,
                resolvedActiveSection.section_key,
                question.question_key,
            );
            return !isInstrumentQuestionComplete(question, answers);
        });

        const isSubmit = nextSection === undefined;

        if (isSubmit) {
            const incompleteSections = visibleSections.filter((section) => {
                const progress = getInstrumentSectionLocalProgress(resolvedAuditSession, section);
                return !progress.isComplete;
            });

            if (incompleteSections.length > 0) {
                const sectionList = incompleteSections
                    .map((s) => {
                        const num = visibleSections.indexOf(s) + 1;
                        return `${num}. ${s.title}`;
                    })
                    .join("\n");

                Alert.alert(
                    t("section.submitBlockedTitle", { ns: "audit" }),
                    `${t("section.submitBlockedMessage", { ns: "audit" })}\n\n${t("section.submitBlockedListLabel", { ns: "audit" })}\n${sectionList}`,
                    [
                        {
                            text: t("section.submitBlockedOk", { ns: "audit" }),
                            style: "cancel",
                        },
                    ],
                );
                return;
            }
        }

        if (unansweredQuestions.length > 0) {
            const questionList = unansweredQuestions.map((q) => formatQuestionKey(q.question_key)).join(", ");

            Alert.alert(
                t("section.incompleteTitle", { ns: "audit" }),
                `${t("section.incompleteMessage", { ns: "audit" })}\n\n${t("section.incompleteListLabel", { ns: "audit" })} ${questionList}`,
                [
                    {
                        text: t("section.incompleteGoBack", { ns: "audit" }),
                        style: "cancel",
                    },
                    {
                        text: t("section.incompleteConfirmContinue", { ns: "audit" }),
                        onPress: () => {
                            void proceedToNextOrSubmit();
                        },
                    },
                ],
            );
            return;
        }

        if (isSubmit) {
            Alert.alert(
                t("section.submitConfirmTitle", { ns: "audit" }),
                t("section.submitConfirmMessage", { ns: "audit" }),
                [
                    {
                        text: t("section.submitConfirmCancel", { ns: "audit" }),
                        style: "cancel",
                    },
                    {
                        text: t("section.submitConfirmSubmit", { ns: "audit" }),
                        style: "destructive",
                        onPress: () => {
                            void proceedToNextOrSubmit();
                        },
                    },
                ],
            );
            return;
        }

        await proceedToNextOrSubmit();
    };

    const handleSelectAnswer = (
        question: InstrumentSection["questions"][number],
        questionKey: string,
        scaleKey: string,
        optionKey: string,
    ) => {
        if (!canEditInputs) {
            return;
        }

        const currentAnswers = getQuestionAnswers(resolvedAuditSession, resolvedActiveSection.section_key, questionKey);
        const nextAnswers = buildNextQuestionAnswers(currentAnswers, question, scaleKey, optionKey);
        applyLocalQuestionAnswer(resolvedPairKey, resolvedActiveSection.section_key, questionKey, nextAnswers);
        setLastAnswerChangeTime(Date.now());
    };
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
                {resolvedActiveSection.notes_prompt ?? t("section.notesDefault", { ns: "audit" })}
            </Paragraph>
            <TextInput
                multiline
                value={localNote}
                onChangeText={handleNoteChange}
                editable={canEditInputs}
                onFocus={() => {
                    setIsNoteFocused(true);
                }}
                onBlur={() => {
                    setIsNoteFocused(false);
                    flushNoteToStore();
                    requestImmediateAuditSync("blur");
                }}
                placeholder={t("section.notesPlaceholder", { ns: "audit" })}
                placeholderTextColor={ds.colors.placeholderColor}
                style={{
                    minHeight: layout.isTablet && isNoteFocused ? 200 : 120,
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

    // Derive sync status for display
    const getSyncStatusFromAuditState = (): "offline" | "syncing" | "synced" | "idle" => {
        if (resolvedAuditSession === undefined) return "idle";
        const syncState = syncStateByAuditId[resolvedAuditSession.audit_id];
        if (syncState === undefined) return "idle";

        switch (syncState.phase) {
            case "blocked_network":
                return "offline";
            case "dirty":
            case "saving":
            case "submitting":
            case "resolving_submit":
            case "conflict":
                return "syncing";
            case "idle":
            case "submitted":
                return "synced";
            default:
                return "idle";
        }
    };

    const derivedSyncStatus = getSyncStatusFromAuditState();
    // Once the synced pill has been auto-dismissed for the current cycle, treat it as idle
    // until the next sync activity (offline / syncing) restarts the cycle. The reset effect
    // is declared above the early-return guard to satisfy the rules of hooks.
    const syncStatus = derivedSyncStatus === "synced" && isSyncedDismissed ? "idle" : derivedSyncStatus;

    return (
        <YStack flex={1} bg={ds.colors.background}>
            {/* Sync Status Island - appears when sync state is not idle */}
            {syncStatus !== "idle" && (
                <SyncStatusIsland
                    state={syncStatus}
                    onStateChange={(next) => {
                        if (next === "idle") {
                            setIsSyncedDismissed(true);
                        }
                    }}
                />
            )}

            {/* Pinned Progress Dots */}
            {auditSession !== undefined && (
                <AuditProgressDots
                    placeName={auditSession.place_name}
                    auditLabel={`Audit (${auditSession.audit_code})`}
                    totalDomains={visibleSections.length}
                    completedDomains={
                        visibleSections.filter((s) => getInstrumentSectionLocalProgress(auditSession, s).isComplete)
                            .length
                    }
                    activeDomain={visibleSections.findIndex((s) => s.section_key === activeSection?.section_key) + 1}
                    progressPercent={Math.round(
                        (visibleSections.filter((s) => getInstrumentSectionLocalProgress(auditSession, s).isComplete)
                            .length /
                            visibleSections.length) *
                            100,
                    )}
                />
            )}

            {/* Scrollable Content */}
            <ScrollView
                ref={scrollViewRef}
                contentInsetAdjustmentBehavior="automatic"
                style={{ flex: 1, backgroundColor: ds.colors.background }}
                contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                    bottomPadding: 64,
                    gap: layout.sectionGap,
                    maxWidth: layout.isTablet ? layout.contentMaxWidth : layout.formMaxWidth,
                    includeTopPadding: false,
                })}
            >
                <YStack gap="$3">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={layout.isTablet ? ds.typography.displayLg.fontSize : ds.typography.displayMd.fontSize}
                        lineHeight={
                            layout.isTablet ? ds.typography.displayLg.lineHeight : ds.typography.displayMd.lineHeight
                        }
                    >
                        {`${activeSectionNumber}. ${resolvedActiveSection.title}`}
                    </Text>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyLg.fontSize}
                    >
                        {sectionInstructionsPromptSegments.map((segment, index) => (
                            <Fragment key={`${resolvedActiveSection.section_key}-seg-${index.toString()}`}>
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
                    </Paragraph>
                </YStack>

                {layout.isTablet &&
                !resolvedActiveSection.questions.some((question) => question.question_type === "checklist") ? (
                    <YStack gap="$3">
                        <SectionQuestionTable
                            rows={questionRows}
                            disabled={!canEditInputs}
                            onSelectAnswer={(questionKey, scaleKey, optionKey) => {
                                const question = questionByKey.get(questionKey);
                                if (question === undefined) {
                                    return;
                                }
                                handleSelectAnswer(question, questionKey, scaleKey, optionKey);
                            }}
                        />
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
                        {notesPanel}
                    </YStack>
                ) : (
                    <YStack gap="$3">
                        <YStack gap="$3">
                            {questionRows.map(({ question, selectedAnswers }, index) => (
                                <QuestionCard
                                    key={question.question_key}
                                    question={question}
                                    questionIndex={index + 1}
                                    totalQuestions={questionRows.length}
                                    selectedAnswers={selectedAnswers}
                                    disabled={!canEditInputs}
                                    onChangeAnswers={(questionKey, nextAnswers) => {
                                        if (!canEditInputs) {
                                            return;
                                        }
                                        applyLocalQuestionAnswer(
                                            resolvedPairKey,
                                            resolvedActiveSection.section_key,
                                            questionKey,
                                            nextAnswers,
                                        );
                                        setLastAnswerChangeTime(Date.now());
                                    }}
                                />
                            ))}
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
                        {notesPanel}
                    </YStack>
                )}
            </ScrollView>

            {/* Fixed Bottom Navigation */}
            {auditSession !== undefined && (
                <ExecuteSectionBottomNav
                    onPrevPress={handlePrevButton}
                    onNextPress={async () => {
                        flushNoteToStore();
                        await handlePrimaryAction();
                    }}
                    showPrevButton={activeSectionNumber > 1}
                    isPrimaryDisabled={isSavingDraft || (!canEditInputs && nextSection === undefined)}
                    isSubmit={nextSection === undefined}
                    isAnswered={!hasUnansweredRequired}
                    lastAnswerChangeTime={lastAnswerChangeTime}
                    isSavingDraft={isSavingDraft}
                    submitState={submitState}
                />
            )}
        </YStack>
    );
}

/**
 * Memoization-safe wrapper: returns visible sections without creating a new
 * array reference when the inputs haven't meaningfully changed.
 */
function getVisibleSectionsStable(
    instrument: PlayspaceInstrument,
    auditSession: Pick<AuditSession, "selected_execution_mode" | "sections"> | undefined,
): InstrumentSection[] {
    if (auditSession === undefined) {
        return EMPTY_SECTIONS;
    }
    const mode = auditSession.selected_execution_mode;
    if (!isExecutionMode(mode)) {
        return EMPTY_SECTIONS;
    }
    return getVisibleSections(
        instrument,
        mode,
        Object.fromEntries(
            Object.entries(auditSession.sections).map(([sectionKey, sectionState]) => [
                sectionKey,
                sectionState.responses,
            ]),
        ),
    );
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
function CenteredMessageCard({ title, message, actionLabel, onAction }: Readonly<CenteredMessageCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    return (
        <YStack flex={1} justify="center" px={layout.screenPaddingHorizontal} bg={ds.colors.background}>
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
 * @param sections Ordered visible sections.
 * @param currentSectionKey Current section key.
 * @returns Previous section or undefined when at the beginning.
 */
function getPreviousSection(
    sections: readonly InstrumentSection[],
    currentSectionKey: string,
): InstrumentSection | undefined {
    const currentIndex = sections.findIndex((section) => section.section_key === currentSectionKey);
    if (currentIndex <= 0) {
        return undefined;
    }
    return sections[currentIndex - 1];
}

/**
 * Convert raw instrument question keys into a human-readable audit label.
 */
function formatQuestionKey(questionKey: string): string {
    const sections = questionKey.slice(2).split("_"); // Remove "q_" prefix
    return `Q ${sections.map((section) => section.toUpperCase()).join(".")}`;
}

/**
 * Apply one option selection and clear gated follow-up answers when the
 * selected provision option does not allow them.
 *
 * @param currentAnswers Current scale answers for one question.
 * @param question Question definition with scale metadata.
 * @param scaleKey Scale being changed.
 * @param optionKey Selected option key.
 * @returns Next scale answer map for the question.
 */
function buildNextQuestionAnswers(
    currentAnswers: QuestionResponsePayload,
    question: { readonly scales: readonly QuestionScale[] },
    scaleKey: string,
    optionKey: string,
): QuestionResponsePayload {
    const nextAnswers: QuestionResponsePayload = {
        ...currentAnswers,
        [scaleKey]: optionKey,
    };

    if (scaleKey !== "provision") {
        return nextAnswers;
    }

    const provisionScale = question.scales.find((scale) => scale.key === "provision");
    const selectedOption = provisionScale?.options.find((option) => option.key === optionKey);
    if (selectedOption?.allows_follow_up_scales !== false) {
        return nextAnswers;
    }

    return { provision: optionKey };
}
