import { useCallback, useEffect, useMemo, useRef } from "react";
import { Linking, Platform, ScrollView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
    ArrowRight,
    ClipboardCheck,
    Clock3,
    FileBarChart,
    Folder,
    Info,
    MapPin,
    ShieldCheck,
} from "@tamagui/lucide-icons-2";
import type { TFunction } from "i18next";
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "react-native-maps";
import Svg, { Circle } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { AuditHeaderTitle } from "components/ui/audit-header-title";
import { SkeletonBlock, SkeletonCircle, SkeletonLine } from "components/ui/skeleton";
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
import { formatScorePair, getEffectivePlaceScores } from "lib/audit/score-helpers";
import type { AuditorPlace } from "lib/audit/places-api";
import type { AuditSession, ExecutionMode } from "lib/audit/types";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { getPlaceStatusTone, isGlassUiEnabled, useDesignSystem } from "lib/design-system";
import { useThemedHeaderOptions } from "lib/ui/themed-header";
import { formatLocalizedDate, formatRelativeTimeLabel, getPlaceStatusLabel } from "lib/i18n/format";
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
    const themedHeaderOptions = useThemedHeaderOptions();
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
                    ...themedHeaderOptions,
                    title: t("detail.screenTitle", { ns: "places" }),
                    headerTitle: () => (
                        <AuditHeaderTitle
                            primary={place?.place_name ?? t("detail.screenTitle", { ns: "places" })}
                            size="lg"
                        />
                    ),
                }}
            />

            {placeId === null ? (
                <DetailStateCard
                    title={t("detail.screenTitle", { ns: "places" })}
                    message={t("emptyMessage", { ns: "places" })}
                />
            ) : place === undefined && isLoading ? (
                <PlaceDetailSkeleton />
            ) : place === undefined ? (
                <DetailStateCard
                    title={t("detail.screenTitle", { ns: "places" })}
                    message={t("emptyMessage", { ns: "places" })}
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
    const instrument = useLocalizedInstrument(auditSession?.instrument);
    const status = derivePlaceRequirementStatus(place);
    const statusTone = getPlaceStatusTone(status, ds.colors);
    const locality = deriveLocality(place, "");
    const addressLine = [place.address, place.postal_code, place.city].filter(Boolean).join(", ");
    const pendingScoreMessage = useMemo(() => {
        return resolvePendingScoreMessage({
            auditSession,
            instrument,
            place,
            t,
        });
    }, [auditSession, instrument, place, t]);
    const scorePair = getEffectivePlaceScores(place);
    const summaryMetricValue = formatScorePair(scorePair) ?? t("detail.scorePendingShort", { ns: "places" });
    const scoreAvailable = scorePair !== null;
    const scoreHelperText = scoreAvailable
        ? `${t("detail.playValueCardLabel", { ns: "reports" })} | ${t("detail.usabilityCardLabel", {
              ns: "reports",
          })}`
        : pendingScoreMessage;
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
    const updatedTimestamp = place.submitted_at ?? place.started_at;
    const updatedDateLabel = updatedTimestamp == null ? "" : formatLocalizedDate(updatedTimestamp, language);
    const progressPercent = clampPercent(place.progress_percent ?? 0);
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
    const usesIpadDashboard = Platform.OS === "ios" && layout.isTablet;
    const usesTabletGrid = layout.isTablet && !usesIpadDashboard;

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

    const quickActionsCard = (
        <QuickActionsCard
            openAuditLabel={openAuditLabel}
            onOpenAudit={onOpenAudit}
            onOpenReport={onOpenReport}
            onOpenAppleMaps={() => openUrl(`http://maps.apple.com/?q=${mapsQuery}`)}
            onOpenGoogleMaps={() => openUrl(`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`)}
        />
    );
    const mapPreviewCard = (
        <MapPreviewCard
            place={place}
            locality={locality}
            coordinate={placeCoordinate}
            region={mapRegion}
            provider={mapProvider}
            onMapReady={handleMapReady}
            onMapLoaded={handleMapLoaded}
        />
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
            <PlaceSummaryHeader
                projectName={place.project_name}
                addressLine={addressLine}
                locality={locality}
                statusLabel={getPlaceStatusLabel(status, t)}
                statusSurface={statusTone.surface}
                statusText={statusTone.text}
            />

            <AuditOverviewCard
                progressPercent={progressPercent}
                scoreValue={summaryMetricValue}
                scoreHelperText={scoreHelperText}
                scoreAvailable={scoreAvailable}
                updatedLabel={updatedLabel}
                updatedDateLabel={updatedDateLabel}
                showUpdatedMetric={usesIpadDashboard}
            />

            {usesIpadDashboard ? (
                <XStack gap={layout.twoPaneGap} items="stretch">
                    <YStack width={Math.max(layout.supportRailWidth, 260)}>{quickActionsCard}</YStack>
                    <YStack flex={1} gap="$3">
                        <ProjectInfoCard projectName={place.project_name} />
                        {mapPreviewCard}
                    </YStack>
                </XStack>
            ) : (
                <YStack gap="$3">
                    <XStack gap="$3" items="stretch">
                        <CompactInfoCard
                            icon={<Clock3 size={20} color={ds.colors.primary} />}
                            label={t("detail.lastUpdated", { ns: "places" })}
                            value={updatedLabel}
                            helperText={updatedDateLabel}
                        />
                        <CompactInfoCard
                            icon={<Folder size={20} color={ds.colors.primary} />}
                            label={t("detail.project", { ns: "reports" })}
                            value={place.project_name}
                        />
                    </XStack>
                    {usesTabletGrid ? (
                        <XStack gap={layout.twoPaneGap} items="stretch">
                            <YStack width={Math.max(layout.supportRailWidth, 280)}>{quickActionsCard}</YStack>
                            <YStack flex={1}>{mapPreviewCard}</YStack>
                        </XStack>
                    ) : (
                        <>
                            {quickActionsCard}
                            {mapPreviewCard}
                        </>
                    )}
                </YStack>
            )}

            <InfoBanner
                message={scoreAvailable ? t("detail.compactScoreSummary", { ns: "places" }) : pendingScoreMessage}
            />
        </ScrollView>
    );
}

interface PlaceSummaryHeaderProps {
    readonly projectName: string;
    readonly addressLine: string;
    readonly locality: string;
    readonly statusLabel: string;
    readonly statusSurface: string;
    readonly statusText: string;
}

function PlaceSummaryHeader({
    projectName,
    addressLine,
    locality,
    statusLabel,
    statusSurface,
    statusText,
}: Readonly<PlaceSummaryHeaderProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    return (
        <YStack gap="$3">
            <XStack justify="space-between" items="flex-start" gap="$3">
                <YStack flex={1} gap="$1.5">
                    <Paragraph
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={layout.isTablet ? ds.typography.titleLg.fontSize : ds.typography.titleMd.fontSize}
                        lineHeight={
                            layout.isTablet ? ds.typography.titleLg.lineHeight : ds.typography.titleMd.lineHeight
                        }
                    >
                        {projectName}
                    </Paragraph>
                    {addressLine.length > 0 ? (
                        <XStack items="flex-start" gap="$2">
                            <MapPin
                                size={layout.isTablet ? 20 : 17}
                                color={ds.colors.mutedForeground}
                                style={{ marginTop: 2 }}
                            />
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={
                                    layout.isTablet ? ds.typography.bodyLg.fontSize : ds.typography.bodyMd.fontSize
                                }
                                lineHeight={
                                    layout.isTablet ? ds.typography.bodyLg.lineHeight : ds.typography.bodyMd.lineHeight
                                }
                                flex={1}
                            >
                                {addressLine}
                            </Paragraph>
                        </XStack>
                    ) : null}
                </YStack>
                <YStack rounded={ds.radii.full} px="$3" py="$1" style={{ backgroundColor: statusSurface }}>
                    <Text
                        style={{ color: statusText }}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelXs.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1}
                    >
                        {statusLabel}
                    </Text>
                </YStack>
            </XStack>

            {locality.length > 0 ? (
                <XStack
                    alignSelf="flex-start"
                    items="center"
                    gap="$2"
                    rounded={ds.radii.full}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.input}
                    px="$3"
                    py="$1.5"
                >
                    <MapPin size={15} color={ds.colors.mutedForeground} />
                    <Paragraph
                        color={ds.colors.secondaryForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {locality}
                    </Paragraph>
                </XStack>
            ) : null}
        </YStack>
    );
}

