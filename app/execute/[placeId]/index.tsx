import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { type Href, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ArrowRight, ClipboardList, Shapes, TriangleAlert } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, ColorTokens, Paragraph, Text, XStack, YStack } from "tamagui";
import {
    buildExecuteOverviewSummary,
    filterExecuteOverviewRows,
    getExecuteFlowSubject,
    type ExecuteOverviewSectionFilter,
    type ExecuteOverviewSectionInput,
} from "lib/audit/execute-flow";
import { canEditAuditInputs } from "lib/audit/store-sync-core";
import { getInstrumentSectionLocalProgress, getVisibleSections } from "lib/audit/selectors";
import { CollapsibleCard } from "components/ui/collapsible-card";
import { FilterChip } from "components/ui/filter-chip";
import { getScaleAccentColor, getScaleSoftColor, useDesignSystem } from "lib/design-system";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import type { ExecutionMode } from "lib/audit/types";
import { getExecutionModeShortLabel } from "lib/i18n/format";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";
import type { TFunction } from "i18next";

interface RichTextSegment {
    readonly text: string;
    readonly bold: boolean;
}

interface PreambleLine {
    readonly kind: "paragraph" | "ordered" | "bullet";
    readonly marker: string | null;
    readonly text: string;
}

interface ParsedPreambleBlock {
    readonly headingLevel: 2 | 3;
    readonly heading: string | null;
    readonly lines: readonly PreambleLine[] | null;
}

/**
 * Step-one setup screen with the full audit preamble and execution-mode selection.
 */
