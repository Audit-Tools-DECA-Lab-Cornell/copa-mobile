import { useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, ClipboardCheck, FileBarChart, MapPin } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { StatCard } from "components/ui/stat-card";
import { deriveLocality, derivePlaceStatus } from "lib/audit/place-helpers";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import {
    formatConstructSummary,
    formatScoreValue,
    getCombinedConstructScore,
    type ScoreSummaryLabels,
} from "lib/audit/score-helpers";
import type { AuditorPlace } from "lib/audit/places-api";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { getPlaceStatusTone, useDesignSystem } from "lib/design-system";
import { formatRelativeTimeLabel, getPlaceStatusLabel } from "lib/i18n/format";
import { useAuthStore } from "stores/auth-store";
import { usePlacesStore } from "stores/places-store";

/**
 * Full-screen place detail used from the places and execute flows.
 */
export default function PlaceDetailScreen() {
    const ds = useDesignSystem();
    const router = useRouter();
    const { t, i18n } = useTranslation(["places", "common", "reports"]);
    const params = useLocalSearchParams<{
        placeId?: string | string[];
        projectId?: string | string[];
    }>();
    const session = useAuthStore((state) => state.session);
    const places = useLocalFirstPlaces();
    const isLoading = usePlacesStore((state) => state.isLoading);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);
    const placeId = readSingleParam(params.placeId);
    const projectId = readSingleParam(params.projectId);

    const place = useMemo(() => {
        if (placeId === null || projectId === null) {
            return undefined;
        }
        return places.find((candidate) => {
            return (
                getProjectPlaceKey(candidate.project_id, candidate.place_id) ===
                getProjectPlaceKey(projectId, placeId)
            );
        });
    }, [placeId, places, projectId]);

    useEffect(() => {
        if (
            session !== null &&
            (places.length === 0 || (placeId !== null && place === undefined))
        ) {
            loadPlaces(session).catch(() => undefined);
        }
    }, [loadPlaces, place, placeId, places.length, session]);

    const scoreSummaryLabels: ScoreSummaryLabels = {
        playValueShort: t("playValueShort", { ns: "places" }),
        usabilityShort: t("usabilityShort", { ns: "places" }),
        sociabilityShort: t("sociabilityShort", { ns: "places" }),
        quantityShort: t("quantityShort", { ns: "places" }),
        diversityShort: t("diversityShort", { ns: "places" }),
        challengeShort: t("challengeShort", { ns: "places" }),
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: place?.place_name ?? t("detail.screenTitle", { ns: "places" }),
                    headerShown: true,
                    headerStyle: { backgroundColor: ds.colors.surface },
                    headerTintColor: ds.colors.primary,
                    headerTitleStyle: {
                        color: ds.colors.foreground,
                        fontFamily: ds.fonts.bodyBold,
                    },
                }}
            />

            {placeId === null ? (
                <DetailStateCard
                    title={t("detail.screenTitle", { ns: "places" })}
                    message={t("emptyMessage", { ns: "places" })}
                />
            ) : place === undefined ? (
                <DetailStateCard
                    title={t("detail.screenTitle", { ns: "places" })}
                    message={
                        isLoading
                            ? t("loadingPlaces", { ns: "places" })
                            : t("emptyMessage", { ns: "places" })
                    }
                    isLoading={isLoading}
                />
            ) : (
                <PlaceDetailContent
                    place={place}
                    scoreSummaryLabels={scoreSummaryLabels}
                    onOpenAudit={() => {
                        router.push(
                            `/(tabs)/execute/${place.place_id}?projectId=${encodeURIComponent(place.project_id)}`,
                        );
                    }}
                    onOpenReport={
                        place.audit_id === null
                            ? undefined
                            : () => {
                                  router.push(`/report/${place.audit_id}`);
                              }
                    }
                    language={i18n.language}
                />
            )}
        </>
    );
}

interface PlaceDetailContentProps {
    readonly place: AuditorPlace;
    readonly scoreSummaryLabels: ScoreSummaryLabels;
    readonly onOpenAudit: () => void;
    readonly onOpenReport: (() => void) | undefined;
    readonly language: string;
}

/**
 * Content body for the place detail route once the place record is available.
 *
 * @param props Loaded place detail props.
 * @returns Scrollable place summary screen.
 */