interface AuditOverviewCardProps {
    readonly progressPercent: number;
    readonly scoreValue: string;
    readonly scoreHelperText: string;
    readonly scoreAvailable: boolean;
    readonly updatedLabel: string;
    readonly updatedDateLabel: string;
    readonly showUpdatedMetric: boolean;
}

function AuditOverviewCard({
    progressPercent,
    scoreValue,
    scoreHelperText,
    scoreAvailable,
    updatedLabel,
    updatedDateLabel,
    showUpdatedMetric,
}: Readonly<AuditOverviewCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["places"]);
    const isGlassEnabled = isGlassUiEnabled();
    const cardPadding = layout.isTablet ? 22 : 16;

    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
            bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
            p={cardPadding}
            gap="$3"
            style={{
                boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card,
            }}
        >
            <Text
                color={ds.colors.foreground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={layout.isTablet ? ds.typography.titleMd.fontSize : ds.typography.bodyLg.fontSize}
            >
                {t("detail.currentAudit", { ns: "places" })}
            </Text>

            <XStack items="stretch">
                <CompletionMetric progressPercent={progressPercent} />
                <VerticalDivider />
                <ScoreMetric
                    scoreValue={scoreValue}
                    helperText={scoreHelperText}
                    scoreAvailable={scoreAvailable}
                />
                {showUpdatedMetric ? (
                    <>
                        <VerticalDivider />
                        <UpdatedMetric updatedLabel={updatedLabel} updatedDateLabel={updatedDateLabel} />
                    </>
                ) : null}
            </XStack>
        </YStack>
    );
}

