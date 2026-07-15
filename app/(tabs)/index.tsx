import { useCallback, useEffect, useMemo, useRef } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
    ArrowRight,
    BarChart3,
    Clock3,
    LogOut,
    MapPin,
    MapPinned,
    Play,
    ShieldCheck,
    SlidersHorizontal,
    UserRound,
    WifiOff,
} from "@tamagui/lucide-icons-2";
import { NotificationBellIcon } from "components/ui/NotificationBellIcon";
import { ScreenHeader } from "components/ui/screen-header";
import { TabListSkeleton } from "components/ui/skeleton";
import { PendingUploadsBanner } from "components/playspace-audit/pending-uploads-banner";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import { formatScorePair, formatScoreValue, getEffectivePlaceScores } from "lib/audit/score-helpers";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { formatPriorityProgressLabel, getVisibleProgressBarWidth } from "lib/dashboard-progress";
import { useDesignSystem, getPlaceStatusTone } from "lib/design-system";
import { formatLongDateLabel, formatRelativeTimeLabel, getPlaceStatusLabel } from "lib/i18n/format";
import { getCardTextLineLimit } from "lib/responsive";
import { buildPairGridRows } from "lib/ui/pair-grid";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { derivePlaceRequirementStatus } from "lib/audit/place-helpers";
import type { AuditorPlace } from "lib/audit/places-api";
import { useAuthStore } from "stores/auth-store";
import { usePlacesStore } from "stores/places-store";
import { usePreferencesStore } from "stores/preferences-store";

/**
 * UI status derived from `place_audit_status` and `place_survey_status`.
 */
type DerivedPlaceStatus = "not_started" | "in_progress" | "submitted";
type PriorityDueLabelKey = "dueToday" | "dueSoon";

const DUE_SOON_WINDOW_DAYS = 3;

/**
 * Build a locality string from city and country fields.
 *
 * @param place Auditor place record.
 * @param fallbackLabel Fallback label when no locality is available.
 * @returns Comma-separated locality or fallback text.
 */
