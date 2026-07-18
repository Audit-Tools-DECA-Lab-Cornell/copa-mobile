import { useCallback, useEffect, useMemo, useRef } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
    ArrowRight,
    BarChart3,
    Clock3,
    LogOut,
    MapPin,
    Play,
    SlidersHorizontal,
    UserRound,
    WifiOff,
} from "@tamagui/lucide-icons-2";
import { AppButton, buttonForegroundColor } from "components/ui/app-button";
import { NotificationBellIcon } from "components/ui/NotificationBellIcon";
import { TabListSkeleton } from "components/ui/skeleton";
import { PendingUploadsBanner } from "components/playspace-audit/pending-uploads-banner";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import { formatScorePair, formatScoreValue, getEffectivePlaceScores } from "lib/audit/score-helpers";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { formatPriorityProgressLabel, getVisibleProgressBarWidth } from "lib/dashboard-progress";
import { getPlaceStatusTone, useDesignSystem } from "lib/design-system";
import { formatLongDateLabel, formatRelativeTimeLabel, getPlaceStatusLabel } from "lib/i18n/format";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useFabAwareBottomPadding } from "lib/responsive-insets";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { derivePlaceRequirementStatus } from "lib/audit/place-helpers";
import type { AuditorPlace } from "lib/audit/places-api";
import { useAuthStore } from "stores/auth-store";
import { usePlacesStore } from "stores/places-store";
import { usePreferencesStore } from "stores/preferences-store";

/** UI status derived from the audit and survey status fields. */
type DerivedPlaceStatus = "not_started" | "in_progress" | "submitted";
type PriorityDueLabelKey = "dueToday" | "dueSoon";

interface SubmittedScoreSummary {
    readonly averagePlayValue: number;
    readonly averageUsability: number;
}

const DUE_SOON_WINDOW_DAYS = 3;

/** Build a locality string from the optional city and country fields. */
function deriveLocality(place: AuditorPlace, fallbackLabel: string): string {
    const parts = [place.city, place.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : fallbackLabel;
}

/** Preserve useful decimal precision while keeping progress labels compact. */
function formatProgressPercentage(value: number | null | undefined): string {
    const clamped = Math.min(100, Math.max(0, value ?? 0));
    return clamped
        .toFixed(2)
        .replace(/\.00$/, "")
        .replace(/(\.\d)0$/, "$1");
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

    if (daysUntilDue === 0) {
        return "dueToday";
    }
    if (daysUntilDue > 0 && daysUntilDue <= DUE_SOON_WINDOW_DAYS) {
        return "dueSoon";
    }

    return null;
}

/**
 * Home dashboard for field operations.
 *
 * The same information architecture scales through three portrait tiers:
 * phones use a single-column brief, narrow tablets use compact split sections,
 * and wide tablets expose the complete command-center composition.
 */
export default function DashboardScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const listBottomPadding = useFabAwareBottomPadding();
    const { t, i18n } = useTranslation(["dashboard", "common", "settings"]);
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
        return places.filter((place) => derivePlaceRequirementStatus(place) === "submitted").length;
    }, [places]);

    const inProgressCount = useMemo(() => {
        return places.filter((place) => derivePlaceRequirementStatus(place) === "in_progress").length;
    }, [places]);

    const submittedScoreSummary = useMemo<SubmittedScoreSummary | null>(() => {
        const scorePairs = places
            .filter((place) => derivePlaceRequirementStatus(place) === "submitted")
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
        return places
            .filter((place) => derivePlaceRequirementStatus(place) !== "submitted")
            .sort((left, right) => {
                const leftDue = left.due_date === null ? Number.POSITIVE_INFINITY : new Date(left.due_date).getTime();
                const rightDue =
                    right.due_date === null ? Number.POSITIVE_INFINITY : new Date(right.due_date).getTime();
                const safeLeftDue = Number.isFinite(leftDue) ? leftDue : Number.POSITIVE_INFINITY;
                const safeRightDue = Number.isFinite(rightDue) ? rightDue : Number.POSITIVE_INFINITY;

                if (safeLeftDue !== safeRightDue) {
                    return safeLeftDue - safeRightDue;
                }

                const leftIsActive = derivePlaceRequirementStatus(left) === "in_progress";
                const rightIsActive = derivePlaceRequirementStatus(right) === "in_progress";
                return Number(rightIsActive) - Number(leftIsActive);
            })
            .slice(0, 3);
    }, [places]);

    const priorityPlace = highlightedPlaces[0];

    const activeAuditorName = session?.user.name ?? session?.user.email ?? t("activeAuditor", { ns: "dashboard" });
    const auditorOrganization = session?.user.organization ?? null;
    const dateLabel = useMemo(() => formatLongDateLabel(i18n.language), [i18n.language]);

    const priorityPlaceStatus = useMemo<DerivedPlaceStatus | null>(() => {
        return priorityPlace === undefined ? null : derivePlaceRequirementStatus(priorityPlace);
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
                return values === undefined ? t(key, { ns: "dashboard" }) : t(key, { ns: "dashboard", ...values });
            },
        });
    }, [i18n.language, priorityPlace, priorityPlaceStatus, t]);

    const priorityProgressBarWidth = useMemo(() => {
        return getVisibleProgressBarWidth(priorityPlace?.progress_percent ?? 0);
    }, [priorityPlace]);

    const priorityDueLabelKey = useMemo<PriorityDueLabelKey | null>(() => {
        return derivePriorityDueLabelKey(priorityPlace);
    }, [priorityPlace]);

    if (isLoading && places.length === 0) {
        return <TabListSkeleton />;
    }

    const screenGap = layout.isWideTablet ? 28 : layout.isTablet ? 24 : 22;

    return (
        <ScrollView
            ref={scrollViewRef}
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: listBottomPadding,
                gap: screenGap,
            })}
        >
            <PendingUploadsBanner />

            <DashboardIdentityBar
                activeAuditorName={activeAuditorName}
                auditorOrganization={auditorOrganization}
                onLogout={logout}
            />

            <DashboardOverview
                assignedCount={assignedCount}
                completedCount={completedCount}
                dateLabel={dateLabel}
                inProgressCount={inProgressCount}
            />

            {priorityPlace === undefined || priorityPlaceStatus === null ? null : (
                <PriorityMission
                    dueLabelKey={priorityDueLabelKey}
                    place={priorityPlace}
                    progressBarWidth={priorityProgressBarWidth}
                    progressLabel={priorityProgressLabel}
                    status={priorityPlaceStatus}
                />
            )}

            <ActiveFieldworkSection places={highlightedPlaces} />

            <EvidenceAndReports
                averageScores={submittedScoreSummary}
                fontScale={fontScale}
                languagePreference={languagePreference}
                submittedCount={completedCount}
                themeMode={themeMode}
            />
        </ScrollView>
    );
}