interface CompletionMetricProps {
    readonly progressPercent: number;
}

function CompletionMetric({ progressPercent }: Readonly<CompletionMetricProps>) {
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["places"]);
    const ringSize = layout.isTablet ? 138 : 112;

    return (
        <YStack flex={1} items="center" justify="center" gap="$2.5" px={layout.isTablet ? "$3" : "$1.5"}>
            <MetricLabel>{t("mandatoryCompletion", { ns: "places" })}</MetricLabel>
            <ProgressRing size={ringSize} progressPercent={progressPercent} />
        </YStack>
    );
}

interface ScoreMetricProps {
    readonly scoreValue: string;
    readonly helperText: string;
    readonly scoreAvailable: boolean;
}

function ScoreMetric({ scoreValue, helperText, scoreAvailable }: Readonly<ScoreMetricProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["places"]);

    return (
        <YStack flex={1} items="center" justify="center" gap="$2.5" px={layout.isTablet ? "$4" : "$2"}>
            <MetricLabel>{t("scoreSummary", { ns: "places" })}</MetricLabel>
            <IconBadge>
                {scoreAvailable ? (
                    <ShieldCheck size={layout.isTablet ? 25 : 21} color={ds.colors.primary} />
                ) : (
                    <ClipboardCheck size={layout.isTablet ? 25 : 21} color={ds.colors.primary} />
                )}
            </IconBadge>
            <Text
                color={ds.colors.primary}
                fontFamily={ds.fonts.headingBold}
                fontSize={layout.isTablet ? ds.typography.metricXs.fontSize : ds.typography.titleLg.fontSize}
                lineHeight={layout.isTablet ? ds.typography.metricXs.lineHeight : ds.typography.titleLg.lineHeight}
                textAlign="center"
                numberOfLines={2}
                adjustsFontSizeToFit
            >
                {scoreValue}
            </Text>
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={layout.isTablet ? ds.typography.bodySm.fontSize : ds.typography.bodyXs.fontSize}
                lineHeight={layout.isTablet ? ds.typography.bodySm.lineHeight : ds.typography.bodyXs.lineHeight}
                textAlign="center"
                style={{ maxWidth: layout.isTablet ? 300 : 180 }}
            >
                {helperText}
            </Paragraph>
        </YStack>
    );
}

interface UpdatedMetricProps {
    readonly updatedLabel: string;
    readonly updatedDateLabel: string;
}

function UpdatedMetric({ updatedLabel, updatedDateLabel }: Readonly<UpdatedMetricProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["places"]);

    return (
        <YStack flex={1} items="center" justify="center" gap="$2.5" px="$3">
            <MetricLabel>{t("detail.lastUpdated", { ns: "places" })}</MetricLabel>
            <IconBadge>
                <Clock3 size={25} color={ds.colors.primary} />
            </IconBadge>
            <Text
                color={ds.colors.primary}
                fontFamily={ds.fonts.headingBold}
                fontSize={ds.typography.titleLg.fontSize}
                lineHeight={ds.typography.titleLg.lineHeight}
                textAlign="center"
            >
                {updatedLabel}
            </Text>
            {updatedDateLabel.length > 0 ? (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={layout.isTablet ? ds.typography.bodySm.fontSize : ds.typography.bodyXs.fontSize}
                >
                    {updatedDateLabel}
                </Paragraph>
            ) : null}
        </YStack>
    );
}

