import { useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Linking, Platform, ScrollView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, ClipboardCheck, FileBarChart, MapPin } from "@tamagui/lucide-icons-2";
import type { TFunction } from "i18next";
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { StatCard } from "components/ui/stat-card";
import { getExecuteFlowSubject } from "lib/audit/execute-flow";
import { deriveLocality, derivePlaceRequirementStatus } from "lib/audit/place-helpers";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import {
    getPreAuditValues,
    getQuestionAnswers,
    getVisiblePreAuditQuestions,
    getVisibleSections,
    isInstrumentQuestionComplete,
    isPreAuditQuestionComplete,
} from "lib/audit/selectors";
import { formatScorePair } from "lib/audit/score-helpers";
import type { AuditorPlace } from "lib/audit/places-api";
import type { AuditSession, ExecutionMode } from "lib/audit/types";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { getPlaceStatusTone, useDesignSystem } from "lib/design-system";
import { formatRelativeTimeLabel, getPlaceStatusLabel } from "lib/i18n/format";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { createModuleLogger } from "lib/logger";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";
import { usePlacesStore } from "stores/places-store";

const log = createModuleLogger("place-detail");

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
    const sessionsByPairKey = usePlayspaceAuditStore((state) => state.sessionsByPairKey);
    const placeId = readSingleParam(params.placeId);
    const projectId = readSingleParam(params.projectId);
    const pairKey = placeId === null || projectId === null ? null : getProjectPlaceKey(projectId, placeId);
    const localAuditSession = pairKey === null ? undefined : sessionsByPairKey[pairKey];

    const place = useMemo(() => {
        if (placeId === null || projectId === null) {
            return undefined;
        }
        return places.find((candidate) => {
            return (
                getProjectPlaceKey(candidate.project_id, candidate.place_id) === getProjectPlaceKey(projectId, placeId)
            );
        });
    }, [placeId, places, projectId]);

    useEffect(() => {
        if (session !== null && (places.length === 0 || (placeId !== null && place === undefined))) {
            loadPlaces(session).catch(() => undefined);
        }
    }, [loadPlaces, place, placeId, places.length, session]);

    return (
        <>
            <Stack.Screen
                options={{
                    contentStyle: { paddingTop: 20 },
                    headerTitle: () => (
                        <YStack justify="center" my="$2.5" overflowX="scroll">
                            <ScrollView horizontal>
                                <YStack justify="center">
                                    <Text
                                        color={ds.colors.primary}
                                        fontFamily={ds.fonts.bodySemiBold}
                                        fontSize={ds.typography.titleLg.fontSize}
                                        lineHeight={ds.typography.titleLg.lineHeight}
                                        className="no-scrollbar overflow-x-scroll whitespace-nowrap"
                                    >
                                        {place?.place_name ?? t("detail.screenTitle", { ns: "places" })}
                                    </Text>
                                </YStack>
                            </ScrollView>
                        </YStack>
                    ),
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: ds.colors.surface,
                    },
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
                    message={isLoading ? t("loadingPlaces", { ns: "places" }) : t("emptyMessage", { ns: "places" })}
                    isLoading={isLoading}
                />
            ) : (
                <PlaceDetailContent
                    place={place}
                    onOpenAudit={() => {
                        router.push(`/execute/${place.place_id}?projectId=${encodeURIComponent(place.project_id)}`);
                    }}
                    onOpenReport={
                        place.audit_id === null ||
                        ((localAuditSession?.scores.overall ?? place.score_totals) === null &&
                            place.summary_score === null)
                            ? undefined
                            : () => {
                                  router.push(`/report/${place.audit_id}`);
                              }
                    }
                    language={i18n.language}
                    auditSession={localAuditSession}
                />
            )}
        </>
    );
}

interface PlaceDetailContentProps {
    readonly place: AuditorPlace;
    readonly onOpenAudit: () => void;
    readonly onOpenReport: (() => void) | undefined;
    readonly language: string;
    readonly auditSession: AuditSession | undefined;
}

/**
 * Content body for the place detail route once the place record is available.
 *
 * @param props Loaded place detail props.
 * @returns Scrollable place summary screen.
 */