interface DashboardIdentityBarProps {
    readonly activeAuditorName: string;
    readonly auditorOrganization: string | null;
    readonly onLogout: () => unknown;
}

/** Compact identity and system-status bar shared by all three width tiers. */
function DashboardIdentityBar({
    activeAuditorName,
    auditorOrganization,
    onLogout,
}: Readonly<DashboardIdentityBarProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["dashboard", "common"]);
    const avatarSize = layout.isTablet ? 46 : 40;
    const actionSize = layout.isTablet ? 46 : 42;

    return (
        <XStack
            items="center"
            gap={layout.isTablet ? "$3" : "$2"}
            borderWidth={1}
            borderColor={ds.colors.border}
            rounded={layout.isTablet ? ds.radii.xl : ds.radii.lg}
            bg={ds.colors.surface}
            px={layout.isTablet ? 14 : 10}
            py={layout.isTablet ? 10 : 8}
            style={{ boxShadow: ds.shadows.card }}
        >
            <YStack
                width={avatarSize}
                height={avatarSize}
                items="center"
                justify="center"
                rounded={ds.radii.full}
                bg={ds.colors.primarySoft}
            >
                <UserRound size={layout.isTablet ? 22 : 19} color={ds.colors.primary} />
            </YStack>

            <YStack flex={1} minW={0} gap={1}>
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={layout.isTablet ? ds.typography.bodyLg.fontSize : ds.typography.bodyMd.fontSize}
                    numberOfLines={1}
                >
                    {activeAuditorName}
                </Text>
                {auditorOrganization === null ? null : (
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                        numberOfLines={1}
                    >
                        {auditorOrganization}
                    </Paragraph>
                )}
            </YStack>

            {layout.isTablet && layout.windowWidth >= 760 ? (
                <XStack items="center" gap="$2" rounded={ds.radii.full} bg={ds.colors.successSoft} px="$3" height={40}>
                    <WifiOff size={17} color={ds.colors.success} />
                    <Text
                        color={ds.colors.success}
                        fontFamily={ds.fonts.bodySemiBold}
                        fontSize={ds.typography.bodySm.fontSize}
                        numberOfLines={1}
                    >
                        {t("offlineReadyTitle", { ns: "dashboard" })}
                    </Text>
                </XStack>
            ) : null}

            <NotificationBellIcon />
            <Button
                unstyled
                width={actionSize}
                height={actionSize}
                items="center"
                justify="center"
                rounded={ds.radii.full}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surfaceMuted}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
                    void onLogout();
                }}
                accessibilityLabel={t("actions.signOut", { ns: "common" })}
                accessibilityRole="button"
            >
                <LogOut size={layout.isTablet ? 18 : 16} color={ds.colors.foreground} />
            </Button>
        </XStack>
    );
}

