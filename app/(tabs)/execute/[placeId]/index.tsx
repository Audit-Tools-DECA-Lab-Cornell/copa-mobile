import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import {
    ArrowRight,
    CircleCheckBig,
    ClipboardList,
    Shapes,
    TriangleAlert,
} from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { CollapsibleCard } from "components/ui/collapsible-card";
import { FilterChip } from "components/ui/filter-chip";
import { useDesignSystem } from "lib/design-system";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import { getInstrumentSectionLocalProgress, getVisibleSections } from "lib/audit/selectors";
import { useNetworkOnline } from "lib/audit/use-network-online";
import type { ExecutionMode } from "lib/audit/types";
import { getExecutionModeShortLabel } from "lib/i18n/format";
import { getExecuteSidebarTopPadding } from "lib/ipad-polish";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";
import type { TFunction } from "i18next";

type SectionVisibilityFilter = "all" | "incomplete" | "complete";

/**
 * Place-scoped execute overview with preamble, mode selection, and section routing.
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
    const submitAuditSession = usePlayspaceAuditStore((state) => state.submitAuditSession);
    const isHydrated = usePlayspaceAuditStore((state) => state.isHydrated);
    const isLoadingAudit = usePlayspaceAuditStore((state) => state.isLoadingAudit);
    const isSavingDraft = usePlayspaceAuditStore((state) => state.isSavingDraft);
    const isSyncing = usePlayspaceAuditStore((state) => state.isSyncing);
    const errorMessage = usePlayspaceAuditStore((state) => state.errorMessage);
    const lastSyncError = usePlayspaceAuditStore((state) => state.lastSyncError);
    const dirtySections = usePlayspaceAuditStore((state) => state.dirtySections);
    const dirtyPreAudit = usePlayspaceAuditStore((state) => state.dirtyPreAudit);
    const sessionsByPairKey = usePlayspaceAuditStore((state) => state.sessionsByPairKey);
    const [sectionFilter, setSectionFilter] = useState<SectionVisibilityFilter>("incomplete");
    const isNetworkOnline = useNetworkOnline();
    const scrollViewRef = useRef<ScrollView | null>(null);

    const placeId = readSingleParam(params.placeId);
    const projectId = readSingleParam(params.projectId);
    const pairKey =
        placeId === null || projectId === null ? null : getProjectPlaceKey(projectId, placeId);
    const auditSession = pairKey === null ? undefined : sessionsByPairKey[pairKey];
    const isCurrentAuditUserReady = authSession !== null && currentUserId === authSession.user.id;

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
        if (auditSession !== undefined) {
            const mode = getExecutionModeShortLabel(auditSession.selected_execution_mode, t);
            const suffix = mode.length > 0 ? ` — ${mode}` : "";
            navigation.setOptions({ title: `${auditSession.place_name}${suffix}` });
        }
    }, [navigation, auditSession, t]);

    const placeLocality = getPlaceLocality(auditSession, t);

    const visibleSections = useMemo(() => {
        if (auditSession === undefined) {
            return [];
        }
        return getVisibleSections(instrument, auditSession.selected_execution_mode);
    }, [auditSession, instrument]);
    const sectionRows = useMemo(() => {
        if (auditSession === undefined) {
            return [];
        }

        const rows = visibleSections.map((section) => {
            const serverSectionProgress = auditSession.progress.sections.find((entry) => {
                return entry.section_key === section.section_key;
            });
            const localProgress = getInstrumentSectionLocalProgress(auditSession, section);
            const isComplete =
                localProgress.isComplete === true || serverSectionProgress?.is_complete === true;
            const isSectionDirty =
                dirtySections[auditSession.audit_id]?.[section.section_key] !== undefined;
            const showOnlineUploadHint = isNetworkOnline && isSectionDirty && isComplete === true;
            return {
                section,
                localProgress,
                isComplete,
                showOnlineUploadHint,
            };
        });

        const filteredRows = rows.filter((row) => {
            if (sectionFilter === "complete") {
                return row.isComplete;
            }
            if (sectionFilter === "incomplete") {
                return !row.isComplete;
            }
            return true;
        });

        return filteredRows.sort((leftRow, rightRow) => {
            if (leftRow.isComplete !== rightRow.isComplete) {
                return leftRow.isComplete ? 1 : -1;
            }
            return leftRow.section.title.localeCompare(rightRow.section.title);
        });
    }, [auditSession, dirtySections, isNetworkOnline, sectionFilter, visibleSections]);
    const pendingSectionCount =
        auditSession === undefined
            ? 0
            : Object.keys(dirtySections[auditSession.audit_id] ?? {}).length;
    const hasPendingPreAudit =
        auditSession !== undefined && dirtyPreAudit[auditSession.audit_id] !== undefined;
    const hasPendingLocalChanges = pendingSectionCount > 0 || hasPendingPreAudit;
    const shouldShowSyncStatusCard = hasPendingLocalChanges || lastSyncError !== null;
    const executeSidebarTopPadding = getExecuteSidebarTopPadding(shouldShowSyncStatusCard);

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

    const viewPlaceDetailsButton = (
        <Button
            height={layout.isTablet ? layout.buttonHeight : 46}
            rounded={ds.radii.md}
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

    const preambleCard = (
        <CollapsibleCard
            title={t("overview.preamble", { ns: "audit" })}
            collapsedHint={t("overview.tapToExpand", { ns: "audit" })}
            icon={<Shapes size={16} color={ds.colors.primary} />}
        >
            <YStack gap="$3">
                {instrument.preamble.map((paragraph) => {
                    return (
                        <Paragraph
                            key={paragraph}
                            color={ds.colors.secondaryForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyMd.fontSize}
                        >
                            {paragraph}
                        </Paragraph>
                    );
                })}
            </YStack>
        </CollapsibleCard>
    );

    const auditRoleCard = (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{
                boxShadow: ds.shadows.card,
            }}
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
                    {t("overview.auditRole", { ns: "audit" })}
                </Text>
            </XStack>
            <Paragraph
                color={ds.colors.secondaryForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyMd.fontSize}
                lineHeight={ds.typography.bodyMd.lineHeight}
            >
                {`Project ${auditSession.project_name}`}
            </Paragraph>

            <YStack gap="$2.5">
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                    lineHeight={ds.typography.bodyMd.lineHeight}
                >
                    {t("overview.chooseMode", { ns: "audit" })}
                </Paragraph>
                {instrument.execution_modes
                    .filter((option) => {
                        return auditSession.allowed_execution_modes.includes(
                            option.key as ExecutionMode,
                        );
                    })
                    .map((option) => {
                        const isSelected = auditSession.selected_execution_mode === option.key;

                        return (
                            <Button
                                key={option.key}
                                height={layout.isTablet ? "auto" : "$space.15"}
                                rounded={ds.radii.md}
                                borderWidth={isSelected ? 2 : 1}
                                items="flex-start"
                                justify="flex-start"
                                borderColor={isSelected ? ds.colors.primary : ds.colors.border}
                                bg={isSelected ? ds.colors.primarySoft : ds.colors.input}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    if (authSession === null) {
                                        return;
                                    }
                                    ensurePlaceAudit(
                                        authSession,
                                        projectId,
                                        placeId,
                                        option.key as ExecutionMode,
                                    ).catch(() => {});
                                }}
                            >
                                <XStack justify="center" py="$4" px="$2" gap="$2" flex={1}>
                                    <YStack
                                        width={20}
                                        height={20}
                                        items="center"
                                        justify="center"
                                        rounded={ds.radii.full}
                                        borderWidth={2}
                                        borderColor={
                                            isSelected ? ds.colors.primary : ds.colors.border
                                        }
                                        bg={isSelected ? ds.colors.primarySoft : ds.colors.surface}
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
                                    <YStack justify="center" gap="$2.5">
                                        <Text
                                            color={
                                                isSelected
                                                    ? ds.colors.primary
                                                    : ds.colors.foreground
                                            }
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
                                                fontSize={ds.typography.bodyXs.fontSize}
                                                lineHeight={ds.typography.bodyXs.lineHeight}
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

    const preAuditCard = (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{
                boxShadow: ds.shadows.card,
            }}
        >
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.titleMd.fontSize}
            >
                {t("preAudit.title", { ns: "audit" })}
            </Text>
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyMd.fontSize}
                lineHeight={ds.typography.bodyMd.lineHeight}
            >
                {t("preAudit.description", { ns: "audit" })}
            </Paragraph>
            <Text
                color={
                    auditSession.progress.required_pre_audit_complete
                        ? ds.colors.success
                        : ds.colors.warning
                }
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelMd.fontSize}
                textTransform="uppercase"
                letterSpacing={1.1}
            >
                {auditSession.progress.required_pre_audit_complete
                    ? t("preAudit.complete", { ns: "audit" })
                    : t("preAudit.needed", { ns: "audit" })}
            </Text>
            <Button
                height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
                rounded={ds.radii.md}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.input}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
                    router.push(
                        `/(tabs)/execute/${placeId}/pre-audit?projectId=${encodeURIComponent(projectId)}`,
                    );
                }}
            >
                <XStack items="center" gap="$2">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelLg.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.2}
                    >
                        {t("preAudit.openPage", { ns: "audit" })}
                    </Text>
                    <ArrowRight size={16} color={ds.colors.foreground} />
                </XStack>
            </Button>
        </YStack>
    );

    const sectionsContent = (
        <YStack gap="$3">
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.titleMd.fontSize}
            >
                {t("overview.sections", { ns: "audit" })}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack gap="$2">
                    <FilterChip
                        label={t("filters.incomplete", { ns: "common" })}
                        isSelected={sectionFilter === "incomplete"}
                        onPress={() => {
                            setSectionFilter("incomplete");
                        }}
                    />
                    <FilterChip
                        label={t("filters.all", { ns: "common" })}
                        isSelected={sectionFilter === "all"}
                        onPress={() => {
                            setSectionFilter("all");
                        }}
                    />
                    <FilterChip
                        label={t("filters.complete", { ns: "common" })}
                        isSelected={sectionFilter === "complete"}
                        onPress={() => {
                            setSectionFilter("complete");
                        }}
                    />
                </XStack>
            </ScrollView>

            {sectionRows.length === 0 ? (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {t("overview.sectionEmpty", { ns: "audit" })}
                </Paragraph>
            ) : (
                sectionRows.map(({ section, localProgress, isComplete, showOnlineUploadHint }) => {
                    return (
                        <YStack
                            key={section.section_key}
                            rounded={ds.radii.lg}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.surface}
                            p={layout.cardPadding}
                            gap="$3"
                            style={{
                                minHeight: layout.isTablet ? layout.queueCardMinHeight : undefined,
                                boxShadow: ds.shadows.card,
                            }}
                        >
                            <XStack justify="space-between" items="flex-start" gap="$3">
                                <YStack flex={1} gap="$1.5">
                                    <Text
                                        color={ds.colors.foreground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.titleMd.fontSize}
                                    >
                                        {section.title}
                                    </Text>
                                    <Paragraph
                                        color={ds.colors.mutedForeground}
                                        fontFamily={ds.fonts.bodyMedium}
                                        fontSize={ds.typography.bodySm.fontSize}
                                    >
                                        {t("section.answeredCount", {
                                            ns: "audit",
                                            answered: localProgress.answeredQuestionCount,
                                            total: localProgress.visibleQuestionCount,
                                        })}
                                    </Paragraph>
                                </YStack>
                                <XStack items="center" gap="$2" style={{ flexShrink: 0 }}>
                                    {isComplete ? (
                                        <CircleCheckBig size={18} color={ds.colors.success} />
                                    ) : null}
                                    {showOnlineUploadHint ? (
                                        <XStack items="center" gap="$1.5">
                                            <ActivityIndicator
                                                size="small"
                                                color={ds.colors.primary}
                                            />
                                            <Text
                                                color={ds.colors.primary}
                                                fontFamily={ds.fonts.bodyBold}
                                                fontSize={ds.typography.labelXs.fontSize}
                                                textTransform="uppercase"
                                                letterSpacing={0.8}
                                            >
                                                {t("section.uploadingShort", { ns: "audit" })}
                                            </Text>
                                        </XStack>
                                    ) : null}
                                </XStack>
                            </XStack>
                            <Button
                                height={layout.isTablet ? layout.buttonHeight : 46}
                                rounded={ds.radii.md}
                                borderWidth={1}
                                borderColor={isComplete ? ds.colors.success : ds.colors.border}
                                bg={isComplete ? ds.colors.successSoft : ds.colors.input}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    router.push(
                                        `/(tabs)/execute/${placeId}/section/${section.section_key}?projectId=${encodeURIComponent(projectId)}`,
                                    );
                                }}
                            >
                                <Text
                                    color={isComplete ? ds.colors.success : ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelLg.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.2}
                                >
                                    {isComplete
                                        ? t("section.reviewSection", { ns: "audit" })
                                        : t("section.openSection", { ns: "audit" })}
                                </Text>
                            </Button>
                        </YStack>
                    );
                })
            )}
        </YStack>
    );

    const submitButton = auditSession.progress.ready_to_submit ? (
        <Button
            height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
            rounded={ds.radii.md}
            borderWidth={0}
            bg={ds.colors.primary}
            disabled={isSavingDraft || isSyncing}
            opacity={isSavingDraft || isSyncing ? 0.7 : 1}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            onPress={() => {
                if (authSession === null) {
                    return;
                }
                submitAuditSession(authSession, auditSession.audit_id).catch(() => undefined);
            }}
        >
            <Text
                color={ds.colors.primaryForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelLg.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {t("submit", { ns: "audit" })}
            </Text>
        </Button>
    ) : null;

    const errorText =
        errorMessage === null ? null : (
            <Paragraph color={ds.colors.warning} fontFamily={ds.fonts.bodyMedium}>
                {errorMessage}
            </Paragraph>
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
                    {auditSession.place_name}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyLg.fontSize}
                    textTransform="capitalize"
                >
                    {placeLocality}
                </Paragraph>
            </YStack>

            {layout.isTablet ? (
                <YStack gap="$3">
                    {preambleCard}
                    <XStack gap={layout.twoPaneGap} items="flex-start">
                        <YStack flex={1} gap="$3">
                            {sectionsContent}
                        </YStack>
                        <YStack
                            width={layout.supportRailWidth}
                            gap="$3"
                            style={{ paddingTop: executeSidebarTopPadding }}
                        >
                            <AuditSyncStatusCard
                                hasPendingLocalChanges={hasPendingLocalChanges}
                                isSyncing={isSyncing}
                                lastSyncError={lastSyncError}
                            />
                            {viewPlaceDetailsButton}
                            {auditRoleCard}
                            {preAuditCard}
                            {submitButton}
                            {errorText}
                        </YStack>
                    </XStack>
                </YStack>
            ) : (
                <>
                    <AuditSyncStatusCard
                        hasPendingLocalChanges={hasPendingLocalChanges}
                        isSyncing={isSyncing}
                        lastSyncError={lastSyncError}
                    />

                    <Button
                        height={layout.isTablet ? 50 : 46}
                        rounded={ds.radii.md}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.input}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={() => {
                            router.push(
                                `/place/${placeId}?projectId=${encodeURIComponent(projectId)}`,
                            );
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

                    <CollapsibleCard
                        title={t("overview.preamble", { ns: "audit" })}
                        icon={<Shapes size={16} color={ds.colors.primary} />}
                    >
                        <YStack gap="$3">
                            {instrument.preamble.map((paragraph) => {
                                return (
                                    <Paragraph
                                        key={paragraph}
                                        color={ds.colors.secondaryForeground}
                                        fontFamily={ds.fonts.bodyMedium}
                                        fontSize={ds.typography.bodyMd.fontSize}
                                    >
                                        {paragraph}
                                    </Paragraph>
                                );
                            })}
                        </YStack>
                    </CollapsibleCard>

                    <YStack
                        rounded={ds.radii.lg}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.surface}
                        p={layout.cardPadding}
                        gap="$3"
                        style={{
                            boxShadow: ds.shadows.card,
                        }}
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
                                {t("overview.auditRole", { ns: "audit" })}
                            </Text>
                        </XStack>
                        <Paragraph
                            color={ds.colors.secondaryForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyMd.fontSize}
                            lineHeight={ds.typography.bodyMd.lineHeight}
                        >
                            {`Project ${auditSession.project_name}`}
                        </Paragraph>

                        <YStack gap="$2.5">
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodyMd.fontSize}
                                lineHeight={ds.typography.bodyMd.lineHeight}
                            >
                                {t("overview.chooseMode", { ns: "audit" })}
                            </Paragraph>
                            {instrument.execution_modes
                                .filter((option) => {
                                    return auditSession.allowed_execution_modes.includes(
                                        option.key as ExecutionMode,
                                    );
                                })
                                .map((option) => {
                                    const isSelected =
                                        auditSession.selected_execution_mode === option.key;

                                    return (
                                        <Button
                                            key={option.key}
                                            height={
                                                layout.isTablet
                                                    ? layout.heroCardMinHeight / 2
                                                    : "$space.15"
                                            }
                                            rounded={ds.radii.md}
                                            borderWidth={isSelected ? 2 : 1}
                                            flex={1}
                                            justify="flex-start"
                                            borderColor={
                                                isSelected ? ds.colors.primary : ds.colors.border
                                            }
                                            bg={
                                                isSelected ? ds.colors.primarySoft : ds.colors.input
                                            }
                                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                            onPress={() => {
                                                if (authSession === null) {
                                                    return;
                                                }
                                                ensurePlaceAudit(
                                                    authSession,
                                                    projectId,
                                                    placeId,
                                                    option.key as ExecutionMode,
                                                ).catch(() => {});
                                            }}
                                        >
                                            <XStack
                                                justify="center"
                                                py="$4"
                                                px="$2"
                                                gap="$2"
                                                flex={1}
                                            >
                                                <YStack
                                                    width={20}
                                                    height={20}
                                                    items="center"
                                                    justify="center"
                                                    rounded={ds.radii.full}
                                                    borderWidth={2}
                                                    borderColor={
                                                        isSelected
                                                            ? ds.colors.primary
                                                            : ds.colors.border
                                                    }
                                                    bg={
                                                        isSelected
                                                            ? ds.colors.primarySoft
                                                            : ds.colors.surface
                                                    }
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
                                                <YStack justify="center" gap="$2.5">
                                                    <Text
                                                        color={
                                                            isSelected
                                                                ? ds.colors.primary
                                                                : ds.colors.foreground
                                                        }
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
                                                            fontSize={ds.typography.bodyXs.fontSize}
                                                            lineHeight={
                                                                ds.typography.bodyXs.lineHeight
                                                            }
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

                    <YStack
                        rounded={ds.radii.lg}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.surface}
                        p={layout.cardPadding}
                        gap="$3"
                        style={{
                            boxShadow: ds.shadows.card,
                        }}
                    >
                        <XStack items="center" justify="space-between">
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.titleMd.fontSize}
                            >
                                {t("preAudit.title", { ns: "audit" })}
                            </Text>
                            <Text
                                color={
                                    auditSession.progress.required_pre_audit_complete
                                        ? ds.colors.success
                                        : ds.colors.warning
                                }
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelMd.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.1}
                            >
                                {auditSession.progress.required_pre_audit_complete
                                    ? t("preAudit.complete", { ns: "audit" })
                                    : t("preAudit.needed", { ns: "audit" })}
                            </Text>
                        </XStack>
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyMd.fontSize}
                            lineHeight={ds.typography.bodyMd.lineHeight}
                        >
                            {t("preAudit.description", { ns: "audit" })}
                        </Paragraph>
                        <Button
                            height={layout.controlHeight}
                            rounded={ds.radii.md}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.input}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={() => {
                                router.push(
                                    `/(tabs)/execute/${placeId}/pre-audit?projectId=${encodeURIComponent(projectId)}`,
                                );
                            }}
                        >
                            <XStack items="center" gap="$2">
                                <Text
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelLg.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.2}
                                >
                                    {t("preAudit.openPage", { ns: "audit" })}
                                </Text>
                                <ArrowRight size={16} color={ds.colors.foreground} />
                            </XStack>
                        </Button>
                    </YStack>

                    <YStack gap="$3">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.titleMd.fontSize}
                        >
                            {t("overview.sections", { ns: "audit" })}
                        </Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <XStack gap="$2">
                                <FilterChip
                                    label={t("filters.incomplete", { ns: "common" })}
                                    isSelected={sectionFilter === "incomplete"}
                                    onPress={() => {
                                        setSectionFilter("incomplete");
                                    }}
                                />
                                <FilterChip
                                    label={t("filters.all", { ns: "common" })}
                                    isSelected={sectionFilter === "all"}
                                    onPress={() => {
                                        setSectionFilter("all");
                                    }}
                                />
                                <FilterChip
                                    label={t("filters.complete", { ns: "common" })}
                                    isSelected={sectionFilter === "complete"}
                                    onPress={() => {
                                        setSectionFilter("complete");
                                    }}
                                />
                            </XStack>
                        </ScrollView>

                        {sectionRows.length === 0 ? (
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodyMd.fontSize}
                            >
                                {t("overview.sectionEmpty", { ns: "audit" })}
                            </Paragraph>
                        ) : (
                            sectionRows.map(
                                ({ section, localProgress, isComplete, showOnlineUploadHint }) => {
                                    return (
                                        <YStack
                                            key={section.section_key}
                                            rounded={ds.radii.lg}
                                            borderWidth={1}
                                            borderColor={ds.colors.border}
                                            bg={ds.colors.surface}
                                            p={layout.cardPadding}
                                            gap="$3"
                                            style={{
                                                minHeight: layout.isTablet
                                                    ? layout.queueCardMinHeight
                                                    : undefined,
                                                boxShadow: ds.shadows.card,
                                            }}
                                        >
                                            <XStack
                                                justify="space-between"
                                                items="flex-start"
                                                gap="$3"
                                            >
                                                <YStack flex={1} gap="$1.5">
                                                    <Text
                                                        color={ds.colors.foreground}
                                                        fontFamily={ds.fonts.bodyBold}
                                                        fontSize={ds.typography.titleMd.fontSize}
                                                    >
                                                        {section.title}
                                                    </Text>
                                                    <Paragraph
                                                        color={ds.colors.mutedForeground}
                                                        fontFamily={ds.fonts.bodyMedium}
                                                        fontSize={ds.typography.bodySm.fontSize}
                                                    >
                                                        {t("section.answeredCount", {
                                                            ns: "audit",
                                                            answered:
                                                                localProgress.answeredQuestionCount,
                                                            total: localProgress.visibleQuestionCount,
                                                        })}
                                                    </Paragraph>
                                                </YStack>
                                                <XStack
                                                    items="center"
                                                    gap="$2"
                                                    style={{ flexShrink: 0 }}
                                                >
                                                    {isComplete ? (
                                                        <CircleCheckBig
                                                            size={18}
                                                            color={ds.colors.success}
                                                        />
                                                    ) : null}
                                                    {showOnlineUploadHint ? (
                                                        <XStack items="center" gap="$1.5">
                                                            <ActivityIndicator
                                                                size="small"
                                                                color={ds.colors.primary}
                                                            />
                                                            <Text
                                                                color={ds.colors.primary}
                                                                fontFamily={ds.fonts.bodyBold}
                                                                fontSize={
                                                                    ds.typography.labelXs.fontSize
                                                                }
                                                                textTransform="uppercase"
                                                                letterSpacing={0.8}
                                                            >
                                                                {t("section.uploadingShort", {
                                                                    ns: "audit",
                                                                })}
                                                            </Text>
                                                        </XStack>
                                                    ) : null}
                                                </XStack>
                                            </XStack>
                                            <Button
                                                height={layout.isTablet ? 50 : 46}
                                                rounded={ds.radii.md}
                                                borderWidth={1}
                                                borderColor={
                                                    isComplete
                                                        ? ds.colors.success
                                                        : ds.colors.border
                                                }
                                                bg={
                                                    isComplete
                                                        ? ds.colors.successSoft
                                                        : ds.colors.input
                                                }
                                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                                onPress={() => {
                                                    router.push(
                                                        `/(tabs)/execute/${placeId}/section/${section.section_key}?projectId=${encodeURIComponent(projectId)}`,
                                                    );
                                                }}
                                            >
                                                <Text
                                                    color={
                                                        isComplete
                                                            ? ds.colors.success
                                                            : ds.colors.foreground
                                                    }
                                                    fontFamily={ds.fonts.bodyBold}
                                                    fontSize={ds.typography.labelLg.fontSize}
                                                    textTransform="uppercase"
                                                    letterSpacing={1.2}
                                                >
                                                    {isComplete
                                                        ? t("section.reviewSection", {
                                                              ns: "audit",
                                                          })
                                                        : t("section.openSection", { ns: "audit" })}
                                                </Text>
                                            </Button>
                                        </YStack>
                                    );
                                },
                            )
                        )}
                    </YStack>

                    {auditSession.progress.ready_to_submit ? (
                        <Button
                            height={layout.controlHeight}
                            rounded={ds.radii.md}
                            borderWidth={0}
                            bg={ds.colors.primary}
                            disabled={isSavingDraft || isSyncing}
                            opacity={isSavingDraft || isSyncing ? 0.7 : 1}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={() => {
                                if (authSession === null) {
                                    return;
                                }
                                submitAuditSession(authSession, auditSession.audit_id).catch(
                                    () => undefined,
                                );
                            }}
                        >
                            <Text
                                color={ds.colors.primaryForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelLg.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.2}
                            >
                                {t("submit", { ns: "audit" })}
                            </Text>
                        </Button>
                    ) : null}

                    {errorMessage === null ? null : (
                        <Paragraph color={ds.colors.warning} fontFamily={ds.fonts.bodyMedium}>
                            {errorMessage}
                        </Paragraph>
                    )}
                </>
            )}
        </ScrollView>
    );
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
function AuditSyncStatusCard({
    hasPendingLocalChanges,
    isSyncing,
    lastSyncError,
}: Readonly<AuditSyncStatusCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("audit");
    const hasSyncFailure = lastSyncError !== null;
    const shouldShowCard = hasPendingLocalChanges || hasSyncFailure;

    if (!shouldShowCard) {
        return null;
    }

    const tone = isSyncing
        ? ds.colors.primary
        : hasSyncFailure
          ? ds.colors.danger
          : ds.colors.mutedForeground;
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
            rounded={ds.radii.lg}
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
                <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
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

/**
 * Resolve place locality copy for the overview header.
 *
 * @param auditSession Loaded audit session for the active place.
 * @param t Translation function.
 * @returns Place type label or fallback copy.
 */
export function getPlaceLocality(
    auditSession: { readonly place_type?: string | null } | undefined,
    t: TFunction,
): string {
    if (auditSession === undefined) {
        return "";
    }
    return auditSession.place_type ?? t("place.assignedPlace", { ns: "common" });
}
