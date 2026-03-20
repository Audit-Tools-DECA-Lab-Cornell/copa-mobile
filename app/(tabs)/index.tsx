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
import { Button, Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import { designSystem, getPlaceStatusTone } from "lib/design-system";
import type { AuditorPlace } from "lib/audit/places-api";
import { useAuthStore } from "stores/auth-store";
import { usePlacesStore } from "stores/places-store";

/**
 * UI status derived from the backend `audit_status` value.
 */
type DerivedPlaceStatus = "not_started" | "in_progress" | "submitted";

/**
 * Labels displayed inside status pills.
 */
const PLACE_STATUS_LABELS: Record<DerivedPlaceStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    submitted: "Submitted",
};

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
 * Build a human-readable relative-time label from ISO timestamps.
 *
 * @param startedAt  ISO date string for when the audit was started.
 * @param submittedAt ISO date string for when the audit was submitted.
 * @returns Short relative-time string such as "2 days ago" or "Not started".
 */
function deriveUpdatedAtLabel(startedAt: string | null, submittedAt: string | null): string {
    const iso = submittedAt ?? startedAt;
    if (iso === null) {
        return "Not started";
    }

    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) {
        return "Just now";
    }

    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) {
        return "Just now";
    }
    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days === 1) {
        return "1 day ago";
    }
    return `${days} days ago`;
}

/**
 * Build a locality string from city and country fields.
 *
 * @param place Auditor place record.
 * @returns Comma-separated locality or fallback text.
 */
