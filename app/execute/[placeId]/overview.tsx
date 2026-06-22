import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { type Href, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ArrowRight, ClipboardList } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import type { TFunction } from "i18next";

import {
    buildExecuteOverviewSummary,
    doesExecutionModeRequireSpaceAudit,
    filterExecuteOverviewRows,
    type ExecuteOverviewSectionFilter,
    type ExecuteOverviewSectionInput,
} from "lib/audit/execute-flow";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import {
    getInstrumentSectionLocalProgress,
    getPreAuditValues,
    getVisiblePreAuditQuestions,
    getVisibleSections,
    isRequiredPreAuditComplete,
} from "lib/audit/selectors";
import type { ExecutionMode } from "lib/audit/types";
import { getExecutionModeShortLabel } from "lib/i18n/format";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { AuditHeaderTitle } from "components/ui/audit-header-title";
import { LoggedInAsNotice } from "components/ui/logged-in-as-notice";
import { FilterChip } from "components/ui/filter-chip";
import { AuditExportCard } from "components/playspace-audit/audit-export-card";
import { AuditSyncStatusCard } from "components/playspace-audit/audit-sync-status-card";
import { useDesignSystem } from "lib/design-system";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

/**
 * Standalone section overview.  The setup page intentionally does not render
 * section cards; users reach this screen only after the required setup steps
 * are complete, or by using the skip button on a reopened complete setup.
 */
export default function ExecuteSectionOverviewScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const navigation = useNavigation();
    const { t } = useTranslation(["audit", "common"]);
    const params = useLocalSearchParams<{
        placeId?: string | string[];
        projectId?: string | string[];
    }>();
    const authSession = useAuthStore((state) => state.session);
    const hydrate = usePlayspaceAuditStore((state) => state.hydrate);
    const currentUserId = usePlayspaceAuditStore((state) => state.currentUserId);
    const ensurePlaceAudit = usePlayspaceAuditStore((state) => state.ensurePlaceAudit);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const isLoadingAudit = usePlayspaceAuditStore((state) => state.isLoadingAudit);
    const isSyncing = usePlayspaceAuditStore((state) => state.isSyncing);
    const errorMessage = usePlayspaceAuditStore((state) => state.errorMessage);
    const lastSyncError = usePlayspaceAuditStore((state) => state.lastSyncError);
    const dirtySections = usePlayspaceAuditStore((state) => state.dirtySections);
    const dirtyPreAudit = usePlayspaceAuditStore((state) => state.dirtyPreAudit);
    const syncStateByAuditId = usePlayspaceAuditStore((state) => state.syncStateByAuditId);
    const reopenQueuedSubmit = usePlayspaceAuditStore((state) => state.reopenQueuedSubmit);
    const sessionsByPairKey = usePlayspaceAuditStore((state) => state.sessionsByPairKey);
    const scrollViewRef = useRef<ScrollView | null>(null);

    const placeId = readSingleParam(params.placeId);
    const projectId = readSingleParam(params.projectId);
    const pairKey = placeId === null || projectId === null ? null : getProjectPlaceKey(projectId, placeId);
    const auditSession = pairKey === null ? undefined : sessionsByPairKey[pairKey];
    const instrument = useLocalizedInstrument(auditSession?.instrument);
    const isCurrentAuditUserReady = authSession !== null && currentUserId === authSession.user.id;
    const places = useLocalFirstPlaces();
    const currentPlace = useMemo(() => {
        if (placeId === null) return null;
        return places.find((place) => place.place_id === placeId) ?? null;
    }, [places, placeId]);

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
        if (!isHydrated || !isCurrentAuditUserReady || placeId === null || projectId === null) {
            return;
        }

        ensurePlaceAudit(authSession, projectId, placeId).catch(() => undefined);
    }, [authSession, ensurePlaceAudit, isCurrentAuditUserReady, isHydrated, placeId, projectId]);

    useLayoutEffect(() => {
        navigation.setOptions({
            ...themedHeaderOptions,
            title: t("overview.sections", { ns: "audit" }),
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

    const selectedMode = auditSession?.selected_execution_mode ?? null;
    const requiresSpaceAudit = selectedMode !== null && doesExecutionModeRequireSpaceAudit(selectedMode);
    const spaceSetupQuestions = useMemo(() => {
        if (selectedMode === null || !requiresSpaceAudit) {
            return [];
        }

        return getVisiblePreAuditQuestions(
            instrument!.pre_audit_questions.filter((question) => question.page_key === "space_setup"),
            selectedMode,
        );
    }, [instrument, requiresSpaceAudit, selectedMode]);
    const isSetupFlowComplete =
        auditSession !== undefined &&
        selectedMode !== null &&
        (!requiresSpaceAudit ||
            isRequiredPreAuditComplete(spaceSetupQuestions, getPreAuditValues(auditSession), selectedMode));

    const visibleSections = useMemo(() => {
        if (auditSession === undefined || selectedMode === null) {
            return [];
        }

        return getVisibleSections(
            instrument!,
            selectedMode,
            Object.fromEntries(
                Object.entries(auditSession.sections).map(([sectionKey, sectionState]) => [
                    sectionKey,
                    sectionState.responses,
                ]),
            ),
        );
    }, [auditSession, instrument, selectedMode]);

    const sectionOverviewRows = useMemo<ExecuteOverviewSectionInput[]>(() => {
        if (auditSession === undefined) {
            return [];
        }

        return visibleSections.map((section, index) => {
            const progress = getInstrumentSectionLocalProgress(auditSession, section);
            return {
                sectionKey: section.section_key,
                sectionNumber: index + 1,
                title: section.title,
                answeredCount: progress.answeredQuestionCount,
                totalCount: progress.visibleQuestionCount,
                isComplete: progress.isComplete,
            };
        });
    }, [auditSession, visibleSections]);

    const sectionOverviewSummary = useMemo(() => {
        return buildExecuteOverviewSummary(sectionOverviewRows);
    }, [sectionOverviewRows]);

    const scrollToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({
        contentReady: auditSession !== undefined,
        rerunKey: auditSession?.audit_id ?? placeId ?? "section-overview",
        scrollToOffset,
    });

    if (placeId === null || projectId === null) {
        return (
            <CenteredMessageCard
                title={t("overview.placeNotFoundTitle", { ns: "audit" })}
                message={t("overview.placeNotFound", { ns: "audit" })}
            />
        );
    }

    if (errorMessage !== null && auditSession === undefined) {
        return (
            <CenteredMessageCard
                title={getOverviewErrorTitle(errorMessage, t)}
                message={errorMessage}
                actionLabel={t("actions.retry", { ns: "common" })}
                onAction={() => {
                    if (authSession === null) {
                        return;
                    }
                    ensurePlaceAudit(authSession, projectId, placeId).catch(() => undefined);
                }}
            />
        );
    }

    if (!isHydrated || !isCurrentAuditUserReady || auditSession === undefined) {
        return (
            <CenteredMessageCard
                title={t("overview.preparingAuditTitle", { ns: "audit" })}
                message={
                    isLoadingAudit
                        ? t("overview.loadingDraft", { ns: "audit" })
                        : t("overview.preparingAudit", { ns: "audit" })
                }
            />
        );
    }

    if (selectedMode === null) {
        return (
            <CenteredMessageCard
                title={t("auditInfo.modeMissingTitle", { ns: "audit" })}
                message={t("auditInfo.modeMissingMessage", { ns: "audit" })}
                actionLabel={t("auditInfo.backToPreamble", { ns: "audit" })}
                onAction={() => {
                    router.replace(`/execute/${placeId}?projectId=${encodeURIComponent(projectId)}` as Href);
                }}
            />
        );
    }

    if (!isSetupFlowComplete) {
        const targetRoute = requiresSpaceAudit
            ? `/execute/${placeId}/space-audit?projectId=${encodeURIComponent(projectId)}`
            : `/execute/${placeId}/pre-audit?projectId=${encodeURIComponent(projectId)}`;

        return (
            <CenteredMessageCard
                title={t("overview.setupIncompleteTitle", {
                    ns: "audit",
                    defaultValue: "Finish setup first",
                })}
                message={
                    requiresSpaceAudit
                        ? t("overview.setupIncompleteSpaceAuditMessage", {
                              ns: "audit",
                              defaultValue:
                                  "Complete the required space-audit questions before opening the section overview.",
                          })
                        : t("overview.setupIncompleteAuditInfoMessage", {
                              ns: "audit",
                              defaultValue: "Review the audit details before opening the section overview.",
                          })
                }
                actionLabel={
                    requiresSpaceAudit
                        ? t("spaceAudit.title", { ns: "audit" })
                        : t("auditInfo.backToPreamble", { ns: "audit" })
                }
                onAction={() => {
                    router.replace(targetRoute as Href);
                }}
            />
        );
    }

    const pendingSectionCount = Object.keys(dirtySections[auditSession.audit_id] ?? {}).length;
    const hasPendingPreAudit = dirtyPreAudit[auditSession.audit_id] !== undefined;
    const hasPendingLocalChanges = pendingSectionCount > 0 || hasPendingPreAudit;
    const auditPhase = syncStateByAuditId[auditSession.audit_id]?.phase;
    const firstIncompleteSectionKey = sectionOverviewSummary.firstIncompleteSectionKey;

    const sectionReviewCard = (
        <SectionReviewCard
            summary={sectionOverviewSummary}
            continueLabel={t("copy.resumeNextSection", { ns: "audit" })}
            onOpenSection={(sectionSummary) => {
                router.push(
                    `/execute/${placeId}/section/${sectionSummary.sectionKey}?projectId=${encodeURIComponent(projectId)}` as Href,
                );
            }}
            onResumeFirstIncomplete={
                firstIncompleteSectionKey === null
                    ? null
                    : () => {
                          router.push(
                              `/execute/${placeId}/section/${firstIncompleteSectionKey}?projectId=${encodeURIComponent(projectId)}` as Href,
                          );
                      }
            }
        />
    );

    const setupSummaryCard = <SetupSummaryCard selectedMode={selectedMode} />;

    return (
        <ScrollView
            ref={scrollViewRef}
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 132,
                gap: layout.sectionGap,
                maxWidth: layout.isTablet ? layout.contentMaxWidth : layout.formMaxWidth,
                includeTopPadding: false,
            })}
        >
            <LoggedInAsNotice />
            <YStack gap="$3">
                <XStack items="center" gap="$2">
                    <ClipboardList size={16} color={ds.colors.primary} />
                    <Text
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.2}
                    >
                        {t("overview.sections", { ns: "audit" })}
                    </Text>
                </XStack>
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={layout.isTablet ? ds.typography.displayLg.fontSize : ds.typography.displayMd.fontSize}
                    lineHeight={
                        layout.isTablet ? ds.typography.displayLg.lineHeight : ds.typography.displayMd.lineHeight
                    }
                >
                    {t("overview.sectionOverviewTitle", {
                        ns: "audit",
                        defaultValue: "COPA Tool section overview",
                    })}
                </Text>
                <Paragraph
                    color={ds.colors.secondaryForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                    lineHeight={ds.typography.bodyMd.lineHeight}
                >
                    {t("overview.sectionOverviewSubtitle", {
                        ns: "audit",
                        defaultValue:
                            "Open sections, continue from the first incomplete item, and track progress for this audit.",
                    })}
                </Paragraph>
            </YStack>

            {layout.isTablet ? (
                <XStack gap={layout.twoPaneGap} items="flex-start">
                    <YStack flex={1} gap="$3">
                        {sectionReviewCard}
                    </YStack>
                    <YStack width={layout.supportRailWidth} gap="$3">
                        <AuditSyncStatusCard
                            hasPendingLocalChanges={hasPendingLocalChanges}
                            isSyncing={isSyncing}
                            lastSyncError={lastSyncError}
                            phase={auditPhase}
                            onReopenQueuedSubmit={() => {
                                reopenQueuedSubmit(auditSession.audit_id);
                            }}
                        />
                        {setupSummaryCard}
                        <AuditExportCard auditSession={auditSession} place={currentPlace} />
                    </YStack>
                </XStack>
            ) : (
                <YStack gap="$3">
                    <AuditSyncStatusCard
                        hasPendingLocalChanges={hasPendingLocalChanges}
                        isSyncing={isSyncing}
                        lastSyncError={lastSyncError}
                        phase={auditPhase}
                        onReopenQueuedSubmit={() => {
                            reopenQueuedSubmit(auditSession.audit_id);
                        }}
                    />
                    {setupSummaryCard}
                    {sectionReviewCard}
                    <AuditExportCard auditSession={auditSession} place={currentPlace} />
                </YStack>
            )}
        </ScrollView>
    );
}

