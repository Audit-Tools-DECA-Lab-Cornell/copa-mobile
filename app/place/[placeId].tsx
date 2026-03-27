import { useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Linking, ScrollView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, ClipboardCheck, FileBarChart, MapPin } from "@tamagui/lucide-icons";
import MapView, { Marker } from "react-native-maps";
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
import { createMetricDisplayState } from "lib/metric-display";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
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
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["places", "common", "reports"]);
    const status = derivePlaceStatus(place.audit_status);
    const statusTone = getPlaceStatusTone(status, ds.colors);
    const locality = deriveLocality(place, t("place.assignedPlace", { ns: "common" }));
    const combinedConstructScore = getCombinedConstructScore(place.score_totals);
    const summaryScore =
        combinedConstructScore ?? (place.summary_score === null ? null : place.summary_score);
    const summaryMetric = createMetricDisplayState({
        pendingText: t("detail.pendingMetric", { ns: "reports" }),
        value: summaryScore,
        formatValue: formatScoreValue,
    });
    const updatedLabel = formatRelativeTimeLabel(place.started_at, place.submitted_at, language, t);
    const mapsQuery = encodeURIComponent(`${place.place_name}, ${locality}`);
    const placeCoordinate = useMemo(
        () => getPlaceCoordinate(place.lat, place.lng),
        [place.lat, place.lng],
    );
    const scrollViewRef = useRef<ScrollView | null>(null);
    const mapRegion = useMemo(() => {
        if (placeCoordinate === null) {
            return null;
        }
        return {
            ...placeCoordinate,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
    }, [placeCoordinate]);

    const scrollPlaceDetailToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({
        contentReady: true,
        rerunKey: place.place_id,
        scrollToOffset: scrollPlaceDetailToOffset,
    });
    const metricsGrid = (
        <YStack gap="$3">
            <XStack gap="$3">
                <StatCard
                    label={t("mandatoryCompletion", { ns: "places" })}
                    value={`${place.progress_percent ?? 0}%`}
                    accentColor={ds.colors.primary}
                    minHeight={layout.summaryCardMinHeight}
                />
                <StatCard
                    label={t("scoreSummary", { ns: "places" })}
                    value={summaryMetric.value}
                    accentColor={ds.colors.primary}
                    helperText={summaryMetric.helperText}
                    minHeight={layout.summaryCardMinHeight}
                />
            </XStack>
            <XStack gap="$3">
                <PlaceInfoCard
                    label={t("detail.lastUpdated", { ns: "places" })}
                    value={updatedLabel}
                    minHeight={layout.summaryCardMinHeight}
                />
                <PlaceInfoCard
                    label="Project"
                    value={place.project_name}
                    minHeight={layout.summaryCardMinHeight}
                />
            </XStack>
        </YStack>
    );
    const currentAuditCard = (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{
                minHeight: layout.isTablet ? layout.heroCardMinHeight : undefined,
                boxShadow: ds.shadows.card,
            }}
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
    );
    const quickActionsCard = (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap="$2.5"
            justify="space-between"
            style={{
                minHeight: layout.isTablet ? layout.heroCardMinHeight : undefined,
                boxShadow: ds.shadows.card,
            }}
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
                height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
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
                    height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
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
            <Button
                height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
                rounded={ds.radii.md}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.input}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
                    Linking.openURL(`http://maps.apple.com/?q=${mapsQuery}`).catch(() => undefined);
                }}
            >
                <XStack items="center" gap="$2">
                    <MapPin size={16} color={ds.colors.foreground} />
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.2}
                    >
                        Open in Apple Maps
                    </Text>
                </XStack>
            </Button>
            <Button
                height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
                rounded={ds.radii.md}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.input}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={() => {
                    Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
                    ).catch(() => undefined);
                }}
            >
                <XStack items="center" gap="$2">
                    <MapPin size={16} color={ds.colors.foreground} />
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.2}
                    >
                        Open in Google Maps
                    </Text>
                </XStack>
            </Button>
        </YStack>
    );
    const mapPreviewCard = (
        <YStack
            rounded={ds.radii.lg}
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
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                >
                    Map
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {locality}
                </Paragraph>
            </YStack>
            {mapRegion === null || placeCoordinate === null ? (
                <YStack
                    height={layout.isTablet ? 280 : 220}
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.input}
                    justify="center"
                    items="center"
                    px="$4"
                >
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyMd.fontSize}
                        style={{ textAlign: "center" }}
                    >
                        Map preview is unavailable for this place because coordinates are missing.
                    </Paragraph>
                </YStack>
            ) : (
                <YStack
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    style={{ overflow: "hidden" }}
                >
                    <MapView
                        style={{ width: "100%", height: layout.isTablet ? 280 : 220 }}
                        region={mapRegion}
                        pointerEvents="auto"
                        scrollEnabled={true}
                        zoomEnabled={true}
                        rotateEnabled={true}
                        pitchEnabled={true}
                        toolbarEnabled={true}
                    >
                        <Marker
                            coordinate={placeCoordinate}
                            title={place.place_name}
                            description={locality}
                        />
                    </MapView>
                </YStack>
            )}
        </YStack>
    );

    return (
        <ScrollView
            ref={scrollViewRef}
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 112,
                gap: layout.sectionGap,
            })}
        >
            <YStack gap="$3">
                <XStack justify="space-between" items="flex-start" gap="$3">
                    <YStack flex={1} gap="$1.5">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={
                                layout.isTablet
                                    ? ds.typography.metricLg.fontSize
                                    : ds.typography.metricMd.fontSize
                            }
                            lineHeight={
                                layout.isTablet
                                    ? ds.typography.metricLg.lineHeight
                                    : ds.typography.metricMd.lineHeight
                            }
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
                    <MapPin size={layout.isTablet ? 18 : 16} color={ds.colors.mutedForeground} />
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyLg.fontSize}
                    >
                        {locality}
                    </Paragraph>
                </XStack>
            </YStack>

            {mapPreviewCard}

            {layout.isTablet ? (
                <XStack gap={layout.twoPaneGap} items="flex-start">
                    <YStack flex={1} gap="$3">
                        {metricsGrid}
                        {currentAuditCard}
                    </YStack>
                    <YStack width={layout.supportRailWidth} gap="$3">
                        {quickActionsCard}
                    </YStack>
                </XStack>
            ) : (
                <YStack gap="$3">
                    {metricsGrid}
                    {currentAuditCard}
                    {quickActionsCard}
                </YStack>
            )}
        </ScrollView>
    );
}