export default function ExecutePlaceScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const navigation = useNavigation();
    const { t } = useTranslation(["audit", "common"]);
    const instrument = useLocalizedInstrument();
    const params = useLocalSearchParams<{
        placeId?: string | string[];
        projectId?: string | string[];
    }>();
    const authSession = useAuthStore((state) => state.session);
    const hydrate = usePlayspaceAuditStore((state) => state.hydrate);
    const currentUserId = usePlayspaceAuditStore((state) => state.currentUserId);
    const ensurePlaceAudit = usePlayspaceAuditStore((state) => state.ensurePlaceAudit);
    const applyLocalExecutionMode = usePlayspaceAuditStore((state) => state.applyLocalExecutionMode);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const isLoadingAudit = usePlayspaceAuditStore((state) => state.isLoadingAudit);
    const isSyncing = usePlayspaceAuditStore((state) => state.isSyncing);
    const errorMessage = usePlayspaceAuditStore((state) => state.errorMessage);
    const lastSyncError = usePlayspaceAuditStore((state) => state.lastSyncError);
    const dirtySections = usePlayspaceAuditStore((state) => state.dirtySections);
    const dirtyPreAudit = usePlayspaceAuditStore((state) => state.dirtyPreAudit);
    const syncStateByAuditId = usePlayspaceAuditStore((state) => state.syncStateByAuditId);
    const sessionsByPairKey = usePlayspaceAuditStore((state) => state.sessionsByPairKey);
    const scrollViewRef = useRef<ScrollView | null>(null);

    const placeId = readSingleParam(params.placeId);
    const projectId = readSingleParam(params.projectId);
    const pairKey = placeId === null || projectId === null ? null : getProjectPlaceKey(projectId, placeId);
    const auditSession = pairKey === null ? undefined : sessionsByPairKey[pairKey];
    const isCurrentAuditUserReady = authSession !== null && currentUserId === authSession.user.id;

    const themedHeaderOptions = useMemo(
        () => ({
            headerShown: true,
            headerBackButtonMenuEnabled: true,
            headerBackButtonDisplayMode: "generic",
            headerBackVisible: true,
            headerBlurEffect: "light",
            headerStyle: { backgroundColor: ds.colors.surface },
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
            title: t("overview.preparingAuditTitle", { ns: "audit" }),
        });
        if (auditSession !== undefined) {
            const mode = getExecutionModeShortLabel(auditSession.selected_execution_mode, t);
            const suffix = mode.length > 0 ? mode : "";

            navigation.setOptions({
                ...themedHeaderOptions,
                headerTitle: () => (
                    <YStack justify="center" gap="$1.5" mb="$2" mt="$-2">
                        <Text
                            color={ds.colors.primary}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.titleLg.fontSize}
                            lineHeight={ds.typography.titleLg.lineHeight}
                        >
                            {auditSession.place_name}
                        </Text>
                        <Text
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyRegular}
                            fontSize={ds.typography.bodyLg.fontSize}
                            lineHeight={ds.typography.bodyLg.lineHeight}
                        >
                            {suffix}
                        </Text>
                    </YStack>
                ),
            });
        }
    }, [themedHeaderOptions, navigation, auditSession, router, t, ds]);

    const pendingSectionCount =
        auditSession === undefined ? 0 : Object.keys(dirtySections[auditSession.audit_id] ?? {}).length;
    const hasPendingPreAudit = auditSession !== undefined && dirtyPreAudit[auditSession.audit_id] !== undefined;
    const hasPendingLocalChanges = pendingSectionCount > 0 || hasPendingPreAudit;
    const canEditInputs =
        auditSession !== undefined &&
        canEditAuditInputs({
            session: auditSession,
            phase: syncStateByAuditId[auditSession.audit_id]?.phase,
        });
    const preambleBlocks = instrument!.preamble.map(parsePreambleBlock);
    const selectedMode = auditSession?.selected_execution_mode ?? null;
    const visibleSections = useMemo(() => {
        if (auditSession === undefined) {
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
    const flowSubject =
        selectedMode === null ? null : t(`subjects.${getExecuteFlowSubject(selectedMode)}`, { ns: "audit" });
    const firstIncompleteSectionKey = sectionOverviewSummary.firstIncompleteSectionKey;

    const scrollExecutePlaceToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({
        contentReady: auditSession !== undefined,
        rerunKey: auditSession?.audit_id ?? placeId ?? "execute-place",
        scrollToOffset: scrollExecutePlaceToOffset,
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

    const roleCard = (
        <ExecutionModeCard
            selectedMode={selectedMode}
            allowedModes={auditSession.allowed_execution_modes}
            projectName={auditSession.project_name}
            isLoading={isLoadingAudit}
            isEditable={canEditInputs}
            onSelectMode={(mode) => {
                if (pairKey === null) {
                    return;
                }
                applyLocalExecutionMode(pairKey, mode);
            }}
        />
    );

    const continueButton = (
        <Button
            height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
            rounded={ds.radii.sm}
            borderWidth={0}
            bg={selectedMode === null ? ds.colors.mutedSurface : ds.colors.primary}
            disabled={selectedMode === null}
            opacity={selectedMode === null ? 0.6 : 1}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            onPress={() => {
                router.push(`/execute/${placeId}/pre-audit?projectId=${encodeURIComponent(projectId)}` as Href);
            }}
        >
            <XStack items="center" gap="$2">
                <Text
                    color={selectedMode === null ? ds.colors.mutedForeground : ds.colors.primaryForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelLg.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                >
                    {flowSubject === null
                        ? t("setup.continueToAuditInfo", { ns: "audit" })
                        : t("copy.continueToSubjectInfo", {
                              ns: "audit",
                              subject: flowSubject,
                          })}
                </Text>
                <ArrowRight size={16} color={ds.colors.primaryForeground} />
            </XStack>
        </Button>
    );
    const sectionReviewCard =
        selectedMode === null ? null : (
            <SectionReviewCard
                summary={sectionOverviewSummary}
                continueLabel={
                    flowSubject === null
                        ? t("copy.continueToSubject", {
                              ns: "audit",
                              subject: t("subjects.workflow", { ns: "audit" }),
                          })
                        : t("copy.continueToSubject", { ns: "audit", subject: flowSubject })
                }
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

    const viewPlaceDetailsButton = (
        <Button
            height={layout.isTablet ? layout.buttonHeight : 46}
            rounded={ds.radii.sm}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.input}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            onPress={() => {
                router.push(`/place/${placeId}?projectId=${encodeURIComponent(projectId)}`);
            }}
        >
            <XStack items="center" gap="$2">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                >
                    {t("overview.viewPlaceDetails", { ns: "audit" })}
                </Text>
                <ArrowRight size={14} color={ds.colors.foreground} />
            </XStack>
        </Button>
    );

    const supportRail = (
        <YStack width={layout.supportRailWidth} gap="$3">
            <AuditSyncStatusCard
                hasPendingLocalChanges={hasPendingLocalChanges}
                isSyncing={isSyncing}
                lastSyncError={lastSyncError}
            />
            {viewPlaceDetailsButton}
            {roleCard}
            {continueButton}
            {selectedMode === null ? (
                <Paragraph
                    color={ds.colors.warning}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {t("setup.modeRequired", { ns: "audit" })}
                </Paragraph>
            ) : null}
        </YStack>
    );

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
            <YStack gap="$3">
                <XStack items="center" gap="$2">
                    <Shapes size={16} color={ds.colors.primary} />
                    <Text
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.2}
                    >
                        {t("setup.stepEyebrow", { ns: "audit" })}
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
                    {auditSession.place_name}
                </Text>
                <Paragraph
                    color={ds.colors.secondaryForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                    lineHeight={ds.typography.bodyMd.lineHeight}
                >
                    {t("setup.subtitle", { ns: "audit" })}
                </Paragraph>
            </YStack>

            {layout.isTablet ? (
                <XStack gap={layout.twoPaneGap} items="flex-start">
                    <YStack flex={1} gap="$3">
                        <PreamblePanel blocks={preambleBlocks} />
                        {sectionReviewCard}
                    </YStack>
                    {supportRail}
                </XStack>
            ) : (
                <YStack gap="$3">
                    <AuditSyncStatusCard
                        hasPendingLocalChanges={hasPendingLocalChanges}
                        isSyncing={isSyncing}
                        lastSyncError={lastSyncError}
                    />
                    {viewPlaceDetailsButton}
                    <PreamblePanel blocks={preambleBlocks} />

                    {roleCard}
                    {continueButton}
                    {selectedMode === null ? (
                        <Paragraph
                            color={ds.colors.warning}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                        >
                            {t("setup.modeRequired", { ns: "audit" })}
                        </Paragraph>
                    ) : null}
                    {sectionReviewCard}
                </YStack>
            )}
        </ScrollView>
    );
}

interface ExecutionModeCardProps {
    readonly selectedMode: ExecutionMode | null;
    readonly allowedModes: readonly ExecutionMode[];
    readonly projectName: string;
    readonly isLoading: boolean;
    readonly isEditable: boolean;
    readonly onSelectMode: (mode: ExecutionMode) => void;
}

/**
 * Render the execution-mode prompt that now sits at the bottom of the preamble flow.
 */
function ExecutionModeCard({
    selectedMode,
    allowedModes,
    projectName,
    isLoading,
    isEditable,
    onSelectMode,
}: Readonly<ExecutionModeCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");
    const instrument = useLocalizedInstrument();

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
            <XStack items="center" gap="$2">
                <ClipboardList size={16} color={ds.colors.primary} />
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.2}
                >
                    {t("setup.roleTitle")}
                </Text>
                {isLoading ? <ActivityIndicator size="small" color={ds.colors.primary} /> : null}
            </XStack>
            <Paragraph
                color={ds.colors.secondaryForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyMd.fontSize}
                lineHeight={ds.typography.bodyMd.lineHeight}
            >
                {projectName}
            </Paragraph>
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyMd.fontSize}
                lineHeight={ds.typography.bodyMd.lineHeight}
            >
                {t("setup.roleQuestion")}
            </Paragraph>

            <YStack gap="$2.5">
                {instrument!.execution_modes
                    .filter((option) => allowedModes.includes(option.key as ExecutionMode))
                    .map((option) => {
                        const isSelected = selectedMode === option.key;

                        return (
                            <Button
                                key={option.key}
                                minH="$10"
                                height="auto"
                                rounded={ds.radii.sm}
                                disabled={!isEditable || isLoading}
                                borderWidth={isSelected ? 2 : 1}
                                items="center"
                                justify="flex-start"
                                borderColor={isSelected ? ds.colors.primary : ds.colors.border}
                                bg={isSelected ? ds.colors.primarySoft : ds.colors.input}
                                opacity={!isEditable || isLoading ? 0.6 : 1}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    onSelectMode(option.key as ExecutionMode);
                                }}
                            >
                                <XStack py="$3" px="$0" gap="$3.5" flex={1}>
                                    <YStack
                                        width={20}
                                        height={20}
                                        items="center"
                                        justify="center"
                                        rounded={ds.radii.full}
                                        borderWidth={2}
                                        borderColor={isSelected ? ds.colors.primary : ds.colors.border}
                                        bg={isSelected ? ds.colors.primarySoft : ds.colors.surface}
                                        mt="$1"
                                    >
                                        {isSelected ? (
                                            <YStack
                                                width={8}
                                                height={8}
                                                rounded={ds.radii.full}
                                                bg={ds.colors.primary}
                                            />
                                        ) : null}
                                    </YStack>
                                    <YStack flex={1} gap="$2.5">
                                        <Text
                                            color={isSelected ? ds.colors.primary : ds.colors.foreground}
                                            fontFamily={ds.fonts.bodyBold}
                                            fontSize={ds.typography.bodyMd.fontSize}
                                            lineHeight={ds.typography.bodyMd.lineHeight}
                                        >
                                            {option.label}
                                        </Text>
                                        {option.description ? (
                                            <Paragraph
                                                color={ds.colors.mutedForeground}
                                                fontFamily={ds.fonts.bodyMedium}
                                                fontSize={ds.typography.bodySm.fontSize}
                                                lineHeight={ds.typography.bodySm.lineHeight}
                                            >
                                                {option.description}
                                            </Paragraph>
                                        ) : null}
                                    </YStack>
                                </XStack>
                            </Button>
                        );
                    })}
            </YStack>
        </YStack>
    );
}