function deriveLocality(place: AuditorPlace, fallbackLabel: string): string {
    const parts = [place.city, place.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : fallbackLabel;
}

function derivePriorityDueLabelKey(place: AuditorPlace | undefined): PriorityDueLabelKey | null {
    if (place === undefined || place.due_date === null) {
        return null;
    }

    const dueDate = new Date(place.due_date);
    if (Number.isNaN(dueDate.getTime())) {
        return null;
    }

    const dueDateStart = new Date(dueDate);
    dueDateStart.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.round((dueDateStart.getTime() - todayStart.getTime()) / 86_400_000);

    if (daysUntilDue <= 0) {
        return "dueToday";
    }
    if (daysUntilDue <= DUE_SOON_WINDOW_DAYS) {
        return "dueSoon";
    }

    return null;
}

/**
 * Dashboard tab for playspace field operations.
 * Displays real-time metrics, priority tasks, and active work cards
 * sourced from the auditor's assigned places API.
 */
export default function DashboardScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t, i18n } = useTranslation(["dashboard", "common"]);
    const session = useAuthStore((state) => state.session);
    const logout = useAuthStore((state) => state.logout);
    const places = useLocalFirstPlaces();
    const isLoading = usePlacesStore((state) => state.isLoading);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);
    const themeMode = usePreferencesStore((state) => state.themeMode);
    const languagePreference = usePreferencesStore((state) => state.languagePreference);
    const fontScale = usePreferencesStore((state) => state.fontScale);
    const scrollViewRef = useRef<ScrollView | null>(null);

    useEffect(() => {
        if (session === null) {
            return;
        }
        void loadPlaces(session).catch(() => undefined);
    }, [session, loadPlaces]);

    const scrollDashboardToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({
        contentReady: !isLoading || places.length > 0,
        rerunKey: places.length,
        scrollToOffset: scrollDashboardToOffset,
    });

    const assignedCount = places.length;

    const completedCount = useMemo(() => {
        return places.filter((p) => derivePlaceRequirementStatus(p) === "submitted").length;
    }, [places]);

    const inProgressCount = useMemo(() => {
        return places.filter((p) => derivePlaceRequirementStatus(p) === "in_progress").length;
    }, [places]);

    const notStartedCount = useMemo(() => {
        return places.filter((p) => derivePlaceRequirementStatus(p) === "not_started").length;
    }, [places]);

    const submittedCount = completedCount;

    // Average PV/U across the auditor's submitted places, used by the tablet
    // right rail. Places awaiting score processing are skipped from the average.
    const submittedScoreSummary = useMemo(() => {
        const scorePairs = places
            .filter((p) => derivePlaceRequirementStatus(p) === "submitted")
            .map((place) => getEffectivePlaceScores(place))
            .filter((pair): pair is NonNullable<typeof pair> => pair !== null);

        if (scorePairs.length === 0) {
            return null;
        }

        const totalPlayValue = scorePairs.reduce((sum, pair) => sum + pair.pv, 0);
        const totalUsability = scorePairs.reduce((sum, pair) => sum + pair.u, 0);
        return {
            averagePlayValue: totalPlayValue / scorePairs.length,
            averageUsability: totalUsability / scorePairs.length,
        };
    }, [places]);

    const highlightedPlaces = useMemo(() => {
        return places.filter((p) => derivePlaceRequirementStatus(p) !== "submitted").slice(0, 3);
    }, [places]);
    const highlightedPlaceRows = useMemo(() => {
        return buildPairGridRows(highlightedPlaces, (place) => {
            return place.place_id;
        });
    }, [highlightedPlaces]);

    const priorityPlace = useMemo<AuditorPlace | undefined>(() => {
        const inProgress = places.find((p) => derivePlaceRequirementStatus(p) === "in_progress");
        if (inProgress !== undefined) {
            return inProgress;
        }
        const notStarted = places.find((p) => derivePlaceRequirementStatus(p) === "not_started");
        return notStarted;
    }, [places]);

    const fieldReadinessPercent = useMemo(() => {
        if (highlightedPlaces.length === 0) {
            return 0;
        }

        const totalCompletion = highlightedPlaces.reduce((sum, place) => {
            return sum + (place.progress_percent ?? 0);
        }, 0);

        return Math.round(totalCompletion / highlightedPlaces.length);
    }, [highlightedPlaces]);

    const fieldPriorityItems: readonly {
        readonly id: string;
        readonly title: string;
        readonly value: string;
    }[] = useMemo(() => {
        return [
            {
                id: "priority-in-progress",
                title: t("status.inProgress", { ns: "common" }),
                value: String(inProgressCount),
            },
            {
                id: "priority-not-started",
                title: t("status.notStarted", { ns: "common" }),
                value: String(notStartedCount),
            },
            {
                id: "priority-submitted",
                title: t("status.submitted", { ns: "common" }),
                value: String(submittedCount),
            },
        ] as const;
    }, [inProgressCount, notStartedCount, submittedCount, t]);

    const activeAuditorName = session?.user.name ?? session?.user.email ?? t("activeAuditor", { ns: "dashboard" });
    const auditorOrganization = session?.user.organization ?? null;
    const blockHeaderMinHeight = ds.typography.labelSm.lineHeight;
    const useTwoColumnActiveWorkGrid = layout.isWideTablet;

    const dateLabel = useMemo(() => {
        return formatLongDateLabel(i18n.language);
    }, [i18n.language]);

    const priorityPlaceStatus = useMemo<DerivedPlaceStatus | null>(() => {
        if (priorityPlace === undefined) {
            return null;
        }

        return derivePlaceRequirementStatus(priorityPlace);
    }, [priorityPlace]);
    const priorityProgressLabel = useMemo(() => {
        if (priorityPlace === undefined || priorityPlaceStatus === null) {
            return "";
        }

        return formatPriorityProgressLabel({
            progressPercent: priorityPlace.progress_percent ?? 0,
            status: priorityPlaceStatus,
            updatedLabel: formatRelativeTimeLabel(
                priorityPlace.started_at,
                priorityPlace.submitted_at,
                i18n.language,
                t,
            ),
            translate: (key, values) => {
                if (values === undefined) {
                    return t(key, { ns: "dashboard" });
                }

                return t(key, { ns: "dashboard", ...values });
            },
        });
    }, [i18n.language, priorityPlace, priorityPlaceStatus, t]);

    const priorityProgressBarWidth = useMemo(() => {
        if (priorityPlace === undefined) {
            return 4;
        }

        return getVisibleProgressBarWidth(priorityPlace.progress_percent ?? 0);
    }, [priorityPlace]);
    const priorityDueLabelKey = useMemo<PriorityDueLabelKey | null>(() => {
        return derivePriorityDueLabelKey(priorityPlace);
    }, [priorityPlace]);
    const showPriorityUrgentBadge = priorityDueLabelKey !== null;

    const connectivityBlock = (
        <YStack gap="$3">
            <Text
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelSm.fontSize}
                textTransform="uppercase"
                letterSpacing={1.6}
            >
                {t("connectivityStatus", { ns: "dashboard" })}
            </Text>

            <YStack
                borderWidth={1}
                borderColor={ds.colors.border}
                rounded={ds.radii.lg}
                p={layout.cardPadding}
                gap="$3"
                bg={ds.colors.surfaceMuted}
                style={{ boxShadow: ds.shadows.card }}
            >
                <XStack items="center" gap="$3">
                    <YStack
                        width={layout.isTablet ? 52 : 44}
                        height={layout.isTablet ? 52 : 44}
                        items="center"
                        justify="center"
                        rounded={ds.radii.md}
                        bg={ds.colors.successSoft}
                    >
                        <WifiOff size={layout.isTablet ? 24 : 22} color={ds.colors.success} />
                    </YStack>
                    <YStack flex={1} gap="$1">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.bodyLg.fontSize}
                        >
                            {t("offlineReadyTitle", { ns: "dashboard" })}
                        </Text>
                        <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                            {t("offlineReadyDescription", { ns: "dashboard" })}
                        </Paragraph>
                    </YStack>
                </XStack>
            </YStack>
        </YStack>
    );

    const railSectionLabelStyle = {
        color: ds.colors.mutedForeground,
        fontFamily: ds.fonts.bodyBold,
        fontSize: ds.typography.labelSm.fontSize,
    } as const;

    // Reports snapshot for the tablet rail: total submitted plus the average
    // play-value and usability scores across submissions that have been scored.
    const reportsSummaryBlock = (
        <YStack gap="$3">
            <Text {...railSectionLabelStyle} textTransform="uppercase" letterSpacing={1.6}>
                {t("reportsSummary.label", { ns: "dashboard" })}
            </Text>
            <YStack
                borderWidth={1}
                borderColor={ds.colors.border}
                rounded={ds.radii.lg}
                p={layout.cardPadding}
                gap="$3.5"
                bg={ds.colors.surface}
                style={{ boxShadow: ds.shadows.card }}
            >
                <XStack items="center" gap="$3">
                    <YStack
                        width={layout.isTablet ? 52 : 44}
                        height={layout.isTablet ? 52 : 44}
                        items="center"
                        justify="center"
                        rounded={ds.radii.md}
                        bg={ds.colors.primarySoft}
                    >
                        <BarChart3 size={layout.isTablet ? 24 : 22} color={ds.colors.primary} />
                    </YStack>
                    <YStack flex={1} gap="$0.5">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={ds.typography.metricMd.fontSize}
                            lineHeight={ds.typography.metricMd.lineHeight}
                        >
                            {String(submittedCount)}
                        </Text>
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelSm.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            {t("reportsSummary.submitted", { ns: "dashboard" })}
                        </Paragraph>
                    </YStack>
                </XStack>

                {submittedScoreSummary === null ? (
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {t("reportsSummary.noScores", { ns: "dashboard" })}
                    </Paragraph>
                ) : (
                    <YStack gap="$2.5">
                        <Separator borderColor={ds.colors.border} />
                        <RailStatRow
                            ds={ds}
                            label={t("reportsSummary.avgPlayValue", { ns: "dashboard" })}
                            value={formatScoreValue(submittedScoreSummary.averagePlayValue)}
                        />
                        <RailStatRow
                            ds={ds}
                            label={t("reportsSummary.avgUsability", { ns: "dashboard" })}
                            value={formatScoreValue(submittedScoreSummary.averageUsability)}
                        />
                    </YStack>
                )}

                <Button
                    height={layout.isTablet ? layout.buttonHeight : 40}
                    rounded={ds.radii.sm}
                    borderWidth={0}
                    bg={ds.colors.primary}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push("/reports");
                    }}
                >
                    <XStack items="center" justify="center" gap="$2">
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodySemiBold}
                            fontSize={ds.typography.bodySm.fontSize}
                            numberOfLines={1}
                        >
                            {t("reportsSummary.viewReports", { ns: "dashboard" })}
                        </Text>
                        <ArrowRight size={14} color={ds.colors.primaryForeground} />
                    </XStack>
                </Button>
            </YStack>
        </YStack>
    );

    const personalizeLanguageLabelKey: Record<string, string> = {
        system: "language.system",
        en: "language.english",
        de: "language.german",
        fr: "language.french",
        ja: "language.japanese",
        hi: "language.hindi",
    };

    // Shown to auditors with no submissions yet: a nudge to make the app their
    // own, summarising current preferences and linking to full settings.
    const personalizeBlock = (
        <YStack gap="$3">
            <Text {...railSectionLabelStyle} textTransform="uppercase" letterSpacing={1.6}>
                {t("personalize.label", { ns: "dashboard" })}
            </Text>
            <YStack
                borderWidth={1}
                borderColor={ds.colors.border}
                rounded={ds.radii.lg}
                p={layout.cardPadding}
                gap="$3.5"
                bg={ds.colors.surface}
                style={{ boxShadow: ds.shadows.card }}
            >
                <XStack items="center" gap="$3">
                    <YStack
                        width={layout.isTablet ? 52 : 44}
                        height={layout.isTablet ? 52 : 44}
                        items="center"
                        justify="center"
                        rounded={ds.radii.md}
                        bg={ds.colors.primarySoft}
                    >
                        <SlidersHorizontal size={layout.isTablet ? 24 : 22} color={ds.colors.primary} />
                    </YStack>
                    <Paragraph
                        flex={1}
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {t("personalize.description", { ns: "dashboard" })}
                    </Paragraph>
                </XStack>

                <YStack gap="$2.5">
                    <Separator borderColor={ds.colors.border} />
                    <RailStatRow
                        ds={ds}
                        label={t("personalize.theme", { ns: "dashboard" })}
                        value={t(`appearance.${themeMode}`, { ns: "settings" })}
                    />
                    <RailStatRow
                        ds={ds}
                        label={t("personalize.language", { ns: "dashboard" })}
                        value={t(personalizeLanguageLabelKey[languagePreference] ?? "language.english", {
                            ns: "settings",
                        })}
                    />
                    <RailStatRow
                        ds={ds}
                        label={t("personalize.textSize", { ns: "dashboard" })}
                        value={`${fontScale.toFixed(2)}×`}
                    />
                </YStack>

                <Button
                    height={layout.isTablet ? layout.buttonHeight : 40}
                    rounded={ds.radii.sm}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surfaceMuted}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push("/settings");
                    }}
                >
                    <XStack items="center" justify="center" gap="$2">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodySemiBold}
                            fontSize={ds.typography.bodySm.fontSize}
                            numberOfLines={1}
                        >
                            {t("personalize.openSettings", { ns: "dashboard" })}
                        </Text>
                        <ArrowRight size={14} color={ds.colors.foreground} />
                    </XStack>
                </Button>
            </YStack>
        </YStack>
    );

    const railSecondaryBlock = submittedCount > 0 ? reportsSummaryBlock : personalizeBlock;

    const priorityTaskBlock = (
        <YStack gap="$3">
            <XStack justify="space-between" items="center" style={{ minHeight: blockHeaderMinHeight }}>
                <Text
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelSm.fontSize}
                    lineHeight={ds.typography.labelSm.lineHeight}
                    textTransform="uppercase"
                    letterSpacing={1.6}
                >
                    {t("priorityTask", { ns: "dashboard" })}
                </Text>
                {priorityDueLabelKey === null ? null : (
                    <Text
                        color={ds.colors.danger}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelSm.fontSize}
                        lineHeight={ds.typography.labelSm.lineHeight}
                        textTransform="uppercase"
                        letterSpacing={1.3}
                    >
                        {t(priorityDueLabelKey, { ns: "dashboard" })}
                    </Text>
                )}
            </XStack>

            {priorityPlace === undefined ? null : (
                <YStack
                    rounded={ds.radii.lg}
                    gap="$4"
                    borderWidth={2}
                    borderColor={ds.colors.primary}
                    bg={ds.colors.surface}
                    overflow="hidden"
                    style={{
                        minHeight: layout.isTablet ? layout.heroCardMinHeight : undefined,
                        boxShadow: ds.shadows.card,
                    }}
                >
                    <YStack
                        p="$4"
                        gap="$3"
                        bg={ds.colors.surface}
                        style={{
                            backgroundColor: ds.colors.surface,
                        }}
                    >
                        <XStack gap="$2" items="center" flexWrap="wrap">
                            {showPriorityUrgentBadge ? (
                                <YStack rounded={ds.radii.sm} px="$2" py="$2" bg={ds.colors.primary}>
                                    <Text
                                        color={ds.colors.primaryForeground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.labelXs.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1.3}
                                    >
                                        {t("urgentAudit", { ns: "dashboard" })}
                                    </Text>
                                </YStack>
                            ) : null}
                            <XStack
                                items="center"
                                gap="$2"
                                rounded={ds.radii.sm}
                                px="$2"
                                py="$2"
                                bg={ds.colors.primarySoft}
                            >
                                <MapPin size={14} color={ds.colors.primary} />
                                <Text
                                    color={ds.colors.secondaryForeground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelXs.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.3}
                                    numberOfLines={getCardTextLineLimit("meta")}
                                >
                                    {deriveLocality(priorityPlace, t("place.assignedPlace", { ns: "common" }))}
                                </Text>
                            </XStack>
                        </XStack>

                        <YStack gap="$1.5" style={{ minWidth: 0 }}>
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.headingBold}
                                fontSize={ds.typography.titleLg.fontSize}
                                lineHeight={ds.typography.titleLg.lineHeight}
                                numberOfLines={getCardTextLineLimit("title")}
                            >
                                {priorityPlace.place_name}
                            </Text>
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                numberOfLines={getCardTextLineLimit("supporting")}
                            >
                                {priorityPlace.project_name}
                            </Paragraph>
                        </YStack>
                    </YStack>

                    <XStack
                        items="center"
                        gap="$4"
                        p={layout.cardPadding}
                        borderTopWidth={1}
                        borderTopColor={ds.colors.border}
                    >
                        <YStack flex={1} gap="$2">
                            <YStack height={6} rounded={ds.radii.full} bg={ds.colors.mutedSurface} overflow="hidden">
                                <YStack
                                    height={6}
                                    rounded={ds.radii.full}
                                    bg={ds.colors.primary}
                                    width={priorityProgressBarWidth}
                                />
                            </YStack>
                            <Text
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.bodySm.fontSize}
                                lineHeight={ds.typography.bodySm.lineHeight}
                            >
                                {priorityProgressLabel}
                            </Text>
                        </YStack>
                        <Button
                            height={layout.isTablet ? layout.buttonHeight : 40}
                            px="$6"
                            rounded={ds.radii.sm}
                            borderWidth={0}
                            bg={ds.colors.primary}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={() => {
                                router.push(
                                    `/execute/${priorityPlace.place_id}?projectId=${encodeURIComponent(priorityPlace.project_id)}`,
                                );
                            }}
                        >
                            <XStack items="center" gap="$2">
                                <Text
                                    color={ds.colors.primaryForeground}
                                    fontFamily={ds.fonts.bodySemiBold}
                                    fontSize={ds.typography.bodySm.fontSize}
                                    numberOfLines={1}
                                >
                                    {/* Verb must match the audit's actual state:
                                        "Resume" on a not-started audit reads as a bug. */}
                                    {priorityPlaceStatus === "not_started"
                                        ? t("actions.start", { ns: "common" })
                                        : t("actions.resume", { ns: "common" })}
                                </Text>
                                <Play size={14} color={ds.colors.primaryForeground} />
                            </XStack>
                        </Button>
                    </XStack>
                </YStack>
            )}
        </YStack>
    );

    const activeWorkBlock = (
        <YStack gap="$1.5">
            <XStack justify="space-between" items="center">
                <Text
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelSm.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.6}
                >
                    {t("activeWork", { ns: "dashboard" })}
                </Text>
                <Button
                    chromeless
                    onPress={() => {
                        router.push("/places");
                    }}
                >
                    <Text
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.3}
                    >
                        {t("actions.seeAll", { ns: "common" })}
                    </Text>
                </Button>
            </XStack>

            {useTwoColumnActiveWorkGrid ? (
                <YStack gap="$3">
                    {highlightedPlaceRows.map((row) => {
                        return (
                            <XStack key={row.id} gap="$3">
                                <DashboardActiveWorkCard place={row.left} />
                                {row.right === null ? (
                                    <YStack width="48.5%" style={{ minHeight: layout.queueCardMinHeight }} />
                                ) : (
                                    <DashboardActiveWorkCard place={row.right} />
                                )}
                            </XStack>
                        );
                    })}
                </YStack>
            ) : (
                <YStack gap="$3">
                    {highlightedPlaces.map((place) => {
                        return <DashboardActiveWorkCard key={place.place_id} place={place} />;
                    })}
                </YStack>
            )}
        </YStack>
    );

    if (isLoading && places.length === 0) {
        return <TabListSkeleton />;
    }

    if (layout.isTablet) {
        return (
            <ScrollView
                ref={scrollViewRef}
                contentInsetAdjustmentBehavior="automatic"
                style={{ backgroundColor: ds.colors.background }}
                contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                    bottomPadding: 92,
                    gap: 32,
                })}
            >
                <YStack gap="$6">
                    <PendingUploadsBanner />
                    {/* Merged single-row tablet header (2.2/G9): title + date on
                        the left; auditor identity, bell, and sign-out on the
                        right - replaces the old stacked double header. */}
                    <ScreenHeader
                        title={t("title", { ns: "dashboard" })}
                        subtitle={dateLabel}
                        actions={
                            <>
                                <XStack
                                    items="center"
                                    gap="$2.5"
                                    rounded={ds.radii.full}
                                    borderWidth={1}
                                    borderColor={ds.colors.border}
                                    bg={ds.colors.surfaceMuted}
                                    pl="$1.5"
                                    pr="$3.5"
                                    py="$1.5"
                                >
                                    <YStack
                                        width={40}
                                        height={40}
                                        items="center"
                                        justify="center"
                                        rounded={ds.radii.full}
                                        bg={ds.colors.primarySoft}
                                    >
                                        <UserRound size={20} color={ds.colors.primary} />
                                    </YStack>
                                    <YStack>
                                        <Text
                                            color={ds.colors.foreground}
                                            fontFamily={ds.fonts.bodyBold}
                                            fontSize={ds.typography.bodyMd.fontSize}
                                            numberOfLines={1}
                                        >
                                            {activeAuditorName}
                                        </Text>
                                        {auditorOrganization !== null ? (
                                            <Paragraph
                                                color={ds.colors.mutedForeground}
                                                fontFamily={ds.fonts.bodyMedium}
                                                fontSize={ds.typography.bodySm.fontSize}
                                                numberOfLines={1}
                                            >
                                                {auditorOrganization}
                                            </Paragraph>
                                        ) : null}
                                    </YStack>
                                </XStack>
                                <NotificationBellIcon />
                                <Button
                                    width={46}
                                    height={46}
                                    p={0}
                                    rounded={ds.radii.full}
                                    borderWidth={1}
                                    borderColor={ds.colors.border}
                                    bg={ds.colors.surfaceMuted}
                                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                    onPress={logout}
                                    accessibilityLabel={t("actions.signOut", { ns: "common" })}
                                >
                                    <LogOut size={18} color={ds.colors.foreground} />
                                </Button>
                            </>
                        }
                    />

                    <XStack gap="$3">
                        <YStack
                            flex={1}
                            height={144}
                            justify="space-between"
                            rounded={ds.radii.lg}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.surface}
                            p={layout.cardPadding}
                            style={{
                                minHeight: layout.summaryCardMinHeight,
                                boxShadow: ds.shadows.card,
                            }}
                        >
                            <YStack gap="$1">
                                <Text
                                    color={ds.colors.primary}
                                    fontFamily={ds.fonts.headingBold}
                                    fontSize={ds.typography.displayLg.fontSize}
                                    lineHeight={ds.typography.displayLg.lineHeight}
                                >
                                    {String(assignedCount)}
                                </Text>
                                <Paragraph
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelSm.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.5}
                                >
                                    {t("status.assigned", { ns: "common" })}
                                </Paragraph>
                            </YStack>
                            <MapPinned size={32} color={ds.colors.primarySoft} />
                        </YStack>

                        <YStack
                            flex={1}
                            height={144}
                            justify="space-between"
                            rounded={ds.radii.lg}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.surface}
                            p={layout.cardPadding}
                            style={{
                                minHeight: layout.summaryCardMinHeight,
                                boxShadow: ds.shadows.card,
                            }}
                        >
                            <YStack gap="$1">
                                <Text
                                    color={ds.colors.success}
                                    fontFamily={ds.fonts.headingBold}
                                    fontSize={ds.typography.displayLg.fontSize}
                                    lineHeight={ds.typography.displayLg.lineHeight}
                                >
                                    {String(completedCount)}
                                </Text>
                                <Paragraph
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelSm.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.5}
                                >
                                    {t("status.completed", { ns: "common" })}
                                </Paragraph>
                            </YStack>
                            <ShieldCheck size={32} color={ds.colors.successSoft} />
                        </YStack>

                        <YStack
                            flex={1}
                            height={144}
                            justify="space-between"
                            rounded={ds.radii.lg}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.surface}
                            p={layout.cardPadding}
                            style={{
                                minHeight: layout.summaryCardMinHeight,
                                boxShadow: ds.shadows.card,
                            }}
                        >
                            <YStack gap="$1">
                                <Text
                                    color={ds.colors.warning}
                                    fontFamily={ds.fonts.headingBold}
                                    fontSize={ds.typography.displayLg.fontSize}
                                    lineHeight={ds.typography.displayLg.lineHeight}
                                >
                                    {String(inProgressCount)}
                                </Text>
                                <Paragraph
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelSm.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.5}
                                >
                                    {t("status.inProgress", { ns: "common" })}
                                </Paragraph>
                            </YStack>
                            <Play size={30} color={ds.colors.warningSoft} />
                        </YStack>
                    </XStack>
                </YStack>

                <XStack gap={layout.twoPaneGap} items="flex-start">
                    <YStack flex={1} gap="$3">
                        {priorityTaskBlock}
                        {activeWorkBlock}
                    </YStack>
                    <YStack width={layout.supportRailWidth} gap="$5">
                        {/* The rail avoids duplicating the main column: it shows
                            connectivity plus either a submitted-reports snapshot
                            or, for auditors with no submissions yet, a nudge to
                            personalise the app. */}
                        {connectivityBlock}
                        {railSecondaryBlock}
                    </YStack>
                </XStack>
            </ScrollView>
        );
    }

    return (
        <ScrollView
            ref={scrollViewRef}
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 92,
                gap: 28,
            })}
        >
            <YStack gap="$6">
                <PendingUploadsBanner />
                <ScreenHeader
                    aboveTitle={
                        <XStack justify="space-between" items="center" gap="$3">
                            <XStack items="center" gap="$3" flex={1}>
                                <YStack
                                    width={44}
                                    height={44}
                                    items="center"
                                    justify="center"
                                    rounded={ds.radii.md}
                                    borderWidth={1}
                                    borderColor={ds.colors.border}
                                    bg={ds.colors.surfaceMuted}
                                >
                                    <UserRound size={20} color={ds.colors.primary} />
                                </YStack>
                                <YStack flex={1} gap="$0.5">
                                    <Paragraph
                                        color={ds.colors.mutedForeground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.labelXs.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1.4}
                                    >
                                        {t("activeAuditor", { ns: "dashboard" })}
                                    </Paragraph>
                                    <Text
                                        color={ds.colors.foreground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.bodyLg.fontSize}
                                    >
                                        {activeAuditorName}
                                    </Text>
                                    {auditorOrganization !== null ? (
                                        <Paragraph
                                            color={ds.colors.mutedForeground}
                                            fontFamily={ds.fonts.bodyMedium}
                                            fontSize={ds.typography.bodySm.fontSize}
                                            numberOfLines={1}
                                        >
                                            {auditorOrganization}
                                        </Paragraph>
                                    ) : null}
                                </YStack>
                            </XStack>

                            <XStack gap="$2">
                                <NotificationBellIcon />
                                <Button
                                    width={42}
                                    height={42}
                                    p={0}
                                    rounded={ds.radii.full}
                                    borderWidth={1}
                                    borderColor={ds.colors.border}
                                    bg={ds.colors.surfaceMuted}
                                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                    onPress={logout}
                                    accessibilityLabel={t("actions.signOut", { ns: "common" })}
                                >
                                    <LogOut size={16} color={ds.colors.foreground} />
                                </Button>
                            </XStack>
                        </XStack>
                    }
                    title={t("title", { ns: "dashboard" })}
                    subtitle={dateLabel}
                />

                <XStack gap="$3">
                    <YStack
                        flex={1}
                        height={layout.isTablet ? 144 : 128}
                        justify="space-between"
                        rounded={ds.radii.lg}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.surface}
                        p={layout.cardPadding}
                        style={{
                            minHeight: layout.isTablet ? layout.summaryCardMinHeight : undefined,
                            boxShadow: ds.shadows.card,
                        }}
                    >
                        <YStack gap="$1">
                            <Text
                                color={ds.colors.primary}
                                fontFamily={ds.fonts.headingBold}
                                fontSize={ds.typography.displayLg.fontSize}
                                lineHeight={ds.typography.displayLg.lineHeight}
                            >
                                {String(assignedCount)}
                            </Text>
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelSm.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.5}
                            >
                                {t("status.assigned", { ns: "common" })}
                            </Paragraph>
                        </YStack>
                        <MapPinned size={layout.isTablet ? 32 : 28} color={ds.colors.primarySoft} />
                    </YStack>

                    <YStack
                        flex={1}
                        height={layout.isTablet ? 144 : 128}
                        justify="space-between"
                        rounded={ds.radii.lg}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.surface}
                        p={layout.cardPadding}
                        style={{
                            minHeight: layout.isTablet ? layout.summaryCardMinHeight : undefined,
                            boxShadow: ds.shadows.card,
                        }}
                    >
                        <YStack gap="$1">
                            <Text
                                color={ds.colors.success}
                                fontFamily={ds.fonts.headingBold}
                                fontSize={ds.typography.displayLg.fontSize}
                                lineHeight={ds.typography.displayLg.lineHeight}
                            >
                                {String(completedCount)}
                            </Text>
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelSm.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.5}
                            >
                                {t("status.completed", { ns: "common" })}
                            </Paragraph>
                        </YStack>
                        <ShieldCheck size={layout.isTablet ? 32 : 28} color={ds.colors.successSoft} />
                    </YStack>
                </XStack>
            </YStack>

            <YStack gap="$3">
                <XStack justify="space-between" items="center">
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.6}
                    >
                        {t("priorityTask", { ns: "dashboard" })}
                    </Text>
                    {priorityDueLabelKey === null ? null : (
                        <Paragraph
                            color={ds.colors.danger}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelSm.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.3}
                        >
                            {t(priorityDueLabelKey, { ns: "dashboard" })}
                        </Paragraph>
                    )}
                </XStack>

                {priorityPlace === undefined ? null : (
                    <YStack
                        rounded={ds.radii.lg}
                        borderWidth={2}
                        borderColor={ds.colors.primary}
                        bg={ds.colors.surface}
                        overflow="hidden"
                        style={{
                            minHeight: layout.isTablet ? layout.heroCardMinHeight : undefined,
                            boxShadow: ds.shadows.card,
                        }}
                    >
                        <YStack
                            p="$4"
                            gap="$3"
                            bg={ds.colors.surface}
                            style={{
                                backgroundColor: ds.colors.surface,
                            }}
                        >
                            <XStack gap="$2" items="center" flexWrap="wrap">
                                {showPriorityUrgentBadge ? (
                                    <YStack rounded={ds.radii.sm} px="$2" py="$2" bg={ds.colors.primary}>
                                        <Text
                                            color={ds.colors.primaryForeground}
                                            fontFamily={ds.fonts.bodyBold}
                                            fontSize={ds.typography.labelXs.fontSize}
                                            textTransform="uppercase"
                                            letterSpacing={1.3}
                                        >
                                            {t("urgentAudit", { ns: "dashboard" })}
                                        </Text>
                                    </YStack>
                                ) : null}
                                <XStack
                                    rounded={ds.radii.sm}
                                    px="$2"
                                    py="$2"
                                    bg={ds.colors.primarySoft}
                                    items="center"
                                    gap="$2"
                                >
                                    <MapPin size={14} color={ds.colors.primary} />
                                    <Text
                                        color={ds.colors.secondaryForeground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.labelXs.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1.3}
                                    >
                                        {deriveLocality(priorityPlace, t("place.assignedPlace", { ns: "common" }))}
                                    </Text>
                                </XStack>
                            </XStack>

                            <YStack gap="$1.5">
                                <Text
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.headingBold}
                                    fontSize={ds.typography.titleLg.fontSize}
                                    lineHeight={ds.typography.titleLg.lineHeight}
                                >
                                    {priorityPlace.place_name}
                                </Text>
                                <Paragraph
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.bodySm.fontSize}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {priorityPlace.project_name}
                                </Paragraph>
                            </YStack>
                        </YStack>

                        <XStack
                            items="center"
                            gap="$4"
                            p={layout.cardPadding}
                            borderTopWidth={1}
                            borderTopColor={ds.colors.border}
                        >
                            <YStack flex={1} gap="$2">
                                <YStack
                                    height={6}
                                    rounded={ds.radii.full}
                                    bg={ds.colors.mutedSurface}
                                    overflow="hidden"
                                >
                                    <YStack
                                        height={6}
                                        rounded={ds.radii.full}
                                        bg={ds.colors.primary}
                                        width={priorityProgressBarWidth}
                                    />
                                </YStack>
                                <Text
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.bodySm.fontSize}
                                    lineHeight={ds.typography.bodySm.lineHeight}
                                >
                                    {priorityProgressLabel}
                                </Text>
                            </YStack>
                            <Button
                                height={layout.isTablet ? 46 : 40}
                                px="$4"
                                rounded={ds.radii.sm}
                                borderWidth={0}
                                bg={ds.colors.primary}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    router.push(
                                        `/execute/${priorityPlace.place_id}?projectId=${encodeURIComponent(priorityPlace.project_id)}`,
                                    );
                                }}
                            >
                                <XStack items="center" gap="$2">
                                    <Text
                                        color={ds.colors.primaryForeground}
                                        fontFamily={ds.fonts.bodySemiBold}
                                        fontSize={ds.typography.bodySm.fontSize}
                                        numberOfLines={1}
                                    >
                                        {priorityPlaceStatus === "not_started"
                                            ? t("actions.start", { ns: "common" })
                                            : t("actions.resume", { ns: "common" })}
                                    </Text>
                                    <Play size={14} color={ds.colors.primaryForeground} />
                                </XStack>
                            </Button>
                        </XStack>
                    </YStack>
                )}
            </YStack>

            {/* No quick-action row here: the bottom tab bar already provides
                Places / Execute / Reports one tap away on phones. */}
            <YStack gap="$3">
                <Text
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelSm.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.6}
                >
                    {t("connectivityStatus", { ns: "dashboard" })}
                </Text>

                <YStack
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    rounded={ds.radii.lg}
                    p={layout.cardPadding}
                    gap="$3"
                    bg={ds.colors.surfaceMuted}
                    style={{
                        boxShadow: ds.shadows.card,
                    }}
                >
                    <XStack items="center" gap="$3">
                        <YStack
                            width={layout.isTablet ? 52 : 44}
                            height={layout.isTablet ? 52 : 44}
                            items="center"
                            justify="center"
                            rounded={ds.radii.md}
                            bg={ds.colors.successSoft}
                        >
                            <WifiOff size={layout.isTablet ? 24 : 22} color={ds.colors.success} />
                        </YStack>
                        <YStack flex={1} gap="$1">
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.bodyLg.fontSize}
                            >
                                {t("offlineReadyTitle", { ns: "dashboard" })}
                            </Text>
                            <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                                {t("offlineReadyDescription", { ns: "dashboard" })}
                            </Paragraph>
                        </YStack>
                    </XStack>
                </YStack>
            </YStack>

            <YStack gap="$3">
                <XStack justify="space-between" items="center">
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.6}
                    >
                        {t("fieldPriorities", { ns: "dashboard" })}
                    </Text>
                    <Text
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.monoBold}
                        fontSize={ds.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.1}
                    >
                        {t("readinessLabel", {
                            ns: "dashboard",
                            percent: fieldReadinessPercent,
                        })}
                    </Text>
                </XStack>

                <XStack gap="$2.5">
                    {fieldPriorityItems.map((item) => {
                        return (
                            <YStack
                                key={item.id}
                                flex={1}
                                rounded={ds.radii.md}
                                borderWidth={1}
                                borderColor={ds.colors.border}
                                bg={ds.colors.surface}
                                justify="space-between"
                                p={layout.isTablet ? 16 : 10}
                            >
                                <Paragraph
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelXs.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.2}
                                >
                                    {item.title}
                                </Paragraph>
                                <Text
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.headingBold}
                                    fontSize={ds.typography.metricMd.fontSize}
                                    lineHeight={ds.typography.metricMd.lineHeight}
                                    mt="$2"
                                >
                                    {item.value}
                                </Text>
                            </YStack>
                        );
                    })}
                </XStack>
            </YStack>

            <YStack gap="$1.5">
                <XStack justify="space-between" items="center">
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.6}
                    >
                        {t("activeWork", { ns: "dashboard" })}
                    </Text>
                    <Button
                        chromeless
                        onPress={() => {
                            router.push("/places");
                        }}
                    >
                        <Text
                            color={ds.colors.primary}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelSm.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.3}
                        >
                            {t("actions.seeAll", { ns: "common" })}
                        </Text>
                    </Button>
                </XStack>

                {layout.isTablet ? (
                    <YStack gap="$3">
                        {highlightedPlaceRows.map((row) => {
                            return (
                                <XStack key={row.id} gap="$3">
                                    <DashboardActiveWorkCard place={row.left} />
                                    {row.right === null ? (
                                        <YStack flex={1} />
                                    ) : (
                                        <DashboardActiveWorkCard place={row.right} />
                                    )}
                                </XStack>
                            );
                        })}
                    </YStack>
                ) : (
                    <YStack gap="$3">
                        {highlightedPlaces.map((place) => {
                            return <DashboardActiveWorkCard key={place.place_id} place={place} />;
                        })}
                    </YStack>
                )}
            </YStack>
        </ScrollView>
    );
}