interface DashboardOverviewProps {
    readonly assignedCount: number;
    readonly completedCount: number;
    readonly dateLabel: string;
    readonly inProgressCount: number;
}

/** Editorial title block paired with a compact operational summary. */
function DashboardOverview({
    assignedCount,
    completedCount,
    dateLabel,
    inProgressCount,
}: Readonly<DashboardOverviewProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["dashboard", "common"]);

    const titleBlock = (
        <YStack gap="$2" minW={0}>
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={layout.isTablet ? ds.typography.bodyMd.fontSize : ds.typography.bodySm.fontSize}
            >
                {dateLabel}
            </Paragraph>
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.headingBold}
                fontSize={
                    layout.isWideTablet
                        ? ds.typography.displayLg.fontSize
                        : layout.isTablet
                          ? ds.typography.displayMd.fontSize
                          : ds.typography.displayMd.fontSize
                }
                lineHeight={
                    layout.isWideTablet
                        ? ds.typography.displayLg.lineHeight
                        : layout.isTablet
                          ? ds.typography.displayMd.lineHeight
                          : ds.typography.displayMd.lineHeight
                }
                letterSpacing={-0.7}
                numberOfLines={2}
                accessibilityRole="header"
            >
                {t("title", { ns: "dashboard" })}
            </Text>
            <YStack width={layout.isTablet ? 64 : 48} height={3} rounded={ds.radii.full} bg={ds.colors.primary} />
        </YStack>
    );

    /**
     * Title and pulse always stack so Field Priorities can use the full content
     * width on every tier. Tablet density is handled inside FieldPulse instead
     * of splitting this row into a side column.
     */
    return (
        <YStack gap="$4">
            {titleBlock}
            <FieldPulse
                assignedCount={assignedCount}
                completedCount={completedCount}
                inProgressCount={inProgressCount}
            />
        </YStack>
    );
}

interface FieldPulseProps {
    readonly assignedCount: number;
    readonly completedCount: number;
    readonly inProgressCount: number;
}

/**
 * Field-priorities pulse card.
 *
 * Phones stack the gauge above a compact horizontal legend. Tablets place a
 * vertical legend beside the gauge so the full-width card reads as one row.
 */