interface ProgressRingProps {
    readonly size: number;
    readonly progressPercent: number;
}

function ProgressRing({ size, progressPercent }: Readonly<ProgressRingProps>) {
    const ds = useDesignSystem();
    const strokeWidth = Math.max(9, Math.round(size * 0.075));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progressPercent / 100);

    return (
        <YStack width={size} height={size} position="relative" items="center" justify="center">
            <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={ds.colors.surfaceMuted}
                    strokeWidth={strokeWidth}
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={ds.colors.primary}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={dashOffset}
                />
            </Svg>
            <YStack position="absolute" top={0} right={0} bottom={0} left={0} items="center" justify="center">
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={size >= 130 ? ds.typography.metricSm.fontSize : ds.typography.metricXs.fontSize}
                    lineHeight={size >= 130 ? ds.typography.metricSm.lineHeight : ds.typography.metricXs.lineHeight}
                >
                    {progressPercent}%
                </Text>
            </YStack>
        </YStack>
    );
}

interface MetricLabelProps {
    readonly children: React.ReactNode;
    readonly align?: "center" | "left";
}

function MetricLabel({ children, align = "center" }: Readonly<MetricLabelProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();

    return (
        <Paragraph
            color={ds.colors.mutedForeground}
            fontFamily={ds.fonts.bodyBold}
            fontSize={layout.isTablet ? ds.typography.labelMd.fontSize : ds.typography.labelXs.fontSize}
            lineHeight={layout.isTablet ? ds.typography.labelMd.lineHeight : ds.typography.labelXs.lineHeight}
            textTransform="uppercase"
            letterSpacing={layout.isTablet ? 1 : 0.7}
            textAlign={align}
        >
            {children}
        </Paragraph>
    );
}

function VerticalDivider() {
    const ds = useDesignSystem();

    return <YStack width={1} self="stretch" bg={ds.colors.border} opacity={0.7} />;
}

function IconBadge({ children }: Readonly<{ children: React.ReactNode }>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const size = layout.isTablet ? 54 : 44;

    return (
        <YStack
            width={size}
            height={size}
            rounded={ds.radii.full}
            items="center"
            justify="center"
            bg={ds.colors.primarySoft}
            borderWidth={1}
            borderColor={ds.colors.border}
        >
            {children}
        </YStack>
    );
}

interface CompactInfoCardProps {
    readonly icon: React.ReactNode;
    readonly label: string;
    readonly value: string;
    readonly helperText?: string;
}

function CompactInfoCard({ icon, label, value, helperText }: Readonly<CompactInfoCardProps>) {
    const ds = useDesignSystem();
    const isGlassEnabled = isGlassUiEnabled();

    return (
        <YStack
            flex={1}
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
            bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
            p="$3"
            gap="$2"
            style={{
                minHeight: 118,
                boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card,
            }}
        >
            <XStack items="center" gap="$2">
                <YStack
                    width={40}
                    height={40}
                    rounded={ds.radii.full}
                    items="center"
                    justify="center"
                    bg={ds.colors.primarySoft}
                >
                    {icon}
                </YStack>
                <YStack flex={1} gap="$1">
                    <MetricLabel align="left">{label}</MetricLabel>
                    <Text
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.titleMd.fontSize}
                        lineHeight={ds.typography.titleMd.lineHeight}
                        numberOfLines={3}
                    >
                        {value}
                    </Text>
                    {helperText === undefined || helperText.length === 0 ? null : (
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyXs.fontSize}
                        >
                            {helperText}
                        </Paragraph>
                    )}
                </YStack>
            </XStack>
        </YStack>
    );
}

interface ProjectInfoCardProps {
    readonly projectName: string;
}

function ProjectInfoCard({ projectName }: Readonly<ProjectInfoCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["reports"]);
    const isGlassEnabled = isGlassUiEnabled();

    return (
        <XStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
            bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
            p={layout.cardPadding}
            items="center"
            gap="$3"
            style={{
                boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card,
            }}
        >
            <IconBadge>
                <Folder size={24} color={ds.colors.primary} />
            </IconBadge>
            <YStack flex={1} gap="$1">
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {t("detail.project", { ns: "reports" })}
                </Paragraph>
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                    lineHeight={ds.typography.titleMd.lineHeight}
                >
                    {projectName}
                </Text>
            </YStack>
        </XStack>
    );
}

