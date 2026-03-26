import { useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
    ArrowUpRight,
    BarChart3,
    Bell,
    ClipboardCheck,
    Clock3,
    LogOut,
    MapPinned,
    Play,
    ShieldCheck,
    UserRound,
    WifiOff,
} from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import { formatScoreValue, getCombinedConstructScore } from "lib/audit/score-helpers";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { useDesignSystem, getPlaceStatusTone } from "lib/design-system";
import { formatLongDateLabel, formatRelativeTimeLabel, getPlaceStatusLabel } from "lib/i18n/format";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import type { AuditorPlace } from "lib/audit/places-api";
import { useAuthStore } from "stores/auth-store";
import { usePlacesStore } from "stores/places-store";

/**
 * UI status derived from the backend `audit_status` value.
 */
type DerivedPlaceStatus = "not_started" | "in_progress" | "submitted";

/**
 * Map the backend `audit_status` to a local UI status string.
 *
 * @param auditStatus Raw audit status from the API (nullable).
 * @returns Normalised UI status used for pills and tone lookups.
 */
function derivePlaceStatus(auditStatus: AuditorPlace["audit_status"]): DerivedPlaceStatus {
    if (auditStatus === "SUBMITTED") {
        return "submitted";
    }
    if (auditStatus === "IN_PROGRESS" || auditStatus === "PAUSED") {
        return "in_progress";
    }
    return "not_started";
}

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

    useEffect(() => {
        if (session !== null) {
            loadPlaces(session).catch(() => undefined);
        }
    }, [session, loadPlaces]);

    const assignedCount = places.length;

    const completedCount = useMemo(() => {
        return places.filter((p) => p.audit_status === "SUBMITTED").length;
    }, [places]);

    const inProgressCount = useMemo(() => {
        return places.filter((p) => p.audit_status === "IN_PROGRESS").length;
    }, [places]);

    const notStartedCount = useMemo(() => {
        return places.filter((p) => p.audit_status === null).length;
    }, [places]);

    const submittedCount = completedCount;

    const highlightedPlaces = useMemo(() => {
        return places.filter((p) => p.audit_status !== "SUBMITTED").slice(0, 3);
    }, [places]);

    const priorityPlace = useMemo<AuditorPlace | undefined>(() => {
        const inProgress = places.find(
            (p) => p.audit_status === "IN_PROGRESS" || p.audit_status === "PAUSED",
        );
        if (inProgress !== undefined) {
            return inProgress;
        }
        const notStarted = places.find((p) => p.audit_status === null);
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

    const activeAuditorName =
        session?.user.name ?? session?.user.email ?? t("activeAuditor", { ns: "dashboard" });

    const dateLabel = useMemo(() => {
        return formatLongDateLabel(i18n.language);
    }, [i18n.language]);

    if (isLoading && places.length === 0) {
        return (
            <YStack flex={1} items="center" justify="center" bg={ds.colors.background}>
                <ActivityIndicator size="large" color={ds.colors.primary} />
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    mt="$4"
                >
                    {t("loadingPlaces", { ns: "dashboard" })}
                </Paragraph>
            </YStack>
        );
    }

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 92,
                gap: layout.isTablet ? 32 : 28,
            })}
        >
            <YStack gap="$6">
                <XStack justify="space-between" items="center" gap="$3">
                    <XStack items="center" gap="$3" flex={1}>
                        <YStack
                            width={layout.isTablet ? 52 : 44}
                            height={layout.isTablet ? 52 : 44}
                            items="center"
                            justify="center"
                            rounded={ds.radii.md}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.surfaceMuted}
                        >
                            <UserRound size={layout.isTablet ? 22 : 20} color={ds.colors.primary} />
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
                        </YStack>
                    </XStack>

                    <XStack gap="$2">
                        <YStack
                            width={layout.isTablet ? 46 : 42}
                            height={layout.isTablet ? 46 : 42}
                            items="center"
                            justify="center"
                            rounded={ds.radii.full}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.surfaceMuted}
                        >
                            <Bell size={layout.isTablet ? 20 : 18} color={ds.colors.foreground} />
                        </YStack>
                        <Button
                            width={layout.isTablet ? 46 : 42}
                            height={layout.isTablet ? 46 : 42}
                            p={0}
                            rounded={ds.radii.full}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.surfaceMuted}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={logout}
                        >
                            <LogOut size={layout.isTablet ? 18 : 16} color={ds.colors.foreground} />
                        </Button>
                    </XStack>
                </XStack>

                <YStack gap="$1.5">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={ds.typography.displayLg.fontSize}
                        lineHeight={ds.typography.displayLg.lineHeight}
                        letterSpacing={-0.8}
                    >
                        {t("title", { ns: "dashboard" })}
                    </Text>
                    <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodySemiBold}>
                        {dateLabel}
                    </Paragraph>
                </YStack>

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
                                {assignedCount.toString().padStart(2, "0")}
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
                        <MapPinned
                            size={layout.isTablet ? 32 : 28}
                            color="rgba(255, 107, 0, 0.25)"
                        />
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
                                {completedCount.toString().padStart(2, "0")}
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
                        <ShieldCheck
                            size={layout.isTablet ? 32 : 28}
                            color="rgba(16, 185, 129, 0.28)"
                        />
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
                    <Paragraph
                        color={ds.colors.danger}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.3}
                    >
                        {t("dueToday", { ns: "dashboard" })}
                    </Paragraph>
                </XStack>

                {priorityPlace === undefined ? null : (
                    <YStack
                        rounded={ds.radii.lg}
                        borderWidth={2}
                        borderColor={ds.colors.primary}
                        bg={ds.colors.surface}
                        overflow="hidden"
                        style={{
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
                                <YStack
                                    rounded={ds.radii.sm}
                                    px="$2"
                                    py="$1"
                                    bg={ds.colors.primary}
                                >
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
                                <YStack
                                    rounded={ds.radii.sm}
                                    px="$2"
                                    py="$1"
                                    bg={ds.colors.surfaceMuted}
                                >
                                    <Text
                                        color={ds.colors.secondaryForeground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.labelXs.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1.3}
                                    >
                                        {deriveLocality(
                                            priorityPlace,
                                            t("place.assignedPlace", { ns: "common" }),
                                        )}
                                    </Text>
                                </YStack>
                            </XStack>

                            <YStack gap="$1">
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
                                    fontSize={ds.typography.titleSm.fontSize}
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
                                        width={`${priorityPlace.progress_percent ?? 0}%`}
                                    />
                                </YStack>
                                <Text
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.monoBold}
                                    fontSize={ds.typography.labelSm.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.1}
                                >
                                    {t("priorityProgress", {
                                        ns: "dashboard",
                                        percent: priorityPlace.progress_percent ?? 0,
                                        code: priorityPlace.place_id.slice(-8).toUpperCase(),
                                    })}
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
                                        `/(tabs)/execute/${priorityPlace.place_id}?projectId=${encodeURIComponent(priorityPlace.project_id)}`,
                                    );
                                }}
                            >
                                <XStack items="center" gap="$2">
                                    <Text
                                        color={ds.colors.primaryForeground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.labelMd.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1.2}
                                    >
                                        {t("actions.resume", { ns: "common" })}
                                    </Text>
                                    <Play size={14} color={ds.colors.primaryForeground} />
                                </XStack>
                            </Button>
                        </XStack>
                    </YStack>
                )}
            </YStack>

            <XStack gap="$3">
                <Button
                    flex={1}
                    height={layout.controlHeight}
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surfaceMuted}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push("/places");
                    }}
                >
                    <XStack items="center" gap="$2">
                        <MapPinned size={16} color={ds.colors.foreground} />
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            {t("tabs.places", { ns: "common" })}
                        </Text>
                    </XStack>
                </Button>

                <Button
                    flex={1}
                    height={layout.controlHeight}
                    rounded={ds.radii.md}
                    borderWidth={0}
                    bg={ds.colors.primary}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push("/execute");
                    }}
                >
                    <XStack items="center" gap="$2">
                        <ClipboardCheck size={16} color={ds.colors.primaryForeground} />
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            {t("tabs.execute", { ns: "common" })}
                        </Text>
                    </XStack>
                </Button>

                <Button
                    flex={1}
                    height={layout.controlHeight}
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surfaceMuted}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push("/reports");
                    }}
                >
                    <XStack items="center" gap="$2">
                        <BarChart3 size={16} color={ds.colors.foreground} />
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            {t("tabs.reports", { ns: "common" })}
                        </Text>
                    </XStack>
                </Button>
            </XStack>

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
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                            >
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
                                    mt="$2"
                                >
                                    {item.value}
                                </Text>
                            </YStack>
                        );
                    })}
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

                <YStack gap="$3">
                    {highlightedPlaces.map((place) => {
                        const status = derivePlaceStatus(place.audit_status);
                        const placeTone = getPlaceStatusTone(status, ds.colors);
                        const progressPercent = place.progress_percent ?? 0;
                        const combinedConstructScore =
                            getCombinedConstructScore(place.score_totals) ?? place.summary_score;
                        const updatedLabel = formatRelativeTimeLabel(
                            place.started_at,
                            place.submitted_at,
                            i18n.language,
                            t,
                        );

                        return (
                            <YStack
                                key={place.place_id}
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
                                <XStack justify="space-between" items="flex-start" gap="$3">
                                    <YStack flex={1} gap="$1">
                                        <Text
                                            color={ds.colors.foreground}
                                            fontFamily={ds.fonts.bodyBold}
                                            fontSize={ds.typography.titleMd.fontSize}
                                        >
                                            {place.place_name}
                                        </Text>
                                        <Paragraph
                                            color={ds.colors.mutedForeground}
                                            fontFamily={ds.fonts.bodyMedium}
                                            fontSize={ds.typography.bodyMd.fontSize}
                                        >
                                            {place.project_name}
                                        </Paragraph>
                                    </YStack>
                                    <YStack
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
                                </XStack>

                                <XStack justify="space-between" items="center">
                                    <Paragraph
                                        color={ds.colors.mutedForeground}
                                        fontFamily={ds.fonts.bodyMedium}
                                        fontSize={ds.typography.bodyMd.fontSize}
                                    >
                                        {`${t("mandatoryCompletion", {
                                            ns: "dashboard",
                                        })} ${progressPercent}%`}
                                    </Paragraph>
                                    <Paragraph
                                        color={ds.colors.primary}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.bodyMd.fontSize}
                                    >
                                        {combinedConstructScore === null
                                            ? "--"
                                            : `${t("constructScore", {
                                                  ns: "dashboard",
                                              })} ${formatScoreValue(combinedConstructScore)}`}
                                    </Paragraph>
                                </XStack>

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
                                        width={`${progressPercent}%`}
                                    />
                                </YStack>

                                <XStack justify="space-between" items="center">
                                    <XStack items="center" gap="$1.5">
                                        <Clock3 size={13} color={ds.colors.mutedForeground} />
                                        <Paragraph
                                            color={ds.colors.mutedForeground}
                                            fontFamily={ds.fonts.bodyMedium}
                                            fontSize={ds.typography.bodyMd.fontSize}
                                        >
                                            {updatedLabel}
                                        </Paragraph>
                                    </XStack>
                                    <Button
                                        height={layout.isTablet ? 38 : 32}
                                        px="$4"
                                        rounded={ds.radii.sm}
                                        borderWidth={0}
                                        bg={ds.colors.primary}
                                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                        onPress={() => {
                                            router.push(
                                                `/(tabs)/execute/${place.place_id}?projectId=${encodeURIComponent(place.project_id)}`,
                                            );
                                        }}
                                    >
                                        <XStack items="center" gap="$1.5">
                                            <Text
                                                color={ds.colors.primaryForeground}
                                                fontFamily={ds.fonts.bodyBold}
                                                fontSize={ds.typography.labelSm.fontSize}
                                                textTransform="uppercase"
                                                letterSpacing={1.2}
                                            >
                                                {t("actions.openAudit", { ns: "common" })}
                                            </Text>
                                            <ArrowUpRight
                                                size={14}
                                                color={ds.colors.primaryForeground}
                                            />
                                        </XStack>
                                    </Button>
                                </XStack>

                                <Separator borderColor={ds.colors.border} opacity={0} />
                            </YStack>
                        );
                    })}
                </YStack>
            </YStack>
        </ScrollView>
    );
}