interface SectionReviewCardProps {
    readonly summary: ReturnType<typeof buildExecuteOverviewSummary>;
    readonly continueLabel: string;
    readonly onOpenSection: (sectionSummary: ExecuteOverviewSectionInput) => void;
    readonly onResumeFirstIncomplete: (() => void) | null;
}

/**
 * Progress filters and section entry points for the standalone overview page.
 *
 * Layout: a context-aware hint explains the two interaction modes, then the
 * primary "Continue" CTA (only while incomplete sections remain) sits above a
 * labelled divider that introduces the section-jump list. This separation makes
 * the linear-continue path and the non-linear jump path visually distinct so
 * auditors are never confused about which button to tap first.
 */
function SectionReviewCard({
    summary,
    continueLabel,
    onOpenSection,
    onResumeFirstIncomplete,
}: Readonly<SectionReviewCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["audit", "common"]);
    const [sectionFilter, setSectionFilter] = useState<ExecuteOverviewSectionFilter>("all");
    const visibleRows = useMemo(() => {
        return filterExecuteOverviewRows(summary.rows, sectionFilter);
    }, [sectionFilter, summary.rows]);
    const allFilterLabel = `${t("filters.all", { ns: "common" })} (${summary.rows.length.toString()})`;

    const hintText =
        onResumeFirstIncomplete !== null
            ? t("overview.sectionCardHintContinue", { ns: "audit" })
            : t("overview.sectionCardHintAllDone", { ns: "audit" });

    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            {/* Card title + contextual hint explaining the two interaction modes */}
            <YStack gap="$1.5">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={ds.typography.titleLg.fontSize}
                >
                    {t("overview.sections", { ns: "audit" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                    lineHeight={ds.typography.bodySm.lineHeight}
                >
                    {hintText}
                </Paragraph>
            </YStack>

            {/* Primary CTA - only shown while at least one section is incomplete */}
            {onResumeFirstIncomplete !== null ? (
                <Button
                    height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
                    rounded={ds.radii.sm}
                    borderWidth={0}
                    bg={ds.colors.primary}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={onResumeFirstIncomplete}
                >
                    <XStack items="center" gap="$2">
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelLg.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.1}
                        >
                            {continueLabel}
                        </Text>
                        <ArrowRight size={16} color={ds.colors.primaryForeground} />
                    </XStack>
                </Button>
            ) : null}

            {/*
             * Divider that separates the primary "continue" action from the
             * section-jump navigation list. Only rendered when the CTA is
             * present so the divider is never an orphan.
             */}
            {onResumeFirstIncomplete !== null ? (
                <XStack items="center" gap="$2.5">
                    <YStack flex={1} height={1} bg={ds.colors.border} />
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1}
                    >
                        {t("overview.sectionJumpDivider", { ns: "audit" })}
                    </Text>
                    <YStack flex={1} height={1} bg={ds.colors.border} />
                </XStack>
            ) : null}

            {/* Filter chips - always present, filter the section list below */}
            <XStack gap="$2" flexWrap="wrap">
                <SectionReviewMetric
                    label={allFilterLabel}
                    isSelected={sectionFilter === "all"}
                    onPress={() => {
                        setSectionFilter("all");
                    }}
                />
                <SectionReviewMetric
                    label={t("overview.completedCount", {
                        ns: "audit",
                        count: summary.completedCount,
                    })}
                    isSelected={sectionFilter === "complete"}
                    onPress={() => {
                        setSectionFilter("complete");
                    }}
                />
                <SectionReviewMetric
                    label={t("overview.incompleteCount", {
                        ns: "audit",
                        count: summary.incompleteCount,
                    })}
                    isSelected={sectionFilter === "incomplete"}
                    onPress={() => {
                        setSectionFilter("incomplete");
                    }}
                />
            </XStack>

            {/* Section navigation list */}
            {visibleRows.length === 0 ? (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {t("overview.sectionEmpty", { ns: "audit" })}
                </Paragraph>
            ) : (
                <YStack gap="$2.5">
                    {visibleRows.map((sectionSummary) => (
                        <YStack
                            key={sectionSummary.sectionKey}
                            rounded={ds.radii.sm}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.input}
                            p="$3"
                            gap="$2.5"
                        >
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.bodyLg.fontSize}
                                lineHeight={ds.typography.bodyLg.lineHeight}
                            >
                                {`${sectionSummary.sectionNumber}. ${sectionSummary.title}`}
                            </Text>
                            <XStack justify="space-between" items="center">
                                <Paragraph
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.bodySm.fontSize}
                                >
                                    {t("section.answeredCount", {
                                        ns: "audit",
                                        answered: sectionSummary.answeredCount,
                                        total: sectionSummary.totalCount,
                                    })}
                                </Paragraph>
                                <Button
                                    height={layout.isTablet ? 42 : 38}
                                    rounded={ds.radii.sm}
                                    borderWidth={1}
                                    borderColor={ds.colors.border}
                                    bg={ds.colors.surface}
                                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                    onPress={() => {
                                        onOpenSection(sectionSummary);
                                    }}
                                >
                                    <Text
                                        color={ds.colors.foreground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.labelMd.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1}
                                    >
                                        {sectionSummary.isComplete
                                            ? t("section.reviewSection", { ns: "audit" })
                                            : t("section.openSection", { ns: "audit" })}
                                    </Text>
                                </Button>
                            </XStack>
                        </YStack>
                    ))}
                </YStack>
            )}
        </YStack>
    );
}