interface PreamblePanelProps {
    readonly blocks: readonly ParsedPreambleBlock[];
}

interface SectionReviewCardProps {
    readonly summary: ReturnType<typeof buildExecuteOverviewSummary>;
    readonly continueLabel: string;
    readonly onOpenSection: (sectionSummary: ExecuteOverviewSectionInput) => void;
    readonly onResumeFirstIncomplete: (() => void) | null;
}

/**
 * Render the large markdown-like preamble content with headings, lists, and emphasis.
 */
function PreamblePanel({ blocks }: Readonly<PreamblePanelProps>) {
    const { t } = useTranslation("audit");

    return (
        <CollapsibleCard
            title={t("setup.preambleTitle")}
            collapsedHint={t("overview.tapToExpand")}
            defaultExpanded={false}
        >
            <YStack gap="$4">
                {blocks.map((block, index) => (
                    <PreambleBlockCard
                        key={`${block.headingLevel}:${block.heading}-${index.toString()}`}
                        block={block}
                    />
                ))}
            </YStack>
        </CollapsibleCard>
    );
}

/**
 * Review card that gives auditors one place to see section completion and jump
 * directly into the next or selected section.
 *
 * @param props Section review card props.
 * @returns Section review card.
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
                    fontFamily={ds.fonts.headingBold}
                    fontSize={ds.typography.titleLg.fontSize}
                >
                    {t("overview.sections")}
                </Text>
            </YStack>

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

            {onResumeFirstIncomplete === null ? null : (
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
            )}

            {visibleRows.length === 0 ? (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {t("overview.sectionEmpty")}
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
                                            ? t("section.reviewSection")
                                            : t("section.openSection")}
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

/**
 * Small filter chip used by the section review card.
 *
 * @param props Filter label, selected state, and press handler.
 * @returns Styled filter chip.
 */