function PlaceDetailContent({
    place,
    scoreSummaryLabels,
    onOpenAudit,
    onOpenReport,
    language,
}: Readonly<PlaceDetailContentProps>) {
    const ds = useDesignSystem();
    const { t } = useTranslation(["places", "common", "reports"]);
    const status = derivePlaceStatus(place.audit_status);
    const statusTone = getPlaceStatusTone(status, ds.colors);
    const locality = deriveLocality(place, t("place.assignedPlace", { ns: "common" }));
    const combinedConstructScore = getCombinedConstructScore(place.score_totals);
    const summaryScore =
        combinedConstructScore ?? (place.summary_score === null ? null : place.summary_score);
    const updatedLabel = formatRelativeTimeLabel(place.started_at, place.submitted_at, language, t);

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: ds.spacing.screenPaddingHorizontal,
                paddingTop: ds.spacing.screenPaddingVertical,
                paddingBottom: 112,
                gap: 20,
            }}
        >
            <YStack gap="$3">
                <XStack justify="space-between" items="flex-start" gap="$3">
                    <YStack flex={1} gap="$1.5">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={ds.typography.metricMd.fontSize}
                            lineHeight={ds.typography.metricMd.lineHeight}
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
                        style={{ backgroundColor: statusTone.surface }}
                    >
                        <Text
                            style={{ color: statusTone.text }}
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
                    <MapPin size={16} color={ds.colors.mutedForeground} />
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyLg.fontSize}
                    >
                        {locality}
                    </Paragraph>
                </XStack>
            </YStack>

            <XStack gap="$3">
                <StatCard
                    label={t("mandatoryCompletion", { ns: "places" })}
                    value={`${place.progress_percent ?? 0}%`}
                    accentColor={ds.colors.primary}
                />
                <StatCard
                    label={t("scoreSummary", { ns: "places" })}
                    value={summaryScore === null ? "--" : formatScoreValue(summaryScore)}
                    accentColor={ds.colors.primary}
                />
            </XStack>

            <XStack gap="$3">
                <StatCard
                    label={t("detail.lastUpdated", { ns: "places" })}
                    value={updatedLabel}
                    accentColor={ds.colors.primary}
                />
                <StatCard
                    label="Project"
                    value={place.project_name}
                    accentColor={ds.colors.primary}
                />
            </XStack>

            <YStack
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p="$4"
                gap="$3"
                style={{ boxShadow: ds.shadows.card }}
            >
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                >
                    {t("detail.currentAudit", { ns: "places" })}
                </Text>
                {place.audit_id === null ? (
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyMd.fontSize}
                    >
                        {t("detail.auditUnavailable", { ns: "places" })}
                    </Paragraph>
                ) : place.score_totals === null ? (
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyMd.fontSize}
                    >
                        {t("detail.reportUnavailable", { ns: "places" })}
                    </Paragraph>
                ) : (
                    <YStack gap="$2">
                        <Paragraph
                            color={ds.colors.primary}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.titleLg.fontSize}
                        >
                            {formatScoreValue(summaryScore ?? 0)}
                        </Paragraph>
                        <Paragraph
                            color={ds.colors.secondaryForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyMd.fontSize}
                        >
                            {formatConstructSummary(place.score_totals, scoreSummaryLabels)}
                        </Paragraph>
                    </YStack>
                )}
            </YStack>

            <YStack
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p="$4"
                gap="$2"
                style={{ boxShadow: ds.shadows.card }}
            >
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                >
                    {t("detail.quickActions", { ns: "places" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {t("detail.openAuditHelper", { ns: "places" })}
                </Paragraph>
                <Button
                    height={48}
                    rounded={ds.radii.md}
                    borderWidth={0}
                    bg={ds.colors.primary}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={onOpenAudit}
                >
                    <XStack items="center" gap="$2">
                        <ClipboardCheck size={16} color={ds.colors.primaryForeground} />
                        <Text
                            color={ds.colors.primaryForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelLg.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            {t("actions.openAudit", { ns: "common" })}
                        </Text>
                    </XStack>
                </Button>
                {onOpenReport === undefined ? null : (
                    <Button
                        height={48}
                        rounded={ds.radii.md}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.input}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={onOpenReport}
                    >
                        <XStack items="center" gap="$2">
                            <FileBarChart size={16} color={ds.colors.foreground} />
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelMd.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.2}
                            >
                                {t("actions.viewReport", { ns: "common" })}
                            </Text>
                            <ArrowRight size={14} color={ds.colors.foreground} />
                        </XStack>
                    </Button>
                )}
            </YStack>
        </ScrollView>
    );
}

interface DetailStateCardProps {
    readonly title: string;
    readonly message: string;
    readonly isLoading?: boolean;
}

/**
 * Compact placeholder state used while a detail route is loading or missing.
 *
 * @param props Placeholder title, message, and loading state.
 * @returns Full-screen centered message card.
 */
function DetailStateCard({ title, message, isLoading = false }: Readonly<DetailStateCardProps>) {
    const ds = useDesignSystem();
    return (
        <YStack flex={1} justify="center" px={ds.spacing.screenPaddingHorizontal}>
            <YStack
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p="$4"
                gap="$3"
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
                {isLoading ? <ActivityIndicator color={ds.colors.primary} /> : null}
            </YStack>
        </YStack>
    );
}

/**
 * Read one string route parameter from `useLocalSearchParams`.
 *
 * @param value Raw route parameter.
 * @returns First string value or null.
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