interface RailStatRowProps {
    readonly ds: ReturnType<typeof useDesignSystem>;
    readonly label: string;
    readonly value: string;
}

/**
 * Compact label/value row used inside the tablet right-rail cards.
 */
function RailStatRow({ ds, label, value }: Readonly<RailStatRowProps>) {
    return (
        <XStack justify="space-between" items="center" gap="$3">
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodySm.fontSize}
                numberOfLines={1}
            >
                {label}
            </Paragraph>
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.bodyMd.fontSize}
                numberOfLines={1}
            >
                {value}
            </Text>
        </XStack>
    );
}

interface DashboardActiveWorkCardProps {
    readonly place: AuditorPlace;
}

function DashboardActiveWorkCard({ place }: Readonly<DashboardActiveWorkCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t, i18n } = useTranslation(["dashboard", "common"]);
    const status = derivePlaceRequirementStatus(place);
    const placeTone = getPlaceStatusTone(status, ds.colors);
    const progressPercent = place.progress_percent ?? 0;
    const updatedLabel = formatRelativeTimeLabel(place.started_at, place.submitted_at, i18n.language, t);
    const progressBarWidth = getVisibleProgressBarWidth(progressPercent);
    const activeAuditMetricState = {
        completionValue: `${progressPercent}%`,
        constructSummary: formatScorePair(place.overall_scores) ?? undefined,
    };

    return (
        <YStack
            flex={1}
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            justify="space-between"
            style={{
                minHeight: layout.isTablet ? layout.queueCardMinHeight : undefined,
                boxShadow: ds.shadows.card,
            }}
        >
            <YStack gap="$3">
                <YStack
                    self="flex-start"
                    rounded={ds.radii.full}
                    px="$3"
                    py="$1"
                    style={{ backgroundColor: placeTone.surface }}
                >
                    <Text
                        style={{ color: placeTone.text }}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelXs.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.2}
                    >
                        {getPlaceStatusLabel(status, t)}
                    </Text>
                </YStack>

                <YStack gap="$2" pb="$4" style={{ minWidth: 0 }}>
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={layout.isTablet ? ds.typography.titleLg.fontSize : ds.typography.titleMd.fontSize}
                        lineHeight={
                            layout.isTablet ? ds.typography.titleLg.lineHeight : ds.typography.titleMd.lineHeight
                        }
                        numberOfLines={1}
                    >
                        {place.place_name}
                    </Text>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                        numberOfLines={1}
                    >
                        {place.project_name}
                    </Paragraph>
                </YStack>

                <XStack justify="space-between" items="center">
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyMd.fontSize}
                        numberOfLines={1}
                    >
                        {t("mandatoryCompletion", {
                            ns: "dashboard",
                        })}
                    </Paragraph>
                    <Paragraph
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.bodyMd.fontSize}
                        numberOfLines={1}
                    >
                        {activeAuditMetricState.completionValue}
                    </Paragraph>
                </XStack>

                <YStack height={6} rounded={ds.radii.full} bg={ds.colors.mutedSurface} overflow="hidden">
                    <YStack height={6} rounded={ds.radii.full} bg={ds.colors.primary} width={progressBarWidth} />
                </YStack>
                {activeAuditMetricState.constructSummary === undefined ? null : (
                    <Paragraph
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                        numberOfLines={1}
                    >
                        {activeAuditMetricState.constructSummary}
                    </Paragraph>
                )}
            </YStack>

            <YStack gap="$3">
                <XStack items="center" gap="$1.5">
                    <Clock3 size={13} color={ds.colors.mutedForeground} />
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyMd.fontSize}
                        numberOfLines={getCardTextLineLimit("meta")}
                    >
                        {updatedLabel}
                    </Paragraph>
                </XStack>
                <Button
                    height={layout.isTablet ? 40 : 32}
                    rounded={ds.radii.sm}
                    borderWidth={0}
                    bg={ds.colors.primary}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push(`/execute/${place.place_id}?projectId=${encodeURIComponent(place.project_id)}`);
                    }}
                >
                    <XStack items="center" justify="center" gap="$1.5">
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodySemiBold}
                            fontSize={ds.typography.bodySm.fontSize}
                            numberOfLines={1}
                        >
                            {t("actions.openAudit", { ns: "common" })}
                        </Text>
                        {/* In-app navigation uses a plain right arrow; the
                            external-link arrow implies leaving the app. */}
                        <ArrowRight size={14} color={ds.colors.primaryForeground} />
                    </XStack>
                </Button>
            </YStack>

            <Separator borderColor={ds.colors.border} opacity={0} />
        </YStack>
    );
}
