import { useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Clock3, LocateFixed, MapPin } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem, getPlaceStatusTone, type DesignTone } from "lib/design-system";
import { formatRelativeTimeLabel, getPlaceStatusLabel } from "lib/i18n/format";
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
 * Build a locality string from city, province, and country fields.
 *
 * @param place Auditor place record.
 * @param fallbackLabel Fallback label when no locality is available.
 * @returns Comma-separated locality or fallback text.
 */
function deriveLocality(place: AuditorPlace, fallbackLabel: string): string {
    const parts = [place.city, place.province, place.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : fallbackLabel;
}

/**
 * Assigned places tab for auditor field execution.
 * Displays the full list of places from the auditor's assignment API,
 * with status pills, progress bars, and score tiles.
 */
export default function PlacesScreen() {
    const ds = useDesignSystem();
    const router = useRouter();
    const { t, i18n } = useTranslation(["places", "common"]);
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
            <YStack flex={1} items="center" justify="center" bg={ds.colors.background}>
                <ActivityIndicator size="large" color={ds.colors.primary} />
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    mt="$4"
                >
                    {t("loadingPlaces", { ns: "places" })}
                </Paragraph>
            </YStack>
        );
    }

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: ds.spacing.screenPaddingHorizontal,
                paddingTop: ds.spacing.screenPaddingVertical,
                paddingBottom: 92,
                gap: 24,
            }}
        >
            <YStack gap="$4">
                <YStack gap="$1.5">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={ds.typography.displayMd.fontSize}
                        lineHeight={ds.typography.displayMd.lineHeight}
                        letterSpacing={-0.7}
                    >
                        {t("title", { ns: "places" })}
                    </Text>
                    <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                        {t("subtitle", { ns: "places" })}
                    </Paragraph>
                </YStack>

                <XStack gap="$3">
                    <SummaryTile
                        label={t("status.inProgress", { ns: "common" })}
                        value={placeStatusCounts.in_progress}
                    />
                    <SummaryTile
                        label={t("status.notStarted", { ns: "common" })}
                        value={placeStatusCounts.not_started}
                        tone={{
                            accent: ds.colors.warning,
                            surface: ds.colors.warningSoft,
                            text: ds.colors.warning,
                        }}
                    />
                    <SummaryTile
                        label={t("status.submitted", { ns: "common" })}
                        value={placeStatusCounts.submitted}
                        tone={{
                            accent: ds.colors.success,
                            surface: ds.colors.successSoft,
                            text: ds.colors.success,
                        }}
                    />
                </XStack>
            </YStack>

            <YStack gap="$3">
                {places.map((place) => {
                    const status = derivePlaceStatus(place.audit_status);
                    const placeTone = getPlaceStatusTone(status, ds.colors);
                    const locality = deriveLocality(
                        place,
                        t("place.assignedPlace", { ns: "common" }),
                    );
                    const auditScoreLabel =
                        place.summary_score === null ? "--" : `${place.summary_score}%`;
                    const progressPercent = place.progress_percent ?? 0;
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
                            overflow="hidden"
                            style={{
                                boxShadow: ds.shadows.card,
                            }}
                        >
                            <XStack>
                                <YStack width={4} style={{ backgroundColor: placeTone.accent }} />

                                <YStack flex={1} p="$4" gap="$3">
                                    <XStack justify="space-between" items="flex-start" gap="$3">
                                        <YStack flex={1} gap="$1">
                                            <Text
                                                color={ds.colors.foreground}
                                                fontFamily={ds.fonts.bodyBold}
                                                fontSize={ds.typography.titleLg.fontSize}
                                                lineHeight={ds.typography.titleLg.lineHeight}
                                            >
                                                {place.place_name}
                                            </Text>
                                            <Paragraph
                                                color={ds.colors.mutedForeground}
                                                fontFamily={ds.fonts.bodyMedium}
                                                fontSize={ds.typography.bodyXs.fontSize}
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
                                                letterSpacing={1}
                                            >
                                                {getPlaceStatusLabel(status, t)}
                                            </Text>
                                        </YStack>
                                    </XStack>

                                    <XStack items="center" gap="$2">
                                        <MapPin size={14} color={ds.colors.mutedForeground} />
                                        <Paragraph
                                            color={ds.colors.mutedForeground}
                                            fontFamily={ds.fonts.bodyMedium}
                                            fontSize={ds.typography.bodySm.fontSize}
                                        >
                                            {locality}
                                        </Paragraph>
                                    </XStack>

                                    <XStack gap="$3">
                                        <ScoreTile
                                            label={t("auditScore", { ns: "places" })}
                                            value={auditScoreLabel}
                                            valueColor={ds.colors.primary}
                                        />
                                    </XStack>

                                    <YStack gap="$2">
                                        <XStack justify="space-between" items="center">
                                            <Paragraph
                                                color={ds.colors.mutedForeground}
                                                fontFamily={ds.fonts.bodyMedium}
                                                fontSize={ds.typography.bodySm.fontSize}
                                            >
                                                {t("mandatoryCompletion", { ns: "places" })}
                                            </Paragraph>
                                            <Text
                                                color={ds.colors.primary}
                                                fontFamily={ds.fonts.monoBold}
                                                fontSize={ds.typography.labelLg.fontSize}
                                            >
                                                {progressPercent}%
                                            </Text>
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
                                    </YStack>

                                    <YStack
                                        gap="$3"
                                        rounded={ds.radii.md}
                                        borderWidth={1}
                                        borderColor={ds.colors.border}
                                        bg={ds.colors.input}
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
                                                    color={ds.colors.mutedForeground}
                                                />
                                                <Paragraph
                                                    color={ds.colors.mutedForeground}
                                                    fontFamily={ds.fonts.bodyMedium}
                                                    fontSize={ds.typography.bodySm.fontSize}
                                                >
                                                    {updatedLabel}
                                                </Paragraph>
                                            </XStack>
                                        </XStack>

                                        <Button
                                            width="100%"
                                            height={42}
                                            px="$3"
                                            rounded={ds.radii.sm}
                                            borderWidth={0}
                                            bg={ds.colors.primary}
                                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                            onPress={() => {
                                                router.push(`/(tabs)/execute/${place.place_id}`);
                                            }}
                                        >
                                            <XStack items="center" justify="center" gap="$1.5">
                                                <LocateFixed
                                                    size={14}
                                                    color={ds.colors.primaryForeground}
                                                />
                                                <Text
                                                    color={ds.colors.primaryForeground}
                                                    fontFamily={ds.fonts.bodyBold}
                                                    fontSize={ds.typography.labelLg.fontSize}
                                                    textTransform="uppercase"
                                                    letterSpacing={1.1}
                                                >
                                                    {t("actions.openAudit", {
                                                        ns: "common",
                                                    })}
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
    const ds = useDesignSystem();
    const tileTone = tone ?? {
        accent: ds.colors.primary,
        surface: ds.colors.primarySoft,
        text: ds.colors.primary,
    };

    return (
        <YStack
            flex={1}
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            justify="space-between"
            p="$3"
        >
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelXs.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={ds.fonts.headingBold}
                fontSize={ds.typography.metricMd.fontSize}
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
    const ds = useDesignSystem();
    return (
        <YStack
            flex={1}
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.input}
            p="$3"
        >
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelSm.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={ds.fonts.headingBold}
                fontSize={ds.typography.metricSm.fontSize}
                mt="$2"
                style={{ color: valueColor }}
            >
                {value}
            </Text>
        </YStack>
    );
}