function FieldPulse({ assignedCount, completedCount, inProgressCount }: Readonly<FieldPulseProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["dashboard", "common"]);
    const placeLegendBesideGauge = layout.isTablet;
    const arcSize = layout.isWideTablet ? 220 : layout.isTablet ? 188 : 168;
    const arcStroke = layout.isTablet ? 10 : 9;
    const completionPercent =
        assignedCount === 0 ? 0 : Math.min(100, Math.round((completedCount / assignedCount) * 100));
    const completionBarWidth = `${completionPercent}%` as `${number}%`;
    const legend = [
        {
            id: "assigned",
            label: t("status.assigned", { ns: "common" }),
            value: assignedCount,
            color: ds.colors.primary,
        },
        {
            id: "completed",
            label: t("status.completed", { ns: "common" }),
            value: completedCount,
            color: ds.colors.success,
        },
        {
            id: "in-progress",
            label: t("status.inProgress", { ns: "common" }),
            value: inProgressCount,
            color: ds.colors.warning,
        },
    ] as const;

    const gauge = (
        <YStack items="center" gap="$1" shrink={0}>
            <YStack width={arcSize} height={Math.round(arcSize * 0.5)} overflow="hidden">
                <PulseArc diameter={arcSize} inset={0} strokeWidth={arcStroke} color={ds.colors.primary} />
                <PulseArc
                    diameter={arcSize}
                    inset={arcStroke * 1.75}
                    strokeWidth={arcStroke}
                    color={ds.colors.success}
                />
                <PulseArc
                    diameter={arcSize}
                    inset={arcStroke * 3.5}
                    strokeWidth={arcStroke}
                    color={ds.colors.warning}
                />
            </YStack>
            <XStack items="baseline" justify="center" gap="$1.5">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={layout.isTablet ? ds.typography.metricLg.fontSize : ds.typography.metricMd.fontSize}
                >
                    {String(completedCount)}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    / {String(assignedCount)}
                </Paragraph>
            </XStack>
            <YStack width={arcSize} height={4} rounded={ds.radii.full} bg={ds.colors.mutedSurface} overflow="hidden">
                <YStack height={4} width={completionBarWidth} rounded={ds.radii.full} bg={ds.colors.success} />
            </YStack>
        </YStack>
    );

    const verticalLegend = (
        <YStack flex={1} minW={0} justify="center">
            {legend.map((metric, index) => {
                return (
                    <YStack key={metric.id}>
                        {index === 0 ? null : <Separator borderColor={ds.colors.border} />}
                        <XStack
                            items="center"
                            justify="space-between"
                            gap="$4"
                            width="100%"
                            py={layout.isWideTablet ? "$3" : "$2.5"}
                        >
                            <Paragraph
                                flex={1}
                                minW={0}
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={
                                    layout.isWideTablet
                                        ? ds.typography.labelMd.fontSize
                                        : ds.typography.labelSm.fontSize
                                }
                                textTransform="uppercase"
                                letterSpacing={0.8}
                                numberOfLines={1}
                            >
                                {metric.label}
                            </Paragraph>
                            <Text
                                fontFamily={ds.fonts.headingBold}
                                fontSize={
                                    layout.isWideTablet
                                        ? ds.typography.metricMd.fontSize
                                        : ds.typography.metricSm.fontSize
                                }
                                style={{ color: metric.color }}
                            >
                                {String(metric.value)}
                            </Text>
                        </XStack>
                    </YStack>
                );
            })}
        </YStack>
    );

    const horizontalLegend = (
        <XStack items="stretch" width="100%">
            {legend.map((metric, index) => {
                return (
                    <XStack key={metric.id} flex={1} items="stretch">
                        {index === 0 ? null : <Separator vertical borderColor={ds.colors.border} mx="$2" />}
                        <YStack flex={1} gap="$1" items="center">
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelXs.fontSize}
                                textTransform="uppercase"
                                letterSpacing={0.7}
                                text="center"
                                numberOfLines={2}
                            >
                                {metric.label}
                            </Paragraph>
                            <Text
                                fontFamily={ds.fonts.headingBold}
                                fontSize={ds.typography.metricXs.fontSize}
                                style={{ color: metric.color }}
                            >
                                {String(metric.value)}
                            </Text>
                        </YStack>
                    </XStack>
                );
            })}
        </XStack>
    );

    return (
        <YStack
            borderWidth={1}
            width="100%"
            borderColor={ds.colors.border}
            rounded={ds.radii.xl}
            bg={ds.colors.surface}
            p={layout.isWideTablet ? 24 : layout.isTablet ? 20 : layout.cardPadding}
            gap={placeLegendBesideGauge ? "$4" : "$3"}
            style={{ boxShadow: ds.shadows.card }}
        >
            <Text
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelSm.fontSize}
                textTransform="uppercase"
                letterSpacing={2.2}
            >
                {t("fieldPriorities", { ns: "dashboard" })}
            </Text>

            {placeLegendBesideGauge ? (
                <XStack items="center" gap={layout.isWideTablet ? "$6" : "$4"} width="100%">
                    <YStack flex={layout.isWideTablet ? 1.05 : 1} minW={0} items="center" justify="center">
                        {gauge}
                    </YStack>
                    <Separator vertical self="stretch" borderColor={ds.colors.border} />
                    <YStack
                        flex={layout.isWideTablet ? 1.2 : 1.15}
                        minW={0}
                        justify="center"
                        pl={layout.isWideTablet ? "$2" : 0}
                    >
                        {verticalLegend}
                    </YStack>
                </XStack>
            ) : (
                <YStack items="center" gap="$3" width="100%">
                    {gauge}
                    {horizontalLegend}
                </YStack>
            )}
        </YStack>
    );
}

interface PulseArcProps {
    readonly color: string;
    readonly diameter: number;
    readonly inset: number;
    readonly strokeWidth: number;
}

/** A clipped circular border creates a dependency-free semicircular pulse arc. */
function PulseArc({ color, diameter, inset, strokeWidth }: Readonly<PulseArcProps>) {
    const resolvedDiameter = diameter - inset * 2;

    return (
        <YStack
            position="absolute"
            insetBlockStart={inset}
            insetInlineStart={inset}
            width={resolvedDiameter}
            height={resolvedDiameter}
            rounded={resolvedDiameter / 2}
            borderWidth={strokeWidth}
            style={{ borderColor: color }}
        />
    );
}

interface PriorityMissionProps {
    readonly dueLabelKey: PriorityDueLabelKey | null;
    readonly place: AuditorPlace;
    readonly progressBarWidth: number | `${number}%`;
    readonly progressLabel: string;
    readonly status: DerivedPlaceStatus;
}