function SectionReviewMetric({ label, isSelected, onPress }: Readonly<SectionReviewMetricProps>) {
    return <FilterChip label={label} isSelected={isSelected} onPress={onPress} />;
}

interface PreambleBlockCardProps {
    readonly block: ParsedPreambleBlock;
}

/**
 * Render one structured preamble block with level-aware styling.
 */
function PreambleBlockCard({ block }: Readonly<PreambleBlockCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const isScaleBlock = block.headingLevel === 3;

    let scaleKey = "quantity";
    if (isScaleBlock && block.heading) {
        const headingLower = block.heading.toLowerCase();
        if (headingLower.includes("diversity")) {
            scaleKey = "diversity";
        } else if (headingLower.includes("challenge")) {
            scaleKey = "challenge";
        } else if (headingLower.includes("sociability")) {
            scaleKey = "sociability";
        }
    }

    const blockColor = isScaleBlock ? getScaleAccentColor(scaleKey, ds.colors) : ds.colors.border;
    const blockSoftColor = isScaleBlock ? getScaleSoftColor(scaleKey, ds.colors) : ds.colors.surfaceMuted;
    const headingColor = isScaleBlock ? getScaleAccentColor(scaleKey, ds.colors) : ds.colors.foreground;

    return (
        <YStack
            rounded={ds.radii.sm}
            borderWidth={1}
            borderColor={blockColor}
            bg={blockSoftColor}
            px={layout.cardPadding}
            py={layout.isTablet ? "$4" : "$3.5"}
            gap="$2.5"
        >
            {block.heading ? (
                <Text
                    color={headingColor as ColorTokens}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={isScaleBlock ? ds.typography.titleMd.fontSize : ds.typography.titleLg.fontSize}
                    lineHeight={isScaleBlock ? ds.typography.titleMd.lineHeight : ds.typography.titleLg.lineHeight}
                >
                    {block.heading}
                </Text>
            ) : null}
            {block.lines?.map((line, index) => {
                if (line.kind === "paragraph") {
                    return (
                        <RichTextLine
                            key={`${block.heading}-line-${index.toString()}`}
                            text={line.text}
                            color={ds.colors.secondaryForeground as ColorTokens}
                        />
                    );
                }

                return (
                    <XStack key={`${block.heading}-line-${index.toString()}`} gap="$2" items="flex-start">
                        <Text
                            color={headingColor as ColorTokens}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodySm.fontSize}
                            lineHeight={ds.typography.bodyMd.lineHeight}
                        >
                            {line.marker ?? (line.kind === "ordered" ? "1." : "•")}
                        </Text>
                        <YStack flex={1}>
                            <RichTextLine text={line.text} color={ds.colors.secondaryForeground as ColorTokens} />
                        </YStack>
                    </XStack>
                );
            })}
        </YStack>
    );
}

