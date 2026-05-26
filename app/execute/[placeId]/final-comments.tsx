import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, TextInput } from "react-native";
import { type Href, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";

import { AuditHeaderTitle } from "components/ui/audit-header-title";
import { getQuestionAnswers, getVisibleSections, isInstrumentQuestionComplete } from "lib/audit/selectors";
import { canEditAuditInputs } from "lib/audit/store-sync-core";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import { getExecutionModeShortLabel } from "lib/i18n/format";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { requestImmediateAuditSync } from "lib/audit/use-audit-sync";
import { useDesignSystem } from "lib/design-system";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";
import { usePlacesStore } from "stores/places-store";

/**
 * Final audit-level comments step shown immediately before irreversible submit.
 */
export default function ExecuteFinalCommentsScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const navigation = useNavigation();
    const { t } = useTranslation(["audit", "common"]);
    const params = useLocalSearchParams<{
        placeId?: string | string[];
        projectId?: string | string[];
        lastSectionKey?: string | string[];
    }>();
    const authSession = useAuthStore((state) => state.session);
    const hydrate = usePlayspaceAuditStore((state) => state.hydrate);
    const currentUserId = usePlayspaceAuditStore((state) => state.currentUserId);
    const ensurePlaceAudit = usePlayspaceAuditStore((state) => state.ensurePlaceAudit);
    const applyLocalFinalComments = usePlayspaceAuditStore((state) => state.applyLocalFinalComments);
    const submitAuditSession = usePlayspaceAuditStore((state) => state.submitAuditSession);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const isSavingDraft = usePlayspaceAuditStore((state) => state.isSavingDraft);
    const errorMessage = usePlayspaceAuditStore((state) => state.errorMessage);
    const dirtySections = usePlayspaceAuditStore((state) => state.dirtySections);
    const dirtyPreAudit = usePlayspaceAuditStore((state) => state.dirtyPreAudit);
    const dirtyMeta = usePlayspaceAuditStore((state) => state.dirtyMeta);
    const syncStateByAuditId = usePlayspaceAuditStore((state) => state.syncStateByAuditId);
    const sessionsByPairKey = usePlayspaceAuditStore((state) => state.sessionsByPairKey);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);

    const placeId = readSingleParam(params.placeId);
    const projectId = readSingleParam(params.projectId);
    const lastSectionKey = readSingleParam(params.lastSectionKey);
    const pairKey = placeId === null || projectId === null ? null : getProjectPlaceKey(projectId, placeId);
    const auditSession = pairKey === null ? undefined : sessionsByPairKey[pairKey];
    const instrument = useLocalizedInstrument(auditSession?.instrument);

    const [localComments, setLocalComments] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const commentsInitializedRef = useRef(false);
    const localCommentsRef = useRef("");
    const latestAuditSessionRef = useRef(auditSession);
    const canEditInputsRef = useRef(false);

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
        latestAuditSessionRef.current = auditSession;
    }, [auditSession]);

    const canEditInputs =
        auditSession !== undefined &&
        canEditAuditInputs({
            session: auditSession,
            phase: syncStateByAuditId[auditSession.audit_id]?.phase,
        });

    useEffect(() => {
        canEditInputsRef.current = canEditInputs;
    }, [canEditInputs]);

    useEffect(() => {
        commentsInitializedRef.current = false;
    }, [auditSession?.audit_id]);

    useEffect(() => {
        if (commentsInitializedRef.current || auditSession === undefined) {
            return;
        }
        const storedComments = auditSession.meta.final_comments ?? "";
        setLocalComments(storedComments);
        localCommentsRef.current = storedComments;
        commentsInitializedRef.current = true;
    }, [auditSession]);

    const flushCommentsToStore = useCallback(() => {
        const latestAuditSession = latestAuditSessionRef.current;
        if (
            pairKey === null ||
            latestAuditSession === undefined ||
            latestAuditSession.status === "SUBMITTED" ||
            !commentsInitializedRef.current ||
            !canEditInputsRef.current
        ) {
            return;
        }

        applyLocalFinalComments(pairKey, localCommentsRef.current);
    }, [applyLocalFinalComments, pairKey]);

    useEffect(() => {
        return () => {
            flushCommentsToStore();
            requestImmediateAuditSync("section_change");
        };
    }, [flushCommentsToStore]);

    useLayoutEffect(() => {
        navigation.setOptions({
            ...themedHeaderOptions,
            title: t("finalComments.title", { ns: "audit" }),
        });
        if (auditSession !== undefined) {
            const mode = getExecutionModeShortLabel(auditSession.selected_execution_mode, t);
            navigation.setOptions({
                ...themedHeaderOptions,
                headerTitle: () => (
                    <AuditHeaderTitle
                        primary={auditSession.place_name}
                        secondary={mode.length > 0 ? mode : undefined}
                    />
                ),
            });
        }
    }, [auditSession, navigation, t, themedHeaderOptions]);

    const hasPendingLocalChanges =
        auditSession !== undefined &&
        (dirtyMeta[auditSession.audit_id] !== undefined ||
            dirtyPreAudit[auditSession.audit_id] !== undefined ||
            Object.keys(dirtySections[auditSession.audit_id] ?? {}).length > 0);
    const executionMode = auditSession?.selected_execution_mode ?? auditSession?.meta.execution_mode ?? null;
    const visibleSections = useMemo(() => {
        if (auditSession === undefined || instrument == null || executionMode === null) {
            return [];
        }

        return getVisibleSections(
            instrument,
            executionMode,
            Object.fromEntries(
                Object.entries(auditSession.sections).map(([sectionKey, sectionState]) => [
                    sectionKey,
                    sectionState.responses,
                ]),
            ),
        );
    }, [auditSession, executionMode, instrument]);
    const remainingSectionCount = Math.max(
        0,
        auditSession?.progress.visible_section_count ?? 0 - (auditSession?.progress.completed_section_count ?? 0),
    );
    const readyToSubmit = auditSession?.progress.ready_to_submit ?? false;
    const submissionBlockers = [
        !(auditSession?.progress.required_pre_audit_complete ?? false)
            ? t("finalComments.blockers.completeSetup", { ns: "audit" })
            : null,
        remainingSectionCount > 0
            ? t("finalComments.blockers.finishSections", {
                  ns: "audit",
                  count: remainingSectionCount,
              })
            : null,
    ].filter((value): value is string => value !== null);
    const incompleteItems = useMemo(() => {
        if (auditSession === undefined) {
            return [];
        }

        return visibleSections.flatMap((section, sectionIndex) => {
            const missingQuestionKeys = section.questions
                .filter((question) => {
                    if (!question.required) {
                        return false;
                    }

                    const answers = getQuestionAnswers(auditSession, section.section_key, question.question_key);
                    return !isInstrumentQuestionComplete(question, answers);
                })
                .map((question) => formatQuestionKey(question.question_key));

            if (missingQuestionKeys.length === 0) {
                return [];
            }

            const answeredQuestionCount = section.questions.filter((question) => {
                if (!question.required) {
                    return false;
                }

                const answers = getQuestionAnswers(auditSession, section.section_key, question.question_key);
                return isInstrumentQuestionComplete(question, answers);
            }).length;

            return [
                {
                    sectionKey: section.section_key,
                    sectionLabel: `${sectionIndex + 1}. ${section.title}`,
                    isWholeSectionEmpty: answeredQuestionCount === 0,
                    missingQuestionKeys,
                },
            ];
        });
    }, [auditSession, visibleSections]);

    if (
        placeId === null ||
        projectId === null ||
        pairKey === null ||
        authSession === null ||
        currentUserId !== authSession.user.id ||
        auditSession === undefined
    ) {
        return (
            <CenteredMessageCard
                title={t("finalComments.preparingTitle", { ns: "audit" })}
                message={t("finalComments.preparingMessage", { ns: "audit" })}
            />
        );
    }

    if (auditSession.status === "SUBMITTED") {
        return (
            <CenteredMessageCard
                title={t("finalComments.alreadySubmittedTitle", { ns: "audit" })}
                message={t("finalComments.alreadySubmittedMessage", { ns: "audit" })}
                actionLabel={t("section.backToOverview", { ns: "audit" })}
                onAction={() => {
                    router.replace(`/execute/${placeId}/overview?projectId=${encodeURIComponent(projectId)}` as Href);
                }}
            />
        );
    }

    const handleSubmit = () => {
        if (!readyToSubmit) {
            return;
        }
        Alert.alert(
            t("finalComments.submitConfirmTitle", { ns: "audit" }),
            t("finalComments.submitConfirmMessage", { ns: "audit" }),
            [
                {
                    text: t("finalComments.submitConfirmCancel", { ns: "audit" }),
                    style: "cancel",
                },
                {
                    text: t("finalComments.submitConfirmSubmit", { ns: "audit" }),
                    style: "destructive",
                    onPress: () => {
                        void (async () => {
                            flushCommentsToStore();
                            requestImmediateAuditSync("blur");
                            try {
                                const submittedSession = await submitAuditSession(authSession, auditSession.audit_id);
                                await loadPlaces(authSession).catch(() => undefined);
                                router.replace(
                                    `/execute/${submittedSession.place_id}/overview?projectId=${encodeURIComponent(
                                        submittedSession.project_id,
                                    )}` as Href,
                                );
                            } catch {
                                return;
                            }
                        })();
                    },
                },
            ],
        );
    };

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 144,
                gap: layout.sectionGap,
                maxWidth: layout.isTablet ? layout.contentMaxWidth : layout.formMaxWidth,
                includeTopPadding: false,
            })}
        >
            <YStack gap="$3">
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                >
                    {t("finalComments.stepEyebrow", { ns: "audit" })}
                </Text>
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={layout.isTablet ? ds.typography.displayLg.fontSize : ds.typography.displayMd.fontSize}
                    lineHeight={
                        layout.isTablet ? ds.typography.displayLg.lineHeight : ds.typography.displayMd.lineHeight
                    }
                >
                    {t("finalComments.title", { ns: "audit" })}
                </Text>
                <Paragraph
                    color={ds.colors.secondaryForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                    lineHeight={ds.typography.bodyMd.lineHeight}
                >
                    {t("finalComments.subtitle", { ns: "audit" })}
                </Paragraph>
            </YStack>

            <YStack
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p="$4"
                gap="$3"
                style={{ boxShadow: ds.shadows.card }}
            >
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                    lineHeight={ds.typography.titleMd.lineHeight}
                >
                    {t("finalComments.promptTitle", { ns: "audit" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyLg.fontSize}
                    lineHeight={ds.typography.bodyLg.lineHeight}
                >
                    {t("finalComments.prompt", { ns: "audit" })}
                </Paragraph>
                <TextInput
                    multiline
                    value={localComments}
                    onChangeText={(text) => {
                        setLocalComments(text);
                        localCommentsRef.current = text;
                    }}
                    editable={canEditInputs}
                    onFocus={() => {
                        setIsFocused(true);
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                        flushCommentsToStore();
                        requestImmediateAuditSync("blur");
                    }}
                    placeholder={t("finalComments.placeholder", { ns: "audit" })}
                    placeholderTextColor={ds.colors.placeholderColor}
                    style={{
                        minHeight: layout.isTablet && isFocused ? 200 : 120,
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
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {t("finalComments.helper", { ns: "audit" })}
                </Paragraph>
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

            {!readyToSubmit ? (
                <YStack
                    rounded={ds.radii.lg}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surface}
                    p="$4"
                    gap="$2"
                    style={{ boxShadow: ds.shadows.card }}
                >
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.titleSm.fontSize}
                        lineHeight={ds.typography.titleSm.lineHeight}
                    >
                        {t("finalComments.incompleteTitle", { ns: "audit" })}
                    </Text>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyMd.fontSize}
                        lineHeight={ds.typography.bodyMd.lineHeight}
                    >
                        {t("finalComments.incompleteMessage", { ns: "audit" })}
                    </Paragraph>
                    <YStack gap="$1.5">
                        {submissionBlockers.map((blocker) => (
                            <Paragraph
                                key={blocker}
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                lineHeight={ds.typography.bodySm.lineHeight}
                            >
                                {`\u2022 ${blocker}`}
                            </Paragraph>
                        ))}
                    </YStack>
                    {incompleteItems.length > 0 ? (
                        <YStack gap="$2.5" style={{ paddingTop: 4 }}>
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.bodyMd.fontSize}
                                lineHeight={ds.typography.bodyMd.lineHeight}
                            >
                                {t("finalComments.missingItemsTitle", {
                                    ns: "audit",
                                    defaultValue: "Missing responses",
                                })}
                            </Text>
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                lineHeight={ds.typography.bodySm.lineHeight}
                            >
                                {t("finalComments.missingItemsDescription", {
                                    ns: "audit",
                                    defaultValue:
                                        "Sections with no answers are listed by section. Partially complete sections list each missing question key.",
                                })}
                            </Paragraph>
                            <YStack gap="$2">
                                {incompleteItems.map((item) => (
                                    <YStack key={item.sectionKey} gap="$1">
                                        <Paragraph
                                            color={ds.colors.foreground}
                                            fontFamily={ds.fonts.bodyBold}
                                            fontSize={ds.typography.bodySm.fontSize}
                                            lineHeight={ds.typography.bodySm.lineHeight}
                                        >
                                            {`\u2022 ${item.sectionLabel}`}
                                        </Paragraph>
                                        {item.isWholeSectionEmpty ? (
                                            <Paragraph
                                                style={{ marginLeft: 16 }}
                                                color={ds.colors.mutedForeground}
                                                fontFamily={ds.fonts.bodyMedium}
                                                fontSize={ds.typography.bodySm.fontSize}
                                                lineHeight={ds.typography.bodySm.lineHeight}
                                            >
                                                {t("finalComments.emptySectionItem", {
                                                    ns: "audit",
                                                    defaultValue: "No responses captured yet.",
                                                })}
                                            </Paragraph>
                                        ) : (
                                            <YStack gap="$1" style={{ paddingLeft: 16 }}>
                                                {item.missingQuestionKeys.map((questionKey) => (
                                                    <Paragraph
                                                        key={`${item.sectionKey}-${questionKey}`}
                                                        color={ds.colors.mutedForeground}
                                                        fontFamily={ds.fonts.bodyMedium}
                                                        fontSize={ds.typography.bodySm.fontSize}
                                                        lineHeight={ds.typography.bodySm.lineHeight}
                                                    >
                                                        {`\u25E6 ${questionKey}`}
                                                    </Paragraph>
                                                ))}
                                            </YStack>
                                        )}
                                    </YStack>
                                ))}
                            </YStack>
                        </YStack>
                    ) : null}
                </YStack>
            ) : null}

            <XStack gap="$2" items="center" justify="space-between" width="100%">
                <Button
                    height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.input}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        flushCommentsToStore();
                        if (lastSectionKey !== null) {
                            router.replace(
                                `/execute/${placeId}/section/${lastSectionKey}?projectId=${encodeURIComponent(projectId)}` as Href,
                            );
                            return;
                        }
                        router.replace(
                            `/execute/${placeId}/overview?projectId=${encodeURIComponent(projectId)}` as Href,
                        );
                    }}
                >
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelLg.fontSize}
                        textTransform="uppercase"
                        letterSpacing={0.5}
                    >
                        {t("finalComments.backToReview", { ns: "audit" })}
                    </Text>
                </Button>
                <Button
                    height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
                    rounded={ds.radii.md}
                    borderWidth={0}
                    bg={ds.colors.primary}
                    width={"48%"}
                    disabled={isSavingDraft || !canEditInputs || !readyToSubmit}
                    opacity={isSavingDraft || !canEditInputs || !readyToSubmit ? 0.7 : 1}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={handleSubmit}
                >
                    <Text
                        color={ds.colors.primaryForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelLg.fontSize}
                        textTransform="uppercase"
                        letterSpacing={0.7}
                    >
                        {isSavingDraft
                            ? t("section.uploadingShort", { ns: "audit" })
                            : t("finalComments.submit", { ns: "audit" })}
                    </Text>
                </Button>
            </XStack>
        </ScrollView>
    );
}

interface CenteredMessageCardProps {
    readonly title: string;
    readonly message: string;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
}

/**
 * @param props Message card props.
 * @returns Centered loading or recovery card.
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
 * Convert raw instrument question keys into a human-readable audit label.
 */
function formatQuestionKey(questionKey: string): string {
    const sections = questionKey.startsWith("q_") ? questionKey.slice(2).split("_") : questionKey.split("_");
    return `Q ${sections.map((section) => section.toUpperCase()).join(".")}`;
}