interface DetailStateCardProps {
    readonly title: string;
    readonly message: string;
    readonly isLoading?: boolean;
}

interface PlaceCoordinate {
    readonly latitude: number;
    readonly longitude: number;
}

interface PlaceInfoCardProps {
    readonly label: string;
    readonly value: string;
    readonly minHeight?: number;
}

function PlaceInfoCard({ label, value, minHeight }: Readonly<PlaceInfoCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    return (
        <YStack
            flex={1}
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            justify="space-between"
            p={layout.cardPadding}
            style={{
                minHeight,
                boxShadow: ds.shadows.card,
            }}
        >
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.labelMd.fontSize}
                textTransform="uppercase"
                letterSpacing={1}
            >
                {label}
            </Paragraph>
            <Text
                color={ds.colors.primary}
                fontFamily={ds.fonts.bodyBold}
                fontSize={
                    layout.isTablet
                        ? ds.typography.titleLg.fontSize
                        : ds.typography.titleMd.fontSize
                }
                lineHeight={
                    layout.isTablet
                        ? ds.typography.titleLg.lineHeight
                        : ds.typography.titleMd.lineHeight
                }
            >
                {value}
            </Text>
        </YStack>
    );
}

/**
 * Validate and normalize place coordinates before they reach the map view.
 *
 * @param lat Optional latitude supplied by the backend.
 * @param lng Optional longitude supplied by the backend.
 * @returns Native map coordinate or null when the payload is incomplete or invalid.
 */
function getPlaceCoordinate(
    lat: AuditorPlace["lat"],
    lng: AuditorPlace["lng"],
): PlaceCoordinate | null {
    if (typeof lat !== "number" || !Number.isFinite(lat)) {
        return null;
    }
    if (typeof lng !== "number" || !Number.isFinite(lng)) {
        return null;
    }
    if (lat < -90 || lat > 90) {
        return null;
    }
    if (lng < -180 || lng > 180) {
        return null;
    }

    return {
        latitude: lat,
        longitude: lng,
    };
}

/**
 * Compact placeholder state used while a detail route is loading or missing.
 *
 * @param props Placeholder title, message, and loading state.
 * @returns Full-screen centered message card.
 */
function DetailStateCard({ title, message, isLoading = false }: Readonly<DetailStateCardProps>) {
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