interface RichTextLineProps {
    readonly text: string;
    readonly color: ColorTokens;
}

/**
 * Render inline bold markers inside one paragraph-like text line.
 */
function RichTextLine({ text, color }: Readonly<RichTextLineProps>) {
    const ds = useDesignSystem();
    const segments = parsePromptSegments(text);

    return (
        <Paragraph
            color={color as ColorTokens}
            fontFamily={ds.fonts.bodyMedium}
            fontSize={ds.typography.bodyMd.fontSize}
            lineHeight={ds.typography.bodyMd.lineHeight}
        >
            {segments.map((segment, index) => (
                <Text
                    key={`${segment.text}-${index.toString()}`}
                    color={segment.bold ? ds.colors.foreground : (color as ColorTokens)}
                    fontFamily={segment.bold ? ds.fonts.bodyBold : ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {segment.text}
                </Text>
            ))}
        </Paragraph>
    );
}

/**
 * Parse `**bold**` markers into a renderable segment list.
 *
 * @param raw Raw line content containing optional bold markers.
 * @returns Ordered text segments with bold flags.
 */
function parsePromptSegments(raw: string): RichTextSegment[] {
    const segments: RichTextSegment[] = [];
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
 * Parse the markdown-like preamble lines stored in the instrument payload.
 *
 * @param lines Raw lines from the instrument.
 * @returns Parsed lines with kind and marker.
 */
function parsePreambleLines(lines: string[]): PreambleLine[] {
    const parsedLines: PreambleLine[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) {
            continue;
        }

        const orderedMatch = trimmedLine.match(/^(\d+\.)\s+(.*)$/);
        if (orderedMatch !== null) {
            parsedLines.push({
                kind: "ordered",
                marker: orderedMatch[1] ?? null,
                text: orderedMatch[2] ?? "",
            });
            continue;
        }

        const bulletMatch = trimmedLine.match(/^-\s+(.*)$/);
        if (bulletMatch !== null) {
            parsedLines.push({
                kind: "bullet",
                marker: "•",
                text: bulletMatch[1] ?? "",
            });
            continue;
        }

        parsedLines.push({
            kind: "paragraph",
            marker: null,
            text: trimmedLine,
        });
    }

    return parsedLines;
}

/**
 * Parse the markdown-like preamble blocks stored in the instrument payload.
 *
 * @param rawBlock Raw block content from the instrument.
 * @returns Heading metadata plus body lines.
 */
function parsePreambleBlock(rawBlock: string): ParsedPreambleBlock {
    const lines = rawBlock.split("\n");
    const firstLine = lines[0]?.trim() ?? "";
    if (!firstLine.startsWith("#")) {
        return {
            headingLevel: 2,
            heading: null,
            lines: parsePreambleLines(lines),
        };
    }
    const headingLine = lines.shift() ?? "";
    const headingLevel = headingLine.startsWith("### ") ? 3 : 2;
    const heading = headingLine.replace(/^###\s+/, "").replace(/^##\s+/, "");
    const parsedLines = parsePreambleLines(lines);
    return {
        headingLevel,
        heading,
        lines: parsedLines,
    };
}

interface AuditSyncStatusCardProps {
    readonly hasPendingLocalChanges: boolean;
    readonly isSyncing: boolean;
    readonly lastSyncError: string | null;
}

/**
 * Compact sync-state card so auditors can tell whether their draft is queued,
 * uploading, or blocked on-device.
 *
 * @param props Sync-state presentation props.
 * @returns Status card or null when there is nothing noteworthy to show.
 */
function AuditSyncStatusCard({ hasPendingLocalChanges, isSyncing, lastSyncError }: Readonly<AuditSyncStatusCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");
    const hasSyncFailure = lastSyncError !== null;
    const shouldShowCard = hasPendingLocalChanges || hasSyncFailure;

    if (!shouldShowCard) {
        return null;
    }

    const tone = isSyncing ? ds.colors.primary : hasSyncFailure ? ds.colors.danger : ds.colors.mutedForeground;
    const cardBackgroundColor = isSyncing
        ? ds.colors.primarySoft
        : hasSyncFailure
          ? ds.colors.dangerSoft
          : ds.colors.surfaceMuted;
    const title = isSyncing
        ? t("overview.syncStatus.syncingTitle")
        : hasSyncFailure
          ? t("overview.syncStatus.retryTitle")
          : t("overview.syncStatus.pendingTitle");
    const message = isSyncing
        ? t("overview.syncStatus.syncingMessage")
        : hasSyncFailure
          ? (lastSyncError ?? "")
          : t("overview.syncStatus.pendingMessage");

    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={tone}
            bg={cardBackgroundColor}
            p={layout.cardPadding}
            gap="$2.5"
            style={{ boxShadow: ds.shadows.card }}
        >
            <XStack items="center" gap="$2">
                {hasSyncFailure ? <TriangleAlert size={18} color={tone} /> : null}
                <Text
                    color={tone}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                >
                    {title}
                </Text>
            </XStack>
            <Paragraph
                color={ds.colors.secondaryForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyMd.fontSize}
                lineHeight={ds.typography.bodyMd.lineHeight}
            >
                {message}
            </Paragraph>
        </YStack>
    );
}

interface CenteredMessageCardProps {
    readonly title: string;
    readonly message: string;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
}

/**
 * Compact centered placeholder for loading and invalid-route states.
 *
 * @param props Message card props.
 * @returns Full-screen centered message card.
 */
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

/**
 * Read one string route parameter from `useLocalSearchParams`.
 *
 * @param value Raw route parameter.
 * @returns The first string value or null.
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
 * Resolve the correct overview error card title from the current error payload.
 *
 * @param errorMessage Error message shown to the user.
 * @param t Translation function.
 * @returns Localized error title for the overview screen.
 */
export function getOverviewErrorTitle(errorMessage: string, t: TFunction): string {
    return errorMessage.includes("403")
        ? t("overview.accessDeniedTitle", { ns: "audit" })
        : t("overview.auditUnavailableTitle", { ns: "audit" });
}