function PlaceDetailContent({
    place,
    onOpenAudit,
    onOpenReport,
    language,
    auditSession,
}: Readonly<PlaceDetailContentProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["places", "common", "reports"]);
    const instrument = useLocalizedInstrument();
    const status = derivePlaceRequirementStatus(place);
    const statusTone = getPlaceStatusTone(status, ds.colors);
    const locality = deriveLocality(place, t("place.assignedPlace", { ns: "common" }));
    const pendingScoreMessage = useMemo(() => {
        return resolvePendingScoreMessage({
            auditSession,
            instrument,
            place,
            t,
        });
    }, [auditSession, instrument, place, t]);
    const summaryMetricValue = formatScorePair(place.overall_scores) ?? "Pending";
    const openAuditLabel =
        place.selected_execution_mode === null
            ? t("actions.openAudit", { ns: "common" })
            : t("actions.openSubject", {
                  ns: "common",
                  subject: t(`subjects.${getExecuteFlowSubject(place.selected_execution_mode)}`, {
                      ns: "audit",
                  }),
              });
    const updatedLabel = formatRelativeTimeLabel(place.started_at, place.submitted_at, language, t);
    const mapsQuery = encodeURIComponent(`${place.place_name}, ${locality}`);
    const placeCoordinate = useMemo(() => getPlaceCoordinate(place.lat, place.lng), [place.lat, place.lng]);
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

    const encodedMapsQuery = encodeURIComponent(mapsQuery);
    const openUrl = useCallback((url: string) => {
        Linking.openURL(url);
    }, []);

    const mapProvider = Platform.OS === "ios" ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;
    const handleMapReady = useCallback(() => {
        log.withMetadata({
            platform: Platform.OS,
            provider: mapProvider,
        }).debug("map ready");
    }, [mapProvider]);

    const handleMapLoaded = useCallback(() => {
        log.withMetadata({
            platform: Platform.OS,
            provider: mapProvider,
        }).debug("map loaded");
    }, [mapProvider]);

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
                    value={summaryMetricValue}
                    accentColor={ds.colors.primary}
                    helperText={place.overall_scores === null ? pendingScoreMessage : undefined}
                    minHeight={layout.summaryCardMinHeight}
                />
            </XStack>
            <XStack gap="$3">
                <PlaceInfoCard
                    label={t("detail.lastUpdated", { ns: "places" })}
                    value={updatedLabel}
                    minHeight={layout.summaryCardMinHeight}
                />
                <PlaceInfoCard label="Project" value={place.project_name} minHeight={layout.summaryCardMinHeight} />
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
            <Text color={ds.colors.foreground} fontFamily={ds.fonts.bodyBold} fontSize={ds.typography.titleMd.fontSize}>
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
            ) : place.overall_scores === null ? (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {pendingScoreMessage}
                </Paragraph>
            ) : (
                <YStack gap="$2">
                    <Paragraph
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.titleLg.fontSize}
                    >
                        {formatScorePair(place.overall_scores) ?? pendingScoreMessage}
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
            <Text color={ds.colors.foreground} fontFamily={ds.fonts.bodyBold} fontSize={ds.typography.titleMd.fontSize}>
                {t("detail.quickActions", { ns: "places" })}
            </Text>

            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyMd.fontSize}
            >
                {t("detail.openAuditHelper", { ns: "places" })}
            </Paragraph>

            <QuickActionButton
                variant="primary"
                icon={<ClipboardCheck size={16} color={ds.colors.primaryForeground} />}
                label={openAuditLabel}
                onPress={onOpenAudit}
            />

            {onOpenReport && (
                <QuickActionButton
                    icon={<FileBarChart size={16} color={ds.colors.foreground} />}
                    label={t("actions.viewReport", { ns: "common" })}
                    onPress={onOpenReport}
                    rightIcon={<ArrowRight size={14} color={ds.colors.foreground} />}
                />
            )}

            <QuickActionButton
                icon={<MapPin size={16} color={ds.colors.foreground} />}
                label="Open in Apple Maps"
                onPress={() => openUrl(`http://maps.apple.com/?q=${encodedMapsQuery}`)}
            />

            <QuickActionButton
                icon={<MapPin size={16} color={ds.colors.foreground} />}
                label="Open in Google Maps"
                onPress={() => openUrl(`https://www.google.com/maps/search/?api=1&query=${encodedMapsQuery}`)}
            />
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
                        style={{ width: "100%", height: layout.isTablet ? 360 : 280 }}
                        region={mapRegion}
                        provider={mapProvider}
                        pointerEvents="auto"
                        scrollEnabled={true}
                        zoomEnabled={true}
                        rotateEnabled={true}
                        pitchEnabled={true}
                        toolbarEnabled={true}
                        onMapLoaded={handleMapLoaded}
                        onMapReady={handleMapReady}
                    >
                        <Marker coordinate={placeCoordinate} title={place.place_name} description={locality} />
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
                includeTopPadding: false,
            })}
        >
            <YStack gap="$3">
                <XStack justify="space-between" items="flex-start" gap="$3">
                    <YStack flex={1} gap="$1.5">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={
                                layout.isTablet ? ds.typography.metricLg.fontSize : ds.typography.metricMd.fontSize
                            }
                            lineHeight={
                                layout.isTablet ? ds.typography.metricLg.lineHeight : ds.typography.metricMd.lineHeight
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
                        {place.address !== null && place.address !== undefined && (
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodyMd.fontSize}
                            >
                                {place.address}
                            </Paragraph>
                        )}
                        {place.postal_code !== null && place.postal_code !== undefined && (
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodyMd.fontSize}
                            >
                                {place.postal_code}
                            </Paragraph>
                        )}
                        {place.city !== null && place.city !== undefined && (
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodyMd.fontSize}
                            >
                                {place.city}
                            </Paragraph>
                        )}
                    </YStack>
                    <YStack rounded={ds.radii.full} px="$3" py="$1" style={{ backgroundColor: statusTone.surface }}>
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

