import { useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Clock3, LocateFixed, MapPin } from "@tamagui/lucide-icons";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { designSystem, getPlaceStatusTone, type DesignTone } from "lib/design-system";
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
 * Build a locality string from city, province, and country fields.
 *
 * @param place Auditor place record.
 * @returns Comma-separated locality or fallback text.
 */
function deriveLocality(place: AuditorPlace): string {
    const parts = [place.city, place.province, place.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Assigned place";
}

/**
 * Assigned places tab for auditor field execution.
 * Displays the full list of places from the auditor's assignment API,
 * with status pills, progress bars, and score tiles.
 */
export default function PlacesScreen() {
    const router = useRouter();
    const session = useAuthStore((state) => state.session);
    const places = usePlacesStore((state) => state.places);
    const isLoading = usePlacesStore((state) => state.isLoading);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);

    useEffect(() => {
        if (session !== null) {
            void loadPlaces(session);
        }
    }, [session, loadPlaces]);

    const placeStatusCounts = useMemo(() => {
        return places.reduce(
            (accumulator, place) => {
                const status = derivePlaceStatus(place.audit_status);
                accumulator[status] += 1;
                return accumulator;
            },
            {
                not_started: 0,
                in_progress: 0,
                submitted: 0,
            } satisfies Record<DerivedPlaceStatus, number>,
        );
    }, [places]);

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
                gap: 24,
            }}
        >
            <YStack gap="$4">
                <YStack gap="$1.5">
                    <Text
                        color={designSystem.colors.foreground}
                        fontFamily={designSystem.fonts.headingBold}
                        fontSize={designSystem.typography.displayMd.fontSize}
                        lineHeight={designSystem.typography.displayMd.lineHeight}
                        letterSpacing={-0.7}
                    >
                        Assigned Places
                    </Text>
                    <Paragraph
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyMedium}
                    >
                        Review your field queue, monitor progress, and jump back into active audits.
                    </Paragraph>
                </YStack>

                <XStack gap="$3">
                    <SummaryTile label="In progress" value={placeStatusCounts.in_progress} />
                    <SummaryTile
                        label="Not started"
                        value={placeStatusCounts.not_started}
                        tone={{
                            accent: designSystem.colors.warning,
                            surface: designSystem.colors.warningSoft,
                            text: designSystem.colors.warning,
                        }}
                    />
                    <SummaryTile
                        label="Submitted"
                        value={placeStatusCounts.submitted}
                        tone={{
                            accent: designSystem.colors.success,
                            surface: designSystem.colors.successSoft,
                            text: designSystem.colors.success,
                        }}
                    />
                </XStack>
            </YStack>

            <YStack gap="$3">
                {places.map((place) => {
                    const status = derivePlaceStatus(place.audit_status);
                    const placeTone = getPlaceStatusTone(status);
                    const locality = deriveLocality(place);
                    const auditScoreLabel =
                        place.summary_score === null ? "--" : `${place.summary_score}%`;
                    const progressPercent = place.progress_percent ?? 0;
                    const updatedLabel = deriveUpdatedAtLabel(place.started_at, place.submitted_at);

                    return (
                        <YStack
                            key={place.place_id}
                            rounded={designSystem.radii.lg}
                            borderWidth={1}
                            borderColor={designSystem.colors.border}
                            bg={designSystem.colors.surface}
                            overflow="hidden"
                            style={{
                                boxShadow: designSystem.shadows.card,
                            }}
                        >
                            <XStack>
                                <YStack width={4} style={{ backgroundColor: placeTone.accent }} />

                                <YStack flex={1} p="$4" gap="$3">
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
                                                fontSize={designSystem.typography.bodyXs.fontSize}
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
                                                letterSpacing={1}
                                            >
                                                {PLACE_STATUS_LABELS[status]}
                                            </Text>
                                        </YStack>
                                    </XStack>

                                    <XStack items="center" gap="$2">
                                        <MapPin
                                            size={14}
                                            color={designSystem.colors.mutedForeground}
                                        />
                                        <Paragraph
                                            color={designSystem.colors.mutedForeground}
                                            fontFamily={designSystem.fonts.bodyMedium}
                                            fontSize={designSystem.typography.bodyMd.fontSize}
                                        >
                                            {locality}
                                        </Paragraph>
                                    </XStack>

                                    <XStack gap="$3">
                                        <ScoreTile
                                            label="Audit score"
                                            value={auditScoreLabel}
                                            valueColor={designSystem.colors.primary}
                                        />
                                    </XStack>

                                    <YStack gap="$2">
                                        <XStack justify="space-between" items="center">
                                            <Paragraph
                                                color={designSystem.colors.mutedForeground}
                                                fontFamily={designSystem.fonts.bodyMedium}
                                                fontSize={designSystem.typography.bodySm.fontSize}
                                            >
                                                Mandatory completion
                                            </Paragraph>
                                            <Text
                                                color={designSystem.colors.primary}
                                                fontFamily={designSystem.fonts.monoBold}
                                                fontSize={designSystem.typography.labelLg.fontSize}
                                            >
                                                {progressPercent}%
                                            </Text>
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
                                    </YStack>

                                    <YStack
                                        gap="$3"
                                        rounded={designSystem.radii.md}
                                        borderWidth={1}
                                        borderColor={designSystem.colors.border}
                                        bg={designSystem.colors.input}
                                        p="$3"
                                    >
                                        <XStack justify="space-between" items="center" gap="$2.5">
                                            <XStack
                                                items="center"
                                                gap="$1.5"
                                                flex={1}
                                                style={{ minWidth: 0 }}
                                            >
                                                <Clock3
                                                    size={14}
                                                    color={designSystem.colors.mutedForeground}
                                                />
                                                <Paragraph
                                                    color={designSystem.colors.mutedForeground}
                                                    fontFamily={designSystem.fonts.bodyMedium}
                                                    fontSize={
                                                        designSystem.typography.bodySm.fontSize
                                                    }
                                                >
                                                    {updatedLabel}
                                                </Paragraph>
                                            </XStack>
                                        </XStack>

                                        <Button
                                            width="100%"
                                            height={42}
                                            px="$3"
                                            rounded={designSystem.radii.sm}
                                            borderWidth={0}
                                            bg={designSystem.colors.primary}
                                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                            onPress={() => {
                                                router.push(`/(tabs)/execute/${place.place_id}`);
                                            }}
                                        >
                                            <XStack items="center" justify="center" gap="$1.5">
                                                <LocateFixed
                                                    size={14}
                                                    color={designSystem.colors.primaryForeground}
                                                />
                                                <Text
                                                    color={designSystem.colors.primaryForeground}
                                                    fontFamily={designSystem.fonts.bodyBold}
                                                    fontSize={
                                                        designSystem.typography.labelLg.fontSize
                                                    }
                                                    textTransform="uppercase"
                                                    letterSpacing={1.1}
                                                >
                                                    Open audit
                                                </Text>
                                            </XStack>
                                        </Button>
                                    </YStack>
                                </YStack>
                            </XStack>
                        </YStack>
                    );
                })}
            </YStack>
        </ScrollView>
    );
}