/** Signature next-action panel with a compact portrait-first composition. */
function PriorityMission({
    dueLabelKey,
    place,
    progressBarWidth,
    progressLabel,
    status,
}: Readonly<PriorityMissionProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation(["dashboard", "common"]);
    const showUrgentBadge = dueLabelKey !== null;
    const locality = deriveLocality(place, "");
    const openPriorityAudit = () => {
        router.push(`/execute/${place.place_id}?projectId=${encodeURIComponent(place.project_id)}`);
    };

    const details = (
        <YStack flex={1} minW={0} gap={layout.isTablet ? "$3" : "$2.5"}>
            <XStack gap="$2" items="center" flexWrap="wrap">
                {showUrgentBadge ? (
                    <YStack rounded={ds.radii.sm} px="$3" py="$2" bg={ds.colors.primary}>
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelXs.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.4}
                            numberOfLines={1}
                        >
                            {t("urgentAudit", { ns: "dashboard" })}
                        </Text>
                    </YStack>
                ) : null}

                {locality.length === 0 ? null : (
                    <XStack
                        items="center"
                        gap="$2"
                        rounded={ds.radii.sm}
                        px="$3"
                        py="$2"
                        bg={ds.colors.primarySoft}
                        minW={0}
                    >
                        <MapPin size={14} color={ds.colors.primary} />
                        <Text
                            shrink={1}
                            color={ds.colors.secondaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelXs.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.1}
                            numberOfLines={1}
                        >
                            {locality}
                        </Text>
                    </XStack>
                )}
            </XStack>

            <YStack gap="$1.5" minW={0}>
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={layout.isWideTablet ? ds.typography.titleLg.fontSize : ds.typography.titleMd.fontSize}
                    lineHeight={
                        layout.isWideTablet ? ds.typography.titleLg.lineHeight : ds.typography.titleMd.lineHeight
                    }
                    numberOfLines={2}
                >
                    {place.place_name}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                    numberOfLines={2}
                >
                    {place.project_name}
                </Paragraph>
            </YStack>
        </YStack>
    );

    const progressAndAction = (
        <YStack width={layout.isTablet ? (layout.isWideTablet ? 310 : 236) : "100%"} gap="$3" justify="center">
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={
                    layout.isWideTablet
                        ? ds.typography.bodySm.fontSize
                        : layout.isTablet
                          ? ds.typography.labelSm.fontSize
                          : ds.typography.bodySm.fontSize
                }
                numberOfLines={2}
            >
                {progressLabel}
            </Paragraph>
            <YStack height={7} rounded={ds.radii.full} bg={ds.colors.mutedSurface} overflow="hidden">
                <YStack height={7} rounded={ds.radii.full} bg={ds.colors.primary} width={progressBarWidth} />
            </YStack>
            <AppButton
                variant="primary"
                size="compact"
                label={
                    status === "not_started"
                        ? t("actions.start", { ns: "common" })
                        : t("actions.resume", { ns: "common" })
                }
                iconRight={<Play size={14} color={buttonForegroundColor("primary", ds.colors)} />}
                onPress={openPriorityAudit}
            />
        </YStack>
    );

    return (
        <YStack gap="$3">
            <XStack items="center" justify="space-between" minH={ds.typography.labelSm.lineHeight}>
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelSm.fontSize}
                    textTransform="uppercase"
                    letterSpacing={2.2}
                >
                    {t("priorityTask", { ns: "dashboard" })}
                </Text>
                {dueLabelKey === null ? null : (
                    <Text
                        color={ds.colors.danger}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.5}
                    >
                        {t(dueLabelKey, { ns: "dashboard" })}
                    </Text>
                )}
            </XStack>

            <YStack
                position="relative"
                overflow="hidden"
                rounded={ds.radii.xl}
                borderWidth={1}
                borderColor={ds.colors.primary}
                bg={ds.colors.surface}
                pl={layout.isTablet ? 26 : 22}
                pr={layout.isTablet ? 22 : 20}
                py={layout.isTablet ? 20 : 18}
                style={{ boxShadow: ds.shadows.accent }}
            >
                <YStack
                    position="absolute"
                    insetInlineStart={0}
                    insetBlockStart={0}
                    insetBlockEnd={0}
                    width={7}
                    bg={ds.colors.primary}
                />
                {layout.isTablet ? (
                    <XStack items="stretch" gap={layout.isWideTablet ? "$6" : "$4"}>
                        {details}
                        {progressAndAction}
                    </XStack>
                ) : (
                    <YStack gap="$4">
                        {details}
                        {progressAndAction}
                    </YStack>
                )}
            </YStack>
        </YStack>
    );
}

interface ActiveFieldworkSectionProps {
    readonly places: readonly AuditorPlace[];
}