interface QuickActionButtonProps {
    readonly icon: React.ReactNode;
    readonly label: string;
    readonly onPress: () => void;
    readonly variant?: "primary" | "secondary";
    readonly rightIcon?: React.ReactNode;
}

function QuickActionButton({
    icon,
    label,
    onPress,
    variant = "secondary",
    rightIcon,
}: Readonly<QuickActionButtonProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const isPrimary = variant === "primary";

    const buttonHeight = layout.isTablet ? layout.buttonHeight : layout.controlHeight;

    return (
        <Button
            height={buttonHeight}
            rounded={ds.radii.md}
            borderWidth={isPrimary ? 0 : 1}
            borderColor={isPrimary ? "transparent" : ds.colors.border}
            bg={isPrimary ? ds.colors.primary : ds.colors.input}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            onPress={onPress}
        >
            <XStack flex={1} items="center" gap="$2">
                <XStack width={20} items="center" justify="flex-start">
                    {icon}
                </XStack>

                <XStack items="center">
                    <Text
                        color={isPrimary ? ds.colors.primaryForeground : ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={isPrimary ? ds.typography.labelLg.fontSize : ds.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.2}
                        numberOfLines={1}
                    >
                        {label}
                    </Text>
                </XStack>

                <XStack items="center" width={20}>
                    {rightIcon ?? null}
                </XStack>
            </XStack>
        </Button>
    );
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
                fontSize={layout.isTablet ? ds.typography.titleLg.fontSize : ds.typography.titleMd.fontSize}
                lineHeight={layout.isTablet ? ds.typography.titleLg.lineHeight : ds.typography.titleMd.lineHeight}
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
function getPlaceCoordinate(lat: AuditorPlace["lat"], lng: AuditorPlace["lng"]): PlaceCoordinate | null {
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
        <YStack flex={1} justify="center" px={layout.screenPaddingHorizontal} bg={ds.colors.background}>
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

interface PendingScoreMessageParams {
    readonly place: AuditorPlace;
    readonly auditSession: AuditSession | undefined;
    readonly instrument: ReturnType<typeof useLocalizedInstrument>;
    readonly t: TFunction;
}

interface RemainingExecutionParts {
    readonly audit: boolean;
    readonly survey: boolean;
}

/**
 * Resolve the most specific score-pending message available for the current
 * place summary and any locally cached audit session.
 *
 * @param params Place, audit-session, instrument, and translator context.
 * @returns Human-readable score-pending explanation.
 */
function resolvePendingScoreMessage({
    place,
    auditSession,
    instrument,
    t,
}: Readonly<PendingScoreMessageParams>): string {
    if (place.audit_id === null) {
        return t("detail.auditUnavailable", { ns: "places" });
    }
    if (derivePlaceRequirementStatus(place) !== "submitted") {
        return t("detail.reportUnavailable", { ns: "places" });
    }

    const selectedMode = auditSession?.selected_execution_mode ?? place.selected_execution_mode;
    if (selectedMode === null) {
        return t("detail.reportUnavailable", { ns: "places" });
    }

    const remainingParts =
        auditSession === undefined
            ? getFallbackRemainingExecutionParts(selectedMode)
            : getRemainingExecutionParts(auditSession, instrument);
    if (remainingParts.audit && remainingParts.survey) {
        return t("detail.waitingForAuditAndSurveyCompletion", { ns: "places" });
    }
    if (remainingParts.audit) {
        return t("detail.waitingForAuditCompletion", { ns: "places" });
    }
    if (remainingParts.survey) {
        return t("detail.waitingForSurveyCompletion", { ns: "places" });
    }

    if (selectedMode === "audit") {
        return t("detail.waitingForAuditSubmission", { ns: "places" });
    }
    if (selectedMode === "survey") {
        return t("detail.waitingForSurveySubmission", { ns: "places" });
    }
    return t("detail.waitingForAuditAndSurveySubmission", { ns: "places" });
}

/**
 * Fall back to the selected mode when no local audit session is available.
 *
 * @param selectedMode Latest known execution mode.
 * @returns Coarse audit-vs-survey remainder flags.
 */
function getFallbackRemainingExecutionParts(selectedMode: ExecutionMode): RemainingExecutionParts {
    if (selectedMode === "audit") {
        return { audit: true, survey: false };
    }
    if (selectedMode === "survey") {
        return { audit: false, survey: true };
    }
    return { audit: true, survey: true };
}

/**
 * Determine which portion of a locally cached audit still has unanswered
 * required work.
 *
 * @param auditSession Local-first audit session.
 * @param instrument Active instrument definition.
 * @returns Remaining audit and survey work flags.
 */
function getRemainingExecutionParts(
    auditSession: AuditSession,
    instrument: ReturnType<typeof useLocalizedInstrument>,
): RemainingExecutionParts {
    const selectedMode = auditSession.selected_execution_mode;
    if (selectedMode === null) {
        return { audit: true, survey: true };
    }

    const preAuditQuestions = getVisiblePreAuditQuestions(
        instrument!.pre_audit_questions.filter((question) => question.page_key === "space_setup"),
        selectedMode,
    );
    const preAuditValues = getPreAuditValues(auditSession);
    const hasIncompletePreAudit = preAuditQuestions.some((question) => {
        return !isPreAuditQuestionComplete(question, preAuditValues[question.key]);
    });
    let auditRemaining = hasIncompletePreAudit;
    let surveyRemaining = false;

    const visibleSections = getVisibleSections(
        instrument!,
        selectedMode,
        Object.fromEntries(
            Object.entries(auditSession.sections).map(([sectionKey, sectionState]) => [
                sectionKey,
                sectionState.responses,
            ]),
        ),
    );

    for (const section of visibleSections) {
        for (const question of section.questions) {
            if (!question.required) {
                continue;
            }

            const isComplete = isInstrumentQuestionComplete(
                question,
                getQuestionAnswers(auditSession, section.section_key, question.question_key),
            );
            if (isComplete) {
                continue;
            }

            if (question.mode === "audit") {
                auditRemaining = true;
                continue;
            }
            if (question.mode === "survey") {
                surveyRemaining = true;
                continue;
            }

            if (selectedMode === "audit") {
                auditRemaining = true;
                continue;
            }
            if (selectedMode === "survey") {
                surveyRemaining = true;
                continue;
            }

            auditRemaining = true;
            surveyRemaining = true;
        }
    }

    return {
        audit: auditRemaining,
        survey: surveyRemaining,
    };
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