function deriveLocality(place: AuditorPlace): string {
    const parts = [place.city, place.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Assigned place";
}

/**
 * Dashboard tab for playspace field operations.
 * Displays real-time metrics, priority tasks, and active work cards
 * sourced from the auditor's assigned places API.
 */
export default function DashboardScreen() {
    const router = useRouter();
    const session = useAuthStore((state) => state.session);
    const logout = useAuthStore((state) => state.logout);
    const places = usePlacesStore((state) => state.places);
    const isLoading = usePlacesStore((state) => state.isLoading);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);

    useEffect(() => {
        if (session !== null) {
            void loadPlaces(session);
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
            { id: "priority-in-progress", title: "In Progress", value: String(inProgressCount) },
            { id: "priority-not-started", title: "Not Started", value: String(notStartedCount) },
            { id: "priority-submitted", title: "Submitted", value: String(submittedCount) },
        ] as const;
    }, [inProgressCount, notStartedCount, submittedCount]);

    const activeAuditorName = session?.user.name ?? session?.user.email ?? "Active auditor";

    const dateLabel = useMemo(() => {
        return new Date().toLocaleDateString("en-NZ", {
            month: "long",
            day: "numeric",
            year: "numeric",
            weekday: "long",
        });
    }, []);

    if (isLoading && places.length === 0) {
        return (
            <YStack flex={1} items="center" justify="center" bg={designSystem.colors.background}>
                <ActivityIndicator size="large" color={designSystem.colors.primary} />
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    mt="$4"
                >
                    Loading your places…
                </Paragraph>
            </YStack>
        );
    }

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: designSystem.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: designSystem.spacing.screenPaddingHorizontal,
                paddingTop: designSystem.spacing.screenPaddingVertical,
                paddingBottom: 92,
                gap: 28,
            }}
        >
            <YStack gap="$6">
                <XStack justify="space-between" items="center" gap="$3">
                    <XStack items="center" gap="$3" flex={1}>
                        <YStack
                            width={44}
                            height={44}
                            items="center"
                            justify="center"
                            rounded={designSystem.radii.md}
                            borderWidth={1}
                            borderColor={designSystem.colors.border}
                            bg={designSystem.colors.surfaceMuted}
                        >
                            <UserRound size={20} color={designSystem.colors.primary} />
                        </YStack>
                        <YStack flex={1} gap="$0.5">
                            <Paragraph
                                color={designSystem.colors.mutedForeground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={designSystem.typography.labelXs.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.4}
                            >
                                Active auditor
                            </Paragraph>
                            <Text
                                color={designSystem.colors.foreground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={designSystem.typography.bodyLg.fontSize}
                            >
                                {activeAuditorName}
                            </Text>
                        </YStack>
                    </XStack>

                    <XStack gap="$2">
                        <YStack
                            width={42}
                            height={42}
                            items="center"
                            justify="center"
                            rounded={designSystem.radii.full}
                            borderWidth={1}
                            borderColor={designSystem.colors.border}
                            bg={designSystem.colors.surfaceMuted}
                        >
                            <Bell size={18} color={designSystem.colors.foreground} />
                        </YStack>
                        <Button
                            width={42}
                            height={42}
                            p={0}
                            rounded={designSystem.radii.full}
                            borderWidth={1}
                            borderColor={designSystem.colors.border}
                            bg={designSystem.colors.surfaceMuted}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={logout}
                        >
                            <LogOut size={16} color={designSystem.colors.foreground} />
                        </Button>
                    </XStack>
                </XStack>

                <YStack gap="$1.5">
                    <Text
                        color={designSystem.colors.foreground}
                        fontFamily={designSystem.fonts.headingBold}
                        fontSize={designSystem.typography.displayLg.fontSize}
                        lineHeight={designSystem.typography.displayLg.lineHeight}
                        letterSpacing={-0.8}
                    >
                        Field Dashboard
                    </Text>
                    <Paragraph
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodySemiBold}
                    >
                        {dateLabel}
                    </Paragraph>
                </YStack>

                <XStack gap="$3">
                    <YStack
                        flex={1}
                        height={128}
                        justify="space-between"
                        rounded={designSystem.radii.lg}
                        borderWidth={1}
                        borderColor={designSystem.colors.border}
                        bg={designSystem.colors.surface}
                        p="$4"
                        style={{
                            boxShadow: designSystem.shadows.card,
                        }}
                    >
                        <YStack gap="$1">
                            <Text
                                color={designSystem.colors.primary}
                                fontFamily={designSystem.fonts.headingBold}
                                fontSize={designSystem.typography.displayLg.fontSize}
                                lineHeight={designSystem.typography.displayLg.lineHeight}
                            >
                                {assignedCount.toString().padStart(2, "0")}
                            </Text>
                            <Paragraph
                                color={designSystem.colors.mutedForeground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={designSystem.typography.labelSm.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.5}
                            >
                                Assigned
                            </Paragraph>
                        </YStack>
                        <MapPinned size={28} color="rgba(255, 107, 0, 0.25)" />
                    </YStack>

                    <YStack
                        flex={1}
                        height={128}
                        justify="space-between"
                        rounded={designSystem.radii.lg}
                        borderWidth={1}
                        borderColor={designSystem.colors.border}
                        bg={designSystem.colors.surface}
                        p="$4"
                        style={{
                            boxShadow: designSystem.shadows.card,
                        }}
                    >
                        <YStack gap="$1">
                            <Text
                                color={designSystem.colors.success}
                                fontFamily={designSystem.fonts.headingBold}
                                fontSize={designSystem.typography.displayLg.fontSize}
                                lineHeight={designSystem.typography.displayLg.lineHeight}
                            >
                                {completedCount.toString().padStart(2, "0")}
                            </Text>
                            <Paragraph
                                color={designSystem.colors.mutedForeground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={designSystem.typography.labelSm.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.5}
                            >
                                Completed
                            </Paragraph>
                        </YStack>
                        <ShieldCheck size={28} color="rgba(16, 185, 129, 0.28)" />
                    </YStack>
                </XStack>
            </YStack>

            <YStack gap="$3">
                <XStack justify="space-between" items="center">
                    <Text
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.6}
                    >
                        Priority task
                    </Text>
                    <Paragraph
                        color={designSystem.colors.danger}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.3}
                    >
                        Due today
                    </Paragraph>
                </XStack>

                {priorityPlace === undefined ? null : (
                    <YStack
                        rounded={designSystem.radii.lg}
                        borderWidth={2}
                        borderColor={designSystem.colors.primary}
                        bg={designSystem.colors.surface}
                        overflow="hidden"
                        style={{
                            boxShadow: designSystem.shadows.card,
                        }}
                    >
                        <YStack
                            p="$4"
                            gap="$3"
                            bg={designSystem.colors.surface}
                            style={{
                                backgroundColor: designSystem.colors.surface,
                            }}
                        >
                            <XStack gap="$2" items="center" flexWrap="wrap">
                                <YStack
                                    rounded={designSystem.radii.sm}
                                    px="$2"
                                    py="$1"
                                    bg={designSystem.colors.primary}
                                >
                                    <Text
                                        color={designSystem.colors.primaryForeground}
                                        fontFamily={designSystem.fonts.bodyBold}
                                        fontSize={designSystem.typography.labelXs.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1.3}
                                    >
                                        Urgent audit
                                    </Text>
                                </YStack>
                                <YStack
                                    rounded={designSystem.radii.sm}
                                    px="$2"
                                    py="$1"
                                    bg={designSystem.colors.surfaceMuted}
                                >
                                    <Text
                                        color={designSystem.colors.secondaryForeground}
                                        fontFamily={designSystem.fonts.bodyBold}
                                        fontSize={designSystem.typography.labelXs.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1.3}
                                    >
                                        {deriveLocality(priorityPlace)}
                                    </Text>
                                </YStack>
                            </XStack>

                            <YStack gap="$1">
                                <Text
                                    color={designSystem.colors.foreground}
                                    fontFamily={designSystem.fonts.headingBold}
                                    fontSize={designSystem.typography.metricMd.fontSize}
                                    lineHeight={designSystem.typography.metricMd.lineHeight}
                                >
                                    {priorityPlace.place_name}
                                </Text>
                                <Paragraph
                                    color={designSystem.colors.mutedForeground}
                                    fontFamily={designSystem.fonts.bodyMedium}
                                    fontSize={designSystem.typography.titleMd.fontSize}
                                >
                                    {priorityPlace.project_name}
                                </Paragraph>
                            </YStack>
                        </YStack>

                        <XStack
                            items="center"
                            gap="$4"
                            p="$4"
                            borderTopWidth={1}
                            borderTopColor={designSystem.colors.border}
                        >
                            <YStack flex={1} gap="$2">
                                <YStack
                                    height={6}
                                    rounded={designSystem.radii.full}
                                    bg={designSystem.colors.mutedSurface}
                                    overflow="hidden"
                                >
                                    <YStack
                                        height={6}
                                        rounded={designSystem.radii.full}
                                        bg={designSystem.colors.primary}
                                        width={`${priorityPlace.progress_percent ?? 0}%`}
                                    />
                                </YStack>
                                <Text
                                    color={designSystem.colors.mutedForeground}
                                    fontFamily={designSystem.fonts.monoBold}
                                    fontSize={designSystem.typography.labelSm.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.1}
                                >
                                    {priorityPlace.progress_percent ?? 0}% progress •{" "}
                                    {priorityPlace.place_id.slice(-8).toUpperCase()}
                                </Text>
                            </YStack>
                            <Button
                                height={40}
                                px="$4"
                                rounded={designSystem.radii.sm}
                                borderWidth={0}
                                bg={designSystem.colors.primary}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    router.push(`/(tabs)/execute/${priorityPlace.place_id}`);
                                }}
                            >
                                <XStack items="center" gap="$2">
                                    <Text
                                        color={designSystem.colors.primaryForeground}
                                        fontFamily={designSystem.fonts.bodyBold}
                                        fontSize={designSystem.typography.labelMd.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={1.2}
                                    >
                                        Resume
                                    </Text>
                                    <Play size={14} color={designSystem.colors.primaryForeground} />
                                </XStack>
                            </Button>
                        </XStack>
                    </YStack>
                )}
            </YStack>

            <XStack gap="$3">
                <Button
                    flex={1}
                    height={48}
                    rounded={designSystem.radii.md}
                    borderWidth={1}
                    borderColor={designSystem.colors.border}
                    bg={designSystem.colors.surfaceMuted}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push("/places");
                    }}
                >
                    <XStack items="center" gap="$2">
                        <MapPinned size={16} color={designSystem.colors.foreground} />
                        <Text
                            color={designSystem.colors.foreground}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={designSystem.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            Places
                        </Text>
                    </XStack>
                </Button>

                <Button
                    flex={1}
                    height={48}
                    rounded={designSystem.radii.md}
                    borderWidth={0}
                    bg={designSystem.colors.primary}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push("/execute");
                    }}
                >
                    <XStack items="center" gap="$2">
                        <ClipboardCheck size={16} color={designSystem.colors.primaryForeground} />
                        <Text
                            color={designSystem.colors.primaryForeground}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={designSystem.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            Execute
                        </Text>
                    </XStack>
                </Button>

                <Button
                    flex={1}
                    height={48}
                    rounded={designSystem.radii.md}
                    borderWidth={1}
                    borderColor={designSystem.colors.border}
                    bg={designSystem.colors.surfaceMuted}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push("/reports");
                    }}
                >
                    <XStack items="center" gap="$2">
                        <BarChart3 size={16} color={designSystem.colors.foreground} />
                        <Text
                            color={designSystem.colors.foreground}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={designSystem.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            Reports
                        </Text>
                    </XStack>
                </Button>
            </XStack>

            <YStack gap="$3">
                <Text
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyBold}
                    fontSize={designSystem.typography.labelSm.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.6}
                >
                    Connectivity status
                </Text>

                <YStack
                    borderWidth={1}
                    borderColor={designSystem.colors.border}
                    rounded={designSystem.radii.lg}
                    p="$4"
                    gap="$3"
                    bg={designSystem.colors.surfaceMuted}
                    style={{
                        boxShadow: designSystem.shadows.card,
                    }}
                >
                    <XStack items="center" gap="$3">
                        <YStack
                            width={44}
                            height={44}
                            items="center"
                            justify="center"
                            rounded={designSystem.radii.md}
                            bg={designSystem.colors.successSoft}
                        >
                            <WifiOff size={22} color={designSystem.colors.success} />
                        </YStack>
                        <YStack flex={1} gap="$1">
                            <Text
                                color={designSystem.colors.foreground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={designSystem.typography.bodyLg.fontSize}
                            >
                                Offline ready
                            </Text>
                            <Paragraph
                                color={designSystem.colors.mutedForeground}
                                fontFamily={designSystem.fonts.bodyMedium}
                            >
                                Assigned audit data is stored locally and ready for field use.
                            </Paragraph>
                        </YStack>
                    </XStack>
                </YStack>
            </YStack>

            <YStack gap="$3">
                <XStack justify="space-between" items="center">
                    <Text
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.6}
                    >
                        Field priorities
                    </Text>
                    <Text
                        color={designSystem.colors.primary}
                        fontFamily={designSystem.fonts.monoBold}
                        fontSize={designSystem.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.1}
                    >
                        {fieldReadinessPercent}% ready
                    </Text>
                </XStack>

                <XStack gap="$2.5">
                    {fieldPriorityItems.map((item) => {
                        return (
                            <YStack
                                key={item.id}
                                flex={1}
                                rounded={designSystem.radii.md}
                                borderWidth={1}
                                borderColor={designSystem.colors.border}
                                bg={designSystem.colors.surface}
                                justify="space-between"
                                p="$2.5"
                            >
                                <Paragraph
                                    color={designSystem.colors.mutedForeground}
                                    fontFamily={designSystem.fonts.bodyBold}
                                    fontSize={designSystem.typography.labelXs.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.2}
                                >
                                    {item.title}
                                </Paragraph>
                                <Text
                                    color={designSystem.colors.foreground}
                                    fontFamily={designSystem.fonts.headingBold}
                                    fontSize={designSystem.typography.metricMd.fontSize}
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
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.labelSm.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.6}
                    >
                        Active work
                    </Text>
                    <Button
                        chromeless
                        onPress={() => {
                            router.push("/places");
                        }}
                    >
                        <Text
                            color={designSystem.colors.primary}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={designSystem.typography.labelSm.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.3}
                        >
                            See all
                        </Text>
                    </Button>
                </XStack>

                <YStack gap="$3">
                    {highlightedPlaces.map((place) => {
                        const status = derivePlaceStatus(place.audit_status);
                        const placeTone = getPlaceStatusTone(status);
                        const progressPercent = place.progress_percent ?? 0;
                        const auditScore = place.summary_score ?? 0;
                        const updatedLabel = deriveUpdatedAtLabel(
                            place.started_at,
                            place.submitted_at,
                        );

                        return (
                            <YStack
                                key={place.place_id}
                                rounded={designSystem.radii.lg}
                                borderWidth={1}
                                borderColor={designSystem.colors.border}
                                bg={designSystem.colors.surface}
                                p="$4"
                                gap="$3"
                                style={{
                                    boxShadow: designSystem.shadows.card,
                                }}
                            >
                                <XStack justify="space-between" items="flex-start" gap="$3">
                                    <YStack flex={1} gap="$1">
                                        <Text
                                            color={designSystem.colors.foreground}
                                            fontFamily={designSystem.fonts.bodyBold}
                                            fontSize={designSystem.typography.titleMd.fontSize}
                                        >
                                            {place.place_name}
                                        </Text>
                                        <Paragraph
                                            color={designSystem.colors.mutedForeground}
                                            fontFamily={designSystem.fonts.bodyMedium}
                                            fontSize={designSystem.typography.bodyMd.fontSize}
                                        >
                                            {place.project_name}
                                        </Paragraph>
                                    </YStack>
                                    <YStack
                                        rounded={designSystem.radii.full}
                                        px="$3"
                                        py="$1"
                                        style={{ backgroundColor: placeTone.surface }}
                                    >
                                        <Text
                                            style={{ color: placeTone.text }}
                                            fontFamily={designSystem.fonts.bodyBold}
                                            fontSize={designSystem.typography.labelXs.fontSize}
                                            textTransform="uppercase"
                                            letterSpacing={1.2}
                                        >
                                            {PLACE_STATUS_LABELS[status]}
                                        </Text>
                                    </YStack>
                                </XStack>

                                <XStack justify="space-between" items="center">
                                    <Paragraph
                                        color={designSystem.colors.mutedForeground}
                                        fontFamily={designSystem.fonts.bodyMedium}
                                        fontSize={designSystem.typography.bodyMd.fontSize}
                                    >
                                        Mandatory completion {progressPercent}%
                                    </Paragraph>
                                    <Paragraph
                                        color={designSystem.colors.primary}
                                        fontFamily={designSystem.fonts.bodyBold}
                                        fontSize={designSystem.typography.bodyMd.fontSize}
                                    >
                                        Audit {auditScore}%
                                    </Paragraph>
                                </XStack>

                                <YStack
                                    height={6}
                                    rounded={designSystem.radii.full}
                                    bg={designSystem.colors.mutedSurface}
                                    overflow="hidden"
                                >
                                    <YStack
                                        height={6}
                                        rounded={designSystem.radii.full}
                                        bg={designSystem.colors.primary}
                                        width={`${progressPercent}%`}
                                    />
                                </YStack>

                                <XStack justify="space-between" items="center">
                                    <XStack items="center" gap="$1.5">
                                        <Clock3
                                            size={13}
                                            color={designSystem.colors.mutedForeground}
                                        />
                                        <Paragraph
                                            color={designSystem.colors.mutedForeground}
                                            fontFamily={designSystem.fonts.bodyMedium}
                                            fontSize={designSystem.typography.bodyMd.fontSize}
                                        >
                                            {updatedLabel}
                                        </Paragraph>
                                    </XStack>
                                    <Button
                                        height={32}
                                        px="$4"
                                        rounded={designSystem.radii.sm}
                                        borderWidth={0}
                                        bg={designSystem.colors.primary}
                                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                        onPress={() => {
                                            router.push(`/(tabs)/execute/${place.place_id}`);
                                        }}
                                    >
                                        <XStack items="center" gap="$1.5">
                                            <Text
                                                color={designSystem.colors.primaryForeground}
                                                fontFamily={designSystem.fonts.bodyBold}
                                                fontSize={designSystem.typography.labelSm.fontSize}
                                                textTransform="uppercase"
                                                letterSpacing={1.2}
                                            >
                                                Open audit
                                            </Text>
                                            <ArrowUpRight
                                                size={14}
                                                color={designSystem.colors.primaryForeground}
                                            />
                                        </XStack>
                                    </Button>
                                </XStack>

                                <Separator borderColor={designSystem.colors.border} opacity={0} />
                            </YStack>
                        );
                    })}
                </YStack>
            </YStack>
        </ScrollView>
    );
}