/** Numbered audit queue with one stable portrait row across phone and tablet. */
function ActiveFieldworkSection({ places }: Readonly<ActiveFieldworkSectionProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation(["dashboard", "common"]);

    return (
        <YStack gap="$3">
            <XStack items="center" justify="space-between">
                <Text
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelSm.fontSize}
                    textTransform="uppercase"
                    letterSpacing={2.2}
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
                        letterSpacing={1.4}
                    >
                        {t("actions.seeAll", { ns: "common" })}
                    </Text>
                </Button>
            </XStack>

            <YStack
                borderTopWidth={1}
                borderBottomWidth={1}
                borderColor={ds.colors.border}
                bg={layout.isTablet ? ds.colors.surface : undefined}
                rounded={layout.isTablet ? ds.radii.lg : 0}
                overflow="hidden"
                px={layout.isTablet ? "$3" : 0}
                style={layout.isTablet ? { boxShadow: ds.shadows.card } : undefined}
            >
                {places.map((place, index) => {
                    return (
                        <ActiveFieldworkRow
                            key={place.place_id}
                            index={index + 1}
                            isLast={index === places.length - 1}
                            place={place}
                        />
                    );
                })}
            </YStack>
        </YStack>
    );
}

interface ActiveFieldworkRowProps {
    readonly index: number;
    readonly isLast: boolean;
    readonly place: AuditorPlace;
}

function ActiveFieldworkRow({ index, isLast, place }: Readonly<ActiveFieldworkRowProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t, i18n } = useTranslation(["dashboard", "common"]);
    const status = derivePlaceRequirementStatus(place);
    const tone = getPlaceStatusTone(status, ds.colors);
    const progressValue = Math.min(100, Math.max(0, place.progress_percent ?? 0));
    const progressLabel = formatProgressPercentage(progressValue);
    const progressBarWidth = getVisibleProgressBarWidth(progressValue);
    const updatedLabel = formatRelativeTimeLabel(place.started_at, place.submitted_at, i18n.language, t);
    const constructSummary = formatScorePair(place.overall_scores) ?? undefined;
    const openAudit = () => {
        router.push(`/execute/${place.place_id}?projectId=${encodeURIComponent(place.project_id)}`);
    };

    const progressBlock = (
        <YStack flex={1} minW="max-content" gap={layout.isTablet ? "$2.5" : "$2"}>
            <XStack items="center" justify="space-between" gap="$2">
                <Paragraph
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyXs.fontSize}
                    numberOfLines={1}
                >
                    {t("mandatoryCompletion", { ns: "dashboard" })}
                </Paragraph>
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {progressLabel}%
                </Text>
            </XStack>
            <YStack height={6} rounded={ds.radii.full} bg={ds.colors.mutedSurface} overflow="hidden">
                <YStack height={6} rounded={ds.radii.full} bg={tone.accent} width={progressBarWidth} />
            </YStack>
        </YStack>
    );

    return (
        <XStack
            items="flex-start"
            gap={layout.isTablet ? "$2.5" : "$1.5"}
            px={layout.isTablet ? "$3.5" : "$3"}
            pt={layout.isTablet ? "$3.5" : "$3"}
            pb={layout.isTablet ? "$4" : "$3.5"}
            borderBottomWidth={isLast ? 0 : 1}
            borderBottomColor={ds.colors.border}
        >
            <Text
                width={layout.isTablet ? 44 : 36}
                color={tone.accent}
                fontFamily={ds.fonts.monoBold}
                fontSize={ds.typography.titleMd.fontSize}
                lineHeight={ds.typography.titleMd.lineHeight}
                numberOfLines={1}
            >
                {String(index).padStart(2, "0")}
            </Text>

            <XStack flex={1}>
                <YStack flex={1} gap={layout.isTablet ? "$3.5" : "$3"} minW="max-content">
                    <YStack flex={1} gap="$1.5">
                        <XStack items="center" gap="$2" flexWrap="wrap">
                            <StatusPill status={status} />
                            {constructSummary === undefined ? null : (
                                <Paragraph
                                    color={ds.colors.primary}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.bodyXs.fontSize}
                                    numberOfLines={1}
                                >
                                    {constructSummary}
                                </Paragraph>
                            )}
                        </XStack>
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={layout.isTablet ? ds.typography.titleMd.fontSize : ds.typography.titleSm.fontSize}
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

                    <YStack gap={layout.isTablet ? "$2.5" : "$2"}>
                        {progressBlock}
                        <XStack items="center" gap="$1.5">
                            <Clock3 size={13} color={ds.colors.mutedForeground} />
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                numberOfLines={1}
                            >
                                {updatedLabel}
                            </Paragraph>
                        </XStack>
                    </YStack>
                </YStack>
                <Button
                    unstyled
                    width={layout.isTablet ? 44 : 42}
                    height={layout.isTablet ? 44 : 42}
                    items="center"
                    justify="center"
                    position="absolute"
                    insetBlockStart={0}
                    insetInlineEnd={0}
                    rounded={ds.radii.full}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surfaceMuted}
                    pressStyle={{ opacity: 0.9, scale: 0.985 }}
                    onPress={openAudit}
                    accessibilityLabel={t("actions.openAudit", { ns: "common" })}
                >
                    <ArrowRight size={17} color={ds.colors.primary} />
                </Button>
            </XStack>
        </XStack>
    );
}

