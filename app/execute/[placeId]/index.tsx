import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { type Href, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { ArrowRight, ClipboardList, Shapes, TriangleAlert } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Button, type ColorTokens, Paragraph, Text, XStack, YStack } from "tamagui";
import { doesExecutionModeRequireSpaceAudit, getExecuteFlowSubject } from "lib/audit/execute-flow";
import { canEditAuditInputs } from "lib/audit/store-sync-core";
import { getPreAuditValues, getVisiblePreAuditQuestions, isRequiredPreAuditComplete } from "lib/audit/selectors";
import { AuditHeaderTitle } from "components/ui/audit-header-title";
import { CollapsibleCard } from "components/ui/collapsible-card";
import { AuditExportCard } from "components/playspace-audit/audit-export-card";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
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
            title: t("overview.preparingAuditTitle", { ns: "audit" }),
        });
        if (auditSession !== undefined) {
            const mode = getExecutionModeShortLabel(auditSession.selected_execution_mode, t);
            const suffix = mode.length > 0 ? mode : undefined;

            navigation.setOptions({
                ...themedHeaderOptions,
                headerTitle: () => <AuditHeaderTitle primary={auditSession.place_name} secondary={suffix} />,
            });
        }
    }, [themedHeaderOptions, navigation, auditSession, router, t]);

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
    const flowSubject =
        selectedMode === null ? null : t(`subjects.${getExecuteFlowSubject(selectedMode)}`, { ns: "audit" });

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
            instrument={instrument}
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
    const sectionOverviewButton = isSetupFlowComplete ? (
        <Button
            height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
            rounded={ds.radii.sm}
            borderWidth={1}
            borderColor={ds.colors.primary}
            bg={ds.colors.primarySoft}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            onPress={() => {
                router.push(`/execute/${placeId}/overview?projectId=${encodeURIComponent(projectId)}` as Href);
            }}
        >
            <XStack items="center" gap="$2">
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelLg.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                >
                    {t("setup.skipToSectionOverview", {
                        ns: "audit",
                        defaultValue: "Skip to section overview",
                    })}
                </Text>
                <ArrowRight size={16} color={ds.colors.primary} />
            </XStack>
        </Button>
    ) : null;

    const viewPlaceDetailsButton = (
        <Button
            height={layout.isTablet ? layout.buttonHeight : 46}
            rounded={ds.radii.sm}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.input}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            onPress={() => {
                router.push(`/place/${placeId}?projectId=${encodeURIComponent(projectId)}` as Href);
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
            {sectionOverviewButton}
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
                        <SetupFlowHintCard
                            requiresSpaceAudit={requiresSpaceAudit}
                            isSetupFlowComplete={isSetupFlowComplete}
                        />
                        <AuditExportCard auditSession={auditSession} place={currentPlace} />
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
                    {sectionOverviewButton}
                    {selectedMode === null ? (
                        <Paragraph
                            color={ds.colors.warning}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                        >
                            {t("setup.modeRequired", { ns: "audit" })}
                        </Paragraph>
                    ) : null}
                    <SetupFlowHintCard
                        requiresSpaceAudit={requiresSpaceAudit}
                        isSetupFlowComplete={isSetupFlowComplete}
                    />
                    <AuditExportCard auditSession={auditSession} place={currentPlace} />
                </YStack>
            )}
        </ScrollView>
    );
}

interface SetupFlowHintCardProps {
    readonly requiresSpaceAudit: boolean;
    readonly isSetupFlowComplete: boolean;
}

/**
 * Explain why the section list is not shown on the setup page.
 */
function SetupFlowHintCard({ requiresSpaceAudit, isSetupFlowComplete }: Readonly<SetupFlowHintCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");

    if (isSetupFlowComplete) {
        return null;
    }

    return (
        <YStack
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surfaceMuted}
            p={layout.cardPadding}
            gap="$2"
        >
            <Text color={ds.colors.foreground} fontFamily={ds.fonts.bodyBold} fontSize={ds.typography.titleMd.fontSize}>
                {t("setup.sectionsLockedTitle", {
                    defaultValue: "Sections unlock after setup",
                })}
            </Text>
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyMd.fontSize}
                lineHeight={ds.typography.bodyMd.lineHeight}
            >
                {requiresSpaceAudit
                    ? t("setup.sectionsLockedWithSpaceAudit", {
                          defaultValue:
                              "Complete the audit details and required space-audit questions before opening the section overview.",
                      })
                    : t("setup.sectionsLockedWithoutSpaceAudit", {
                          defaultValue: "Complete the audit details before opening the section overview.",
                      })}
            </Paragraph>
        </YStack>
    );
}

interface ExecutionModeCardProps {
    readonly instrument: ReturnType<typeof useLocalizedInstrument>;
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
    instrument,
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

    let scaleKey = "provision";
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
            borderColor={blockColor as ColorTokens}
            bg={blockSoftColor as ColorTokens}
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