interface SummaryTileProps {
    readonly label: string;
    readonly value: number;
    readonly tone?: DesignTone;
}

/**
 * Compact summary tile used above the places queue.
 *
 * @param props Summary tile props.
 * @returns Small metric card.
 */
function SummaryTile({ label, value, tone }: SummaryTileProps) {
    const tileTone = tone ?? {
        accent: designSystem.colors.primary,
        surface: designSystem.colors.primarySoft,
        text: designSystem.colors.primary,
    };

    return (
        <YStack
            flex={1}
            rounded={designSystem.radii.lg}
            borderWidth={1}
            borderColor={designSystem.colors.border}
            bg={designSystem.colors.surface}
            p="$3"
        >
            <Paragraph
                color={designSystem.colors.mutedForeground}
                fontFamily={designSystem.fonts.bodyBold}
                fontSize={designSystem.typography.labelXs.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={designSystem.fonts.headingBold}
                fontSize={designSystem.typography.metricMd.fontSize}
                mt="$2"
                style={{ color: tileTone.text }}
            >
                {value}
            </Text>
        </YStack>
    );
}

interface ScoreTileProps {
    readonly label: string;
    readonly value: string;
    readonly valueColor: string;
}

/**
 * Small score tile used inside place cards.
 *
 * @param props Score tile props.
 * @returns Bordered score surface.
 */
function ScoreTile({ label, value, valueColor }: ScoreTileProps) {
    return (
        <YStack
            flex={1}
            rounded={designSystem.radii.md}
            borderWidth={1}
            borderColor={designSystem.colors.border}
            bg={designSystem.colors.input}
            p="$3"
        >
            <Paragraph
                color={designSystem.colors.mutedForeground}
                fontFamily={designSystem.fonts.bodyBold}
                fontSize={designSystem.typography.labelSm.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={designSystem.fonts.headingBold}
                fontSize={designSystem.typography.metricSm.fontSize}
                mt="$2"
                style={{ color: valueColor }}
            >
                {value}
            </Text>
        </YStack>
    );
}