interface QuickActionsCardProps {
    readonly openAuditLabel: string;
    readonly onOpenAudit: () => void;
    readonly onOpenReport: (() => void) | undefined;
    readonly onOpenAppleMaps: () => void;
    readonly onOpenGoogleMaps: () => void;
}

function QuickActionsCard({
    openAuditLabel,
    onOpenAudit,
    onOpenReport,
    onOpenAppleMaps,
    onOpenGoogleMaps,
}: Readonly<QuickActionsCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["places", "common"]);
    const isGlassEnabled = isGlassUiEnabled();

    return (
        <YStack
            flex={1}
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
            bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{
                minHeight: layout.isTablet ? 360 : undefined,
                boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card,
            }}
        >
            <YStack gap="$1.5">
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
            </YStack>

            <QuickActionButton
                variant="primary"
                icon={<ClipboardCheck size={18} color={ds.colors.primaryForeground} />}
                label={openAuditLabel}
                onPress={onOpenAudit}
            />

            {onOpenReport === undefined ? null : (
                <QuickActionButton
                    icon={<FileBarChart size={18} color={ds.colors.foreground} />}
                    label={t("actions.viewReport", { ns: "common" })}
                    onPress={onOpenReport}
                    rightIcon={<ArrowRight size={15} color={ds.colors.foreground} />}
                />
            )}

            <QuickActionButton
                icon={<MapPin size={18} color={ds.colors.foreground} />}
                label={t("detail.openInAppleMaps", { ns: "places" })}
                onPress={onOpenAppleMaps}
            />

            <QuickActionButton
                icon={<MapPin size={18} color={ds.colors.foreground} />}
                label={t("detail.openInGoogleMaps", { ns: "places" })}
                onPress={onOpenGoogleMaps}
            />
        </YStack>
    );
}

interface MapPreviewCardProps {
    readonly place: AuditorPlace;
    readonly locality: string;
    readonly coordinate: PlaceCoordinate | null;
    readonly region:
        | (PlaceCoordinate & {
              readonly latitudeDelta: number;
              readonly longitudeDelta: number;
          })
        | null;
    readonly provider: typeof PROVIDER_DEFAULT | typeof PROVIDER_GOOGLE;
    readonly onMapReady: () => void;
    readonly onMapLoaded: () => void;
}

function MapPreviewCard({
    place,
    locality,
    coordinate,
    region,
    provider,
    onMapReady,
    onMapLoaded,
}: Readonly<MapPreviewCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["places"]);
    const isGlassEnabled = isGlassUiEnabled();
    const mapHeight = layout.isTablet ? 280 : 240;

    return (
        <YStack
            flex={1}
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
            bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{
                boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card,
            }}
        >
            <YStack gap="$1">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                >
                    {t("detail.mapTitle", { ns: "places" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {locality}
                </Paragraph>
            </YStack>

            {region === null || coordinate === null ? (
                <YStack
                    minHeight={mapHeight}
                    rounded={ds.radii.md}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.input}
                    items="center"
                    justify="center"
                    gap="$3"
                    px="$4"
                    py="$4"
                    style={{ borderStyle: "dashed" }}
                >
                    <IconBadge>
                        <MapPin size={26} color={ds.colors.mutedForeground} />
                    </IconBadge>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodyMd.fontSize}
                        lineHeight={ds.typography.bodyMd.lineHeight}
                        textAlign="center"
                        style={{ maxWidth: 460 }}
                    >
                        {t("detail.mapUnavailable", { ns: "places" })}
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
                        style={{ width: "100%", height: mapHeight }}
                        region={region}
                        provider={provider}
                        pointerEvents="auto"
                        scrollEnabled
                        zoomEnabled
                        rotateEnabled
                        pitchEnabled
                        toolbarEnabled
                        onMapLoaded={onMapLoaded}
                        onMapReady={onMapReady}
                    >
                        <Marker coordinate={coordinate} title={place.place_name} description={locality} />
                    </MapView>
                </YStack>
            )}
        </YStack>
    );
}

interface InfoBannerProps {
    readonly message: string;
}