interface SectionReviewMetricProps {
    readonly label: string;
    readonly isSelected: boolean;
    readonly onPress: () => void;
}

function SectionReviewMetric({ label, isSelected, onPress }: Readonly<SectionReviewMetricProps>) {
    return <FilterChip label={label} isSelected={isSelected} onPress={onPress} />;
}

interface SetupSummaryCardProps {
    readonly selectedMode: ExecutionMode;
}

/**
 * Small setup recap and an escape hatch back to the pre-section flow.
 */
function SetupSummaryCard({ selectedMode }: Readonly<SetupSummaryCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");
    const modeLabel = getSetupCompleteModeLabel(selectedMode);

    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            <YStack gap="$1.5">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                >
                    {t("overview.setupCompleteTitle", {
                        defaultValue: "Setup complete",
                    })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                    lineHeight={ds.typography.bodySm.lineHeight}
                >
                    {t("overview.setupCompleteDescription", {
                        modeLabel,
                        defaultValue: "You are completing {{modeLabel}}.",
                    })}
                </Paragraph>
            </YStack>
        </YStack>
    );
}

function getSetupCompleteModeLabel(mode: ExecutionMode): string {
    switch (mode) {
        case "audit":
            return "Onsite Audit";
        case "survey":
            return "Survey";
        case "both":
            return "On-Site Audit and Survey";
        default:
            return "COPA Tool";
    }
}

interface CenteredMessageCardProps {
    readonly title: string;
    readonly message: string;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
}

function CenteredMessageCard({ title, message, actionLabel, onAction }: Readonly<CenteredMessageCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    return (
        <YStack flex={1} justify="center" px={layout.screenPaddingHorizontal} bg={ds.colors.background}>
            <YStack
                width="100%"
                style={{ maxWidth: layout.formMaxWidth, alignSelf: "center" }}
                rounded={ds.radii.md}
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
                <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                    {message}
                </Paragraph>
                {actionLabel !== undefined && typeof onAction === "function" ? (
                    <Button
                        mt="$2"
                        height={44}
                        rounded={ds.radii.sm}
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

function readSingleParam(value: string | string[] | undefined): string | null {
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim().length > 0) {
        return value[0];
    }
    return null;
}

function getOverviewErrorTitle(errorMessage: string, t: TFunction): string {
    return errorMessage.includes("403")
        ? t("overview.accessDeniedTitle", { ns: "audit" })
        : t("overview.auditUnavailableTitle", { ns: "audit" });
}