interface StatusPillProps {
    readonly status: DerivedPlaceStatus;
}

function StatusPill({ status }: Readonly<StatusPillProps>) {
    const ds = useDesignSystem();
    const { t } = useTranslation("common");
    const tone = getPlaceStatusTone(status, ds.colors);

    return (
        <YStack self="flex-start" rounded={ds.radii.full} px="$3" py="$1" bg={tone.surface}>
            <Text
                color={tone.text}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelXs.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
                numberOfLines={1}
            >
                {getPlaceStatusLabel(status, t)}
            </Text>
        </YStack>
    );
}

interface EvidenceAndReportsProps {
    readonly averageScores: SubmittedScoreSummary | null;
    readonly fontScale: number;
    readonly languagePreference: string;
    readonly submittedCount: number;
    readonly themeMode: string;
}

/** Connectivity and reporting form one compact evidence-and-sync band. */
function EvidenceAndReports({
    averageScores,
    fontScale,
    languagePreference,
    submittedCount,
    themeMode,
}: Readonly<EvidenceAndReportsProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation(["dashboard", "settings"]);

    const offlineBlock = (
        <XStack
            flex={layout.isTablet ? 0.85 : undefined}
            items="center"
            gap="$3"
            p={layout.isTablet ? "$4" : layout.cardPadding}
        >
            <YStack
                width={layout.isTablet ? 54 : 46}
                height={layout.isTablet ? 54 : 46}
                items="center"
                justify="center"
                rounded={ds.radii.md}
                bg={ds.colors.successSoft}
            >
                <WifiOff size={layout.isTablet ? 24 : 21} color={ds.colors.success} />
            </YStack>
            <YStack flex={1} minW={0} gap="$1">
                <Text
                    color={ds.colors.success}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.bodyMd.fontSize}
                    numberOfLines={1}
                >
                    {t("offlineReadyTitle", { ns: "dashboard" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                    numberOfLines={layout.isTablet ? 3 : 4}
                >
                    {t("offlineReadyDescription", { ns: "dashboard" })}
                </Paragraph>
            </YStack>
        </XStack>
    );

    const secondaryBlock =
        submittedCount > 0 ? (
            <ReportsEvidence averageScores={averageScores} submittedCount={submittedCount} />
        ) : (
            <PersonalizationEvidence
                fontScale={fontScale}
                languagePreference={languagePreference}
                onOpenSettings={() => {
                    router.push("/settings");
                }}
                themeMode={themeMode}
            />
        );

    return (
        <YStack gap="$3">
            <Text
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelSm.fontSize}
                textTransform="uppercase"
                letterSpacing={2.2}
            >
                {t("connectivityStatus", { ns: "dashboard" })}
            </Text>

            <YStack
                borderWidth={1}
                borderColor={ds.colors.border}
                rounded={ds.radii.xl}
                bg={ds.colors.surface}
                overflow="hidden"
                style={{ boxShadow: ds.shadows.card }}
            >
                {layout.isWideTablet ? (
                    <XStack items="stretch">
                        {offlineBlock}
                        <Separator vertical borderColor={ds.colors.border} />
                        <YStack flex={1.65}>{secondaryBlock}</YStack>
                    </XStack>
                ) : (
                    <YStack>
                        {offlineBlock}
                        <Separator borderColor={ds.colors.border} />
                        {secondaryBlock}
                    </YStack>
                )}
            </YStack>
        </YStack>
    );
}

interface ReportsEvidenceProps {
    readonly averageScores: SubmittedScoreSummary | null;
    readonly submittedCount: number;
}

function ReportsEvidence({ averageScores, submittedCount }: Readonly<ReportsEvidenceProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("dashboard");

    const reportCount = (
        <XStack items="center" gap="$3" flex={layout.isTablet ? 0.9 : undefined}>
            <YStack
                width={48}
                height={48}
                items="center"
                justify="center"
                rounded={ds.radii.md}
                bg={ds.colors.primarySoft}
            >
                <BarChart3 size={22} color={ds.colors.primary} />
            </YStack>
            <XStack items="center" gap="$3" flex={1} minW={0}>
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={ds.typography.metricLg.fontSize}
                >
                    {String(submittedCount)}
                </Text>
                <Paragraph
                    flex={1}
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.bodyXs.fontSize}
                    lineHeight={ds.typography.bodyXs.lineHeight}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                    numberOfLines={2}
                >
                    {t("reportsSummary.submitted").split(" ").join("\n")}
                </Paragraph>
            </XStack>
        </XStack>
    );

    const scoreMetrics =
        averageScores === null ? (
            <Paragraph
                flex={1}
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodySm.fontSize}
                numberOfLines={2}
            >
                {t("reportsSummary.noScores")}
            </Paragraph>
        ) : (
            <XStack flex={1.1} items="stretch" gap="$3" minW={0}>
                <EvidenceMetric
                    label={t("reportsSummary.avgPlayValue")}
                    value={formatScoreValue(averageScores.averagePlayValue)}
                />
                <Separator vertical borderColor={ds.colors.border} />
                <EvidenceMetric
                    label={t("reportsSummary.avgUsability")}
                    value={formatScoreValue(averageScores.averageUsability)}
                />
            </XStack>
        );

    return (
        <YStack p={layout.isTablet ? "$4" : layout.cardPadding} justify="center" flex={1}>
            {layout.isTablet ? (
                <XStack items="center" gap="$4">
                    {reportCount}
                    <Separator vertical borderColor={ds.colors.border} />
                    {scoreMetrics}
                </XStack>
            ) : (
                <YStack gap="$3">
                    {reportCount}
                    <Separator borderColor={ds.colors.border} />
                    {scoreMetrics}
                </YStack>
            )}
        </YStack>
    );
}