function InfoBanner({ message }: Readonly<InfoBannerProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const isGlassEnabled = isGlassUiEnabled();

    return (
        <XStack
            width="100%"
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
            bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
            p={layout.cardPadding}
            items="center"
            gap="$3"
            style={{
                boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card,
            }}
        >
            <YStack
                width={40}
                height={40}
                rounded={ds.radii.full}
                items="center"
                justify="center"
                bg={ds.colors.primarySoft}
                borderWidth={1}
                borderColor={ds.colors.border}
            >
                <Info size={20} color={ds.colors.primary} />
            </YStack>
            <Paragraph
                flex={1}
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyMd.fontSize}
                lineHeight={ds.typography.bodyMd.lineHeight}
            >
                {message}
            </Paragraph>
        </XStack>
    );
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

    return (
        <Button
            width="100%"
            height={layout.isTablet ? layout.buttonHeight : layout.controlHeight}
            rounded={ds.radii.md}
            borderWidth={isPrimary ? 0 : 1}
            borderColor={isPrimary ? "transparent" : ds.colors.border}
            bg={isPrimary ? ds.colors.primary : ds.colors.input}
            pressStyle={{ opacity: 0.92, scale: 0.985 }}
            onPress={onPress}
        >
            <XStack width="100%" items="center">
                <XStack width={24} items="center" justify="flex-start">
                    {icon}
                </XStack>
                <Text
                    flex={1}
                    color={isPrimary ? ds.colors.primaryForeground : ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={isPrimary ? ds.typography.labelLg.fontSize : ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.1}
                    textAlign="center"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                >
                    {label}
                </Text>
                <XStack width={24} items="center" justify="flex-end">
                    {rightIcon ?? null}
                </XStack>
            </XStack>
        </Button>
    );
}

interface DetailStateCardProps {
    readonly title: string;
    readonly message: string;
}

interface PlaceCoordinate {
    readonly latitude: number;
    readonly longitude: number;
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

function clampPercent(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Loading state shaped like the responsive dashboard to avoid layout shift.
 */
function PlaceDetailSkeleton() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const usesIpadDashboard = Platform.OS === "ios" && layout.isTablet;
    const usesTabletGrid = layout.isTablet && !usesIpadDashboard;

    return (
        <ScrollView
            scrollEnabled={false}
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 112,
                gap: layout.sectionGap,
                includeTopPadding: false,
            })}
        >
            <YStack gap="$3">
                <XStack justify="space-between" items="flex-start" gap="$3">
                    <YStack flex={1} gap="$2">
                        <SkeletonLine width="54%" height={layout.isTablet ? 28 : 22} />
                        <SkeletonLine width="72%" />
                        <SkeletonLine width="40%" />
                    </YStack>
                    <SkeletonBlock width={104} height={28} rounded={ds.radii.full} />
                </XStack>
                <SkeletonBlock width={layout.isTablet ? 280 : "72%"} height={34} rounded={ds.radii.full} />
            </YStack>

            <SkeletonBlock height={layout.isTablet ? 250 : 230} rounded={ds.radii.lg} />

            {usesIpadDashboard ? (
                <XStack gap={layout.twoPaneGap} items="stretch">
                    <SkeletonBlock width={Math.max(layout.supportRailWidth, 260)} height={390} rounded={ds.radii.lg} />
                    <YStack flex={1} gap="$3">
                        <SkeletonBlock height={88} rounded={ds.radii.lg} />
                        <SkeletonBlock height={330} rounded={ds.radii.lg} />
                    </YStack>
                </XStack>
            ) : (
                <YStack gap="$3">
                    <XStack gap="$3">
                        <SkeletonBlock flex={1} height={118} rounded={ds.radii.lg} />
                        <SkeletonBlock flex={1} height={118} rounded={ds.radii.lg} />
                    </XStack>
                    {usesTabletGrid ? (
                        <XStack gap={layout.twoPaneGap}>
                            <SkeletonBlock
                                width={Math.max(layout.supportRailWidth, 280)}
                                height={340}
                                rounded={ds.radii.lg}
                            />
                            <SkeletonBlock flex={1} height={340} rounded={ds.radii.lg} />
                        </XStack>
                    ) : (
                        <>
                            <SkeletonBlock height={260} rounded={ds.radii.lg} />
                            <SkeletonBlock height={300} rounded={ds.radii.lg} />
                        </>
                    )}
                </YStack>
            )}

            <XStack
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p={layout.cardPadding}
                items="center"
                gap="$3"
            >
                <SkeletonCircle size={40} />
                <YStack flex={1} gap="$2">
                    <SkeletonLine width="84%" />
                    <SkeletonLine width="58%" />
                </YStack>
            </XStack>
        </ScrollView>
    );
}

/**
 * Compact placeholder state used when a detail route is missing.
 *
 * @param props Placeholder title and message.
 * @returns Full-screen centered message card.
 */
function DetailStateCard({ title, message }: Readonly<DetailStateCardProps>) {
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