interface EvidenceMetricProps {
    readonly label: string;
    readonly value: string;
}

function EvidenceMetric({ label, value }: Readonly<EvidenceMetricProps>) {
    const ds = useDesignSystem();

    return (
        <YStack flex={1} minW={0}>
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelXs.fontSize}
                textTransform="uppercase"
                letterSpacing={1}
                numberOfLines={2}
            >
                {label}
            </Paragraph>
            <Text
                color={ds.colors.primary}
                fontFamily={ds.fonts.headingBold}
                fontSize={ds.typography.metricSm.fontSize}
            >
                {value}
            </Text>
        </YStack>
    );
}

interface PersonalizationEvidenceProps {
    readonly fontScale: number;
    readonly languagePreference: string;
    readonly onOpenSettings: () => void;
    readonly themeMode: string;
}

function PersonalizationEvidence({
    fontScale,
    languagePreference,
    onOpenSettings,
    themeMode,
}: Readonly<PersonalizationEvidenceProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["dashboard", "settings"]);
    const languageLabelKey: Record<string, string> = {
        system: "language.system",
        en: "language.english",
        de: "language.german",
        fr: "language.french",
        ja: "language.japanese",
        hi: "language.hindi",
    };

    return (
        <YStack p={layout.isTablet ? "$4" : layout.cardPadding} gap="$3">
            <XStack items="center" gap="$3">
                <YStack
                    width={48}
                    height={48}
                    items="center"
                    justify="center"
                    rounded={ds.radii.md}
                    bg={ds.colors.primarySoft}
                >
                    <SlidersHorizontal size={22} color={ds.colors.primary} />
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

            <XStack items="center" gap="$3" flexWrap="wrap">
                <EvidencePreference
                    label={t("personalize.theme", { ns: "dashboard" })}
                    value={t(`appearance.${themeMode}`, { ns: "settings" })}
                />
                <EvidencePreference
                    label={t("personalize.language", { ns: "dashboard" })}
                    value={t(languageLabelKey[languagePreference] ?? "language.english", {
                        ns: "settings",
                    })}
                />
                <EvidencePreference
                    label={t("personalize.textSize", { ns: "dashboard" })}
                    value={`${fontScale.toFixed(2)}×`}
                />
                <Button
                    unstyled
                    minW={150}
                    height={layout.compactControlHeight}
                    px="$3"
                    items="center"
                    justify="center"
                    rounded={ds.radii.sm}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surfaceMuted}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={onOpenSettings}
                >
                    <XStack items="center" gap="$2">
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
            </XStack>
        </YStack>
    );
}

interface EvidencePreferenceProps {
    readonly label: string;
    readonly value: string;
}

function EvidencePreference({ label, value }: Readonly<EvidencePreferenceProps>) {
    const ds = useDesignSystem();

    return (
        <YStack flex={1} minW={112} gap="$1">
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelXs.fontSize}
                textTransform="uppercase"
                letterSpacing={1}
            >
                {label}
            </Paragraph>
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodySemiBold}
                fontSize={ds.typography.bodySm.fontSize}
                numberOfLines={1}
            >
                {value}
            </Text>
        </YStack>
    );
}
