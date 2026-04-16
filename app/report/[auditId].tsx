import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, type LayoutChangeEvent } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useToastController } from "@tamagui/toast";
import { FileBarChart, MapPin } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { ActionButton } from "components/ui/action-button";
import { StatCard } from "components/ui/stat-card";
import { fetchAuditSession } from "lib/audit/api";
import { shareSingleAuditExport, type AuditExportFormat } from "lib/audit/export";
import { buildExportableAuditForPlace, loadOptionalExportAuditorProfile } from "lib/audit/export-helpers";
import type { AuditorPlace } from "lib/audit/places-api";
import { deriveLocality, derivePlaceStatus } from "lib/audit/place-helpers";
import {
    formatPercentage,
    formatScoreValue,
    formatScoreWithPercentage,
    getCombinedConstructScore,
    getCombinedConstructMaxScore,
    type ScoreSummaryLabels,
} from "lib/audit/score-helpers";
import type { AuditScoreTotals, AuditSession } from "lib/audit/types";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { getPlaceStatusTone, getScaleSoftColor, useDesignSystem } from "lib/design-system";
import { getPlaceStatusLabel } from "lib/i18n/format";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { useAuthStore } from "stores/auth-store";
import { usePlacesStore } from "stores/places-store";
import { usePlayspaceAuditStore } from "stores/audit-store";

interface SectionReportRow {
    readonly sectionKey: string;
    readonly sectionNumber: number;
    readonly title: string;
    readonly answeredCount: number;
    readonly totalCount: number;
    readonly scoreTotals: AuditScoreTotals | null;
}

/**
 * Thin ratio bar for one score metric (value vs maximum).
 *
 * @param props Raw value, maximum ceiling, and bar color.
 * @returns Full-width horizontal bar with filled portion.
 */
function ScoreRatioBar(props: Readonly<{ value: number; max: number; color: string }>) {
    const ds = useDesignSystem();
    const { value, max, color } = props;
    const safeRatio = max <= 0 ? 0 : Math.min(1, value / max);
    const widthPercent = `${Math.round(safeRatio * 1000) / 10}%`;

    return (
        <XStack height={7} width="100%" rounded={9999} overflow="hidden" style={{ backgroundColor: ds.colors.border }}>
            <XStack height="100%" style={{ width: widthPercent, backgroundColor: color }} />
        </XStack>
    );
}

/**
 * One labeled score row with fraction, percentage, and a progress bar.
 *
 * @param props Human label, numeric value, maximum, and accent color.
 * @returns Metric row with typography hierarchy and a ratio bar.
 */
function ScoreMetricRow(
    props: Readonly<{
        label: string;
        value: number;
        maximum: number;
        barColor: string;
    }>,
) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("reports");
    const { label, value, maximum, barColor } = props;
    const isNotApplicable = maximum <= 0;
    const percentageText = formatPercentage(value, maximum);
    const fractionText = isNotApplicable ? "N/A" : `${formatScoreValue(value)} / ${formatScoreValue(maximum)}`;

    return (
        <YStack gap="$1.5" width="100%" py="$2.5">
            <YStack justify="space-between" items="flex-start" gap="$2">
                <Paragraph
                    color={ds.colors.primaryForeground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.bodySm.fontSize}
                    lineHeight={ds.typography.bodySm.lineHeight}
                    flex={1}
                >
                    {label}
                </Paragraph>
                <XStack items="center" justify="space-between" gap="$0.5" minW="100%">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.monoMedium}
                        fontSize={layout.isTablet ? ds.typography.metricSm.fontSize : ds.typography.bodySm.fontSize}
                    >
                        {fractionText}
                    </Text>
                    <Text
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={layout.isTablet ? ds.typography.metricSm.fontSize : ds.typography.bodySm.fontSize}
                    >
                        {isNotApplicable ? t("detail.metricNotAssessed", { ns: "reports" }) : percentageText}
                    </Text>
                </XStack>
            </YStack>
            {isNotApplicable ? null : <ScoreRatioBar value={value} max={maximum} color={barColor} />}
        </YStack>
    );
}

interface SectionScoreDetailProps {
    readonly scoreTotals: AuditScoreTotals;
    readonly scoreSummaryLabels: ScoreSummaryLabels;
}

/**
 * Structured breakdown for one section: PV/U/S outcomes and Q/D/C scale columns.
 *
 * @param props Score totals and localized short labels for abbreviations.
 * @returns Grouped metrics with headings and ratio bars.
 */
function SectionScoreDetail({ scoreTotals, scoreSummaryLabels }: Readonly<SectionScoreDetailProps>) {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");
    const provisionMatchesUsability =
        scoreTotals.provision_total === scoreTotals.usability_total &&
        scoreTotals.provision_total_max === scoreTotals.usability_total_max;
    // Keep report scale colors in sync with the question-card selected background accents.
    const provisionScaleSoft = getScaleSoftColor("provision", ds.colors);
    const diversityScaleSoft = getScaleSoftColor("diversity", ds.colors);
    const challengeScaleSoft = getScaleSoftColor("challenge", ds.colors);

    return (
        <YStack gap="$6" pt="$2">
            <YStack gap="$2">
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                    lineHeight={ds.typography.titleMd.lineHeight}
                >
                    {t("detail.constructHeading", { ns: "reports" })}
                </Text>
                <YStack gap="$3">
                    <ScoreMetricRow
                        label={t("detail.playValueCardLabel", { ns: "reports" })}
                        value={scoreTotals.play_value_total}
                        maximum={scoreTotals.play_value_total_max}
                        barColor={ds.colors.warning}
                    />
                    <ScoreMetricRow
                        label={t("detail.usabilityCardLabel", { ns: "reports" })}
                        value={scoreTotals.usability_total}
                        maximum={scoreTotals.usability_total_max}
                        barColor={ds.colors.primary}
                    />
                    <ScoreMetricRow
                        label={t("detail.sociabilityCardLabel", { ns: "reports" })}
                        value={scoreTotals.sociability_total}
                        maximum={scoreTotals.sociability_total_max}
                        barColor={ds.colors.success}
                    />
                </YStack>
            </YStack>

            <YStack gap="$2">
                <Text
                    color={ds.colors.primary}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                    lineHeight={ds.typography.titleMd.lineHeight}
                >
                    {t("detail.scaleColumnsHeading", { ns: "reports" })}
                </Text>

                <YStack gap="$3">
                    {provisionMatchesUsability ? null : (
                        <ScoreMetricRow
                            label={`${t("detail.metricProvision", { ns: "reports" })} (${scoreSummaryLabels.provisionShort})`}
                            value={scoreTotals.provision_total}
                            maximum={scoreTotals.provision_total_max}
                            barColor={provisionScaleSoft}
                        />
                    )}
                    <ScoreMetricRow
                        label={`${t("detail.metricDiversity", { ns: "reports" })} (${scoreSummaryLabels.diversityShort})`}
                        value={scoreTotals.diversity_total}
                        maximum={scoreTotals.diversity_total_max}
                        barColor={diversityScaleSoft}
                    />
                    <ScoreMetricRow
                        label={`${t("detail.metricChallenge", { ns: "reports" })} (${scoreSummaryLabels.challengeShort})`}
                        value={scoreTotals.challenge_total}
                        maximum={scoreTotals.challenge_total_max}
                        barColor={challengeScaleSoft}
                    />
                </YStack>
            </YStack>
        </YStack>
    );
}

interface SectionBreakdownCardProps {
    readonly sectionRows: SectionReportRow[];
    readonly scoreSummaryLabels: ScoreSummaryLabels;
    readonly onSectionLayout: (sectionKey: string, event: LayoutChangeEvent) => void;
}

interface SurfaceCardProps {
    readonly children: ReactNode;
    readonly padding?: number;
}

/**
 * Shared elevated card shell used across report detail panels.
 *
 * @param props Card content with optional spacing overrides.
 * @returns Consistent bordered surface card.
 */
function SurfaceCard({ children, padding }: Readonly<SurfaceCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={padding ?? layout.cardPadding}
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            {children}
        </YStack>
    );
}

/**
 * Section list with per-section score cards and structured metric breakdowns.
 *
 * @param props Built section rows and localized score labels.
 * @returns Section breakdown card content.
 */
function SectionBreakdownCard({
    sectionRows,
    scoreSummaryLabels,
    onSectionLayout,
}: Readonly<SectionBreakdownCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("reports");

    return (
        <SurfaceCard>
            <Text color={ds.colors.foreground} fontFamily={ds.fonts.bodyBold} fontSize={ds.typography.titleMd.fontSize}>
                {t("detail.sectionBreakdown", { ns: "reports" })}
            </Text>
            {sectionRows.length === 0 ? (
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyMd.fontSize}
                >
                    {t("detail.scorePending", { ns: "reports" })}
                </Paragraph>
            ) : (
                <YStack gap="$3">
                    {sectionRows.map((sectionRow) => (
                        <YStack
                            key={sectionRow.sectionKey}
                            onLayout={(event) => {
                                onSectionLayout(sectionRow.sectionKey, event);
                            }}
                            rounded={ds.radii.md}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.input}
                            p="$4"
                            gap="$2"
                        >
                            <XStack justify="space-between" items="flex-start" gap="$3">
                                <YStack flex={1} gap="$1">
                                    <Text
                                        color={ds.colors.foreground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.bodyLg.fontSize}
                                    >
                                        {`${sectionRow.sectionNumber}. ${sectionRow.title}`}
                                    </Text>
                                    <Paragraph
                                        color={ds.colors.mutedForeground}
                                        fontFamily={ds.fonts.bodyMedium}
                                        fontSize={ds.typography.bodySm.fontSize}
                                    >
                                        {t("detail.questionsAnswered", {
                                            ns: "reports",
                                            answered: sectionRow.answeredCount,
                                            total: sectionRow.totalCount,
                                        })}
                                    </Paragraph>
                                </YStack>
                                <YStack shrink={1} items="flex-end" gap="$0.5" maxW="48%">
                                    <Text
                                        color={
                                            sectionRow.scoreTotals === null
                                                ? ds.colors.mutedForeground
                                                : ds.colors.primary
                                        }
                                        fontFamily={ds.fonts.headingBold}
                                        fontSize={
                                            layout.isTablet
                                                ? ds.typography.metricSm.fontSize
                                                : ds.typography.metricXs.fontSize
                                        }
                                        lineHeight={
                                            layout.isTablet
                                                ? ds.typography.metricSm.lineHeight
                                                : ds.typography.metricXs.lineHeight
                                        }
                                        style={{ textAlign: "right" }}
                                    >
                                        {sectionRow.scoreTotals === null
                                            ? "—"
                                            : formatPercentage(
                                                  getCombinedConstructScore(sectionRow.scoreTotals) ?? 0,
                                                  getCombinedConstructMaxScore(sectionRow.scoreTotals) ?? 0,
                                              )}
                                    </Text>
                                </YStack>
                            </XStack>
                            {sectionRow.scoreTotals === null ? (
                                <Paragraph
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.bodySm.fontSize}
                                >
                                    {t("detail.scorePending", { ns: "reports" })}
                                </Paragraph>
                            ) : (
                                <SectionScoreDetail
                                    scoreTotals={sectionRow.scoreTotals}
                                    scoreSummaryLabels={scoreSummaryLabels}
                                />
                            )}
                        </YStack>
                    ))}
                </YStack>
            )}
        </SurfaceCard>
    );
}

interface SectionNavigatorCardProps {
    readonly sectionRows: SectionReportRow[];
    readonly onSectionPress: (sectionKey: string) => void;
}

function SectionNavigatorCard({ sectionRows, onSectionPress }: Readonly<SectionNavigatorCardProps>) {
    const ds = useDesignSystem();
    const { t } = useTranslation("reports");

    const getScoreTone = useCallback(
        (percentage: number | null) => {
            if (percentage === null) {
                return ds.colors.border;
            }
            if (percentage >= 85) {
                return ds.colors.success;
            }
            if (percentage >= 60) {
                return ds.colors.warning;
            }
            return ds.colors.danger;
        },
        [ds.colors.border, ds.colors.danger, ds.colors.success, ds.colors.warning],
    );

    return (
        <SurfaceCard>
            <YStack gap="$1">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.titleMd.fontSize}
                >
                    {t("detail.sectionOverviewTitle", { ns: "reports" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {t("detail.sectionOverviewHint", { ns: "reports" })}
                </Paragraph>
            </YStack>

            <YStack gap="$3">
                {sectionRows.map((sectionRow) => {
                    const combinedScore =
                        sectionRow.scoreTotals === null ? null : getCombinedConstructScore(sectionRow.scoreTotals);
                    const combinedMaximum =
                        sectionRow.scoreTotals === null ? null : getCombinedConstructMaxScore(sectionRow.scoreTotals);
                    const percentage =
                        combinedScore === null || combinedMaximum === null || combinedMaximum <= 0
                            ? null
                            : (combinedScore / combinedMaximum) * 100;
                    const barColor = getScoreTone(percentage);

                    return (
                        <Pressable
                            key={sectionRow.sectionKey}
                            accessibilityRole="button"
                            accessibilityLabel={`Jump to section ${sectionRow.sectionNumber}: ${sectionRow.title}`}
                            onPress={() => {
                                onSectionPress(sectionRow.sectionKey);
                            }}
                        >
                            {({ pressed }) => (
                                <YStack gap="$1.5" opacity={pressed ? 0.85 : 1}>
                                    <XStack justify="space-between" items="flex-start" gap="$2">
                                        <Text
                                            color={ds.colors.foreground}
                                            fontFamily={ds.fonts.bodyBold}
                                            fontSize={ds.typography.bodySm.fontSize}
                                            flex={1}
                                        >
                                            {`${sectionRow.sectionNumber}. ${sectionRow.title}`}
                                        </Text>
                                        <Text
                                            color={ds.colors.mutedForeground}
                                            fontFamily={ds.fonts.bodyMedium}
                                            fontSize={ds.typography.bodyXs.fontSize}
                                        >
                                            {sectionRow.scoreTotals === null
                                                ? t("detail.scorePending", { ns: "reports" })
                                                : formatScoreWithPercentage(combinedScore ?? 0, combinedMaximum ?? 0)}
                                        </Text>
                                    </XStack>
                                    <XStack
                                        height={7}
                                        rounded={9999}
                                        overflow="hidden"
                                        style={{ backgroundColor: ds.colors.border }}
                                    >
                                        <XStack
                                            height="100%"
                                            style={{
                                                width: `${Math.round((percentage ?? 0) * 10) / 10}%`,
                                                backgroundColor: barColor,
                                            }}
                                        />
                                    </XStack>
                                </YStack>
                            )}
                        </Pressable>
                    );
                })}
            </YStack>
        </SurfaceCard>
    );
}

/**
 * Full-screen audit detail shown from the reports tab.
 */
export default function AuditReportDetailScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["reports", "common", "places"]);
    const toast = useToastController();
    const instrument = useLocalizedInstrument();
    const params = useLocalSearchParams<{ auditId?: string | string[] }>();
    const session = useAuthStore((state) => state.session);
    const places = useLocalFirstPlaces();
    const isLoadingPlaces = usePlacesStore((state) => state.isLoading);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);
    const sessionsByAuditId = usePlayspaceAuditStore((state) => state.sessionsByAuditId);
    const [auditSession, setAuditSession] = useState<AuditSession | null>(null);
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeExportKey, setActiveExportKey] = useState<string | null>(null);
    const auditId = readSingleParam(params.auditId);
    const scrollViewRef = useRef<ScrollView | null>(null);
    const sectionOffsetsRef = useRef<Record<string, number>>({});

    const cachedAudit = auditId === null ? undefined : sessionsByAuditId[auditId];
    const place = useMemo(() => {
        if (auditId === null) {
            return undefined;
        }
        return places.find((candidate) => candidate.audit_id === auditId);
    }, [auditId, places]);

    useEffect(() => {
        if (session !== null && (places.length === 0 || (auditId !== null && place === undefined))) {
            loadPlaces(session).catch(() => undefined);
        }
    }, [auditId, loadPlaces, place, places.length, session]);

    useEffect(() => {
        if (cachedAudit !== undefined) {
            setAuditSession(cachedAudit);
        }
    }, [cachedAudit]);

    useEffect(() => {
        let isCancelled = false;

        if (session === null || auditId === null) {
            setIsLoadingAudit(false);
            return () => {
                isCancelled = true;
            };
        }

        setIsLoadingAudit(cachedAudit === undefined);
        setErrorMessage(null);

        fetchAuditSession(session, auditId)
            .then((nextAuditSession) => {
                if (isCancelled) {
                    return;
                }
                setAuditSession(nextAuditSession);
            })
            .catch((error) => {
                if (isCancelled) {
                    return;
                }
                if (cachedAudit === undefined) {
                    setErrorMessage(
                        error instanceof Error && error.message.trim().length > 0
                            ? error.message
                            : t("detail.unavailableMessage", { ns: "reports" }),
                    );
                }
            })
            .finally(() => {
                if (isCancelled) {
                    return;
                }
                setIsLoadingAudit(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [auditId, cachedAudit, session, t]);

    const scoreSummaryLabels: ScoreSummaryLabels = {
        playValueShort: t("playValueShort", { ns: "reports" }),
        usabilityShort: t("usabilityShort", { ns: "reports" }),
        sociabilityShort: t("sociabilityShort", { ns: "reports" }),
        provisionShort: t("provisionShort", { ns: "reports" }),
        diversityShort: t("diversityShort", { ns: "reports" }),
        challengeShort: t("challengeShort", { ns: "reports" }),
    };

    const sectionRows = useMemo(() => {
        if (auditSession === null) {
            return [];
        }

        const progressByKey = new Map(
            auditSession.progress.sections.map((section) => [section.section_key, section] as const),
        );
        const scoresByKey = auditSession.scores.by_section;

        return instrument!.sections.reduce<SectionReportRow[]>((rows, section) => {
            const progress = progressByKey.get(section.section_key);
            const scoreTotals = scoresByKey[section.section_key] ?? null;

            if (progress === undefined && scoreTotals === null) {
                return rows;
            }

            rows.push({
                sectionKey: section.section_key,
                sectionNumber: rows.length + 1,
                title: section.title,
                answeredCount: progress?.answered_question_count ?? 0,
                totalCount: progress?.visible_question_count ?? section.questions.length,
                scoreTotals,
            });
            return rows;
        }, []);
    }, [auditSession, instrument]);

    const showExportSuccess = useCallback(
        (fileName: string) => {
            toast.show(t("exportReadyTitle", { ns: "reports" }), {
                message: t("exportReadyMessage", { ns: "reports", fileName }),
                duration: 4000,
                variant: "success",
            });
        },
        [t, toast],
    );

    const showExportError = useCallback(
        (error: unknown) => {
            const message =
                error instanceof Error && error.message.trim().length > 0
                    ? error.message
                    : t("exportFailedMessage", { ns: "reports" });
            toast.show(t("exportFailedTitle", { ns: "reports" }), {
                message,
                duration: 5000,
                variant: "error",
            });
        },
        [t, toast],
    );

    const handleSingleAuditExport = useCallback(
        async (format: AuditExportFormat) => {
            if (place === undefined) {
                showExportError(new Error(t("exportAuditMissing", { ns: "reports" })));
                return;
            }

            const exportKey = `single:${place.place_id}:${format}`;
            setActiveExportKey(exportKey);
            try {
                const auditorProfile = await loadOptionalExportAuditorProfile(session);
                const exportableAudit = await buildExportableAuditForPlace({
                    session,
                    place,
                    cachedAudit,
                    exportSessionRequiredMessage: t("exportSessionRequired", { ns: "reports" }),
                    exportAuditMissingMessage: t("exportAuditMissing", { ns: "reports" }),
                    auditorProfile,
                });
                await shareSingleAuditExport(exportableAudit, instrument!, format);
                const placeAbbreviatedName = place.place_name
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .toUpperCase();
                const projectAbbreviatedName = place.project_name
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .toUpperCase();
                const auditorCode = auditorProfile?.auditorCode ?? "";
                const userFriendlyFileName = `PVUA ${projectAbbreviatedName} ${placeAbbreviatedName} ${auditorCode} ${format.toUpperCase()}`;

                showExportSuccess(userFriendlyFileName);
            } catch (error) {
                showExportError(error);
            } finally {
                setActiveExportKey((currentValue) => (currentValue === exportKey ? null : currentValue));
            }
        },
        [cachedAudit, instrument, place, session, showExportError, showExportSuccess, t],
    );

    const scrollReportDetailToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    const handleSectionLayout = useCallback((sectionKey: string, event: LayoutChangeEvent) => {
        sectionOffsetsRef.current[sectionKey] = event.nativeEvent.layout.y;
    }, []);

    const scrollToSection = useCallback((sectionKey: string) => {
        const offset = sectionOffsetsRef.current[sectionKey];
        if (typeof offset === "number") {
            scrollViewRef.current?.scrollTo({ animated: true, x: 0, y: Math.max(0, offset - 12) });
        }
    }, []);

    useScreenshotScrollAutomation({
        contentReady: auditSession !== null,
        rerunKey: auditSession?.audit_id ?? auditId ?? "report-detail",
        scrollToOffset: scrollReportDetailToOffset,
    });

    const title = place?.place_name ?? auditSession?.place_name ?? t("detail.screenTitle", { ns: "reports" });

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: ds.colors.surface },
                    contentStyle: { paddingTop: 20 },
                    headerTintColor: ds.colors.primary,
                    headerTitle: () => (
                        <YStack justify="center" my="$2" style={{ maxWidth: "88%" }}>
                            <ScrollView horizontal>
                                <Text
                                    color={ds.colors.primary}
                                    fontFamily={ds.fonts.bodySemiBold}
                                    fontSize={ds.typography.titleLg.fontSize}
                                    lineHeight={ds.typography.titleLg.lineHeight}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {title}
                                </Text>
                            </ScrollView>
                        </YStack>
                    ),
                    headerTitleStyle: {
                        color: ds.colors.foreground,
                        fontFamily: ds.fonts.bodyBold,
                    },
                }}
            />

            {auditId === null ? (
                <DetailStateCard
                    title={t("detail.unavailableTitle", { ns: "reports" })}
                    message={t("detail.unavailableMessage", { ns: "reports" })}
                />
            ) : auditSession === null ? (
                <DetailStateCard
                    title={
                        errorMessage === null
                            ? t("detail.loadingTitle", { ns: "reports" })
                            : t("detail.unavailableTitle", { ns: "reports" })
                    }
                    message={errorMessage ?? t("detail.loadingMessage", { ns: "reports" })}
                    isLoading={errorMessage === null && (isLoadingAudit || isLoadingPlaces)}
                />
            ) : (
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
                    <AuditHeader auditSession={auditSession} place={place} />

                    {layout.isTablet ? (
                        <XStack gap={layout.twoPaneGap} items="flex-start">
                            <YStack flex={1} gap="$3">
                                <AuditMetrics auditSession={auditSession} />
                                <SectionNavigatorCard sectionRows={sectionRows} onSectionPress={scrollToSection} />
                                <SectionBreakdownCard
                                    sectionRows={sectionRows}
                                    scoreSummaryLabels={scoreSummaryLabels}
                                    onSectionLayout={handleSectionLayout}
                                />
                            </YStack>

                            <YStack width={layout.supportRailWidth} gap="$3">
                                <SurfaceCard>
                                    <Text
                                        color={ds.colors.foreground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.titleMd.fontSize}
                                    >
                                        {t("detail.auditMetadata", { ns: "reports" })}
                                    </Text>
                                    <MetadataRow
                                        label={t("detail.auditCode", { ns: "reports" })}
                                        value={auditSession.audit_code}
                                        selectable
                                        isCode
                                    />
                                    <MetadataRow
                                        label={t("detail.status", { ns: "reports" })}
                                        value={getPlaceStatusLabel(
                                            derivePlaceStatus(place?.audit_status ?? auditSession.status),
                                            t,
                                        )}
                                    />
                                    {place === undefined ? null : (
                                        <MetadataRow
                                            label={t("detail.project", { ns: "reports" })}
                                            value={place.project_name}
                                        />
                                    )}
                                    <MetadataRow
                                        label={t("detail.startedAt", { ns: "reports" })}
                                        value={formatDateTime(auditSession.started_at)}
                                    />
                                    <MetadataRow
                                        label={t("detail.submittedAt", { ns: "reports" })}
                                        value={
                                            auditSession.submitted_at === null
                                                ? t("filters.notScored", { ns: "common" })
                                                : formatDateTime(auditSession.submitted_at)
                                        }
                                    />
                                    <MetadataRow
                                        label={t("detail.progress", { ns: "reports" })}
                                        value={`${auditSession.progress.answered_visible_questions}/${auditSession.progress.total_visible_questions}`}
                                    />
                                </SurfaceCard>

                                {place === undefined ? null : (
                                    <SurfaceCard>
                                        <XStack items="center" gap="$2">
                                            <FileBarChart size={16} color={ds.colors.primary} />
                                            <Text
                                                color={ds.colors.foreground}
                                                fontFamily={ds.fonts.bodyBold}
                                                fontSize={ds.typography.titleMd.fontSize}
                                            >
                                                {t("detail.exportThisAudit", { ns: "reports" })}
                                            </Text>
                                        </XStack>
                                        <YStack gap="$2" mt="$1">
                                            <ActionButton
                                                label={t("exportPdf", { ns: "reports" })}
                                                onPress={() => {
                                                    handleSingleAuditExport("pdf").catch(() => undefined);
                                                }}
                                                disabled={activeExportKey !== null}
                                                isLoading={activeExportKey === `single:${place.place_id}:pdf`}
                                            />
                                            <ActionButton
                                                label={t("exportCsv", { ns: "reports" })}
                                                onPress={() => {
                                                    handleSingleAuditExport("csv").catch(() => undefined);
                                                }}
                                                disabled={activeExportKey !== null}
                                                isLoading={activeExportKey === `single:${place.place_id}:csv`}
                                            />
                                            <ActionButton
                                                label={t("exportExcel", { ns: "reports" })}
                                                onPress={() => {
                                                    handleSingleAuditExport("xlsx").catch(() => undefined);
                                                }}
                                                disabled={activeExportKey !== null}
                                                isLoading={activeExportKey === `single:${place.place_id}:xlsx`}
                                            />
                                        </YStack>
                                    </SurfaceCard>
                                )}
                            </YStack>
                        </XStack>
                    ) : (
                        <YStack gap="$3">
                            <AuditMetrics auditSession={auditSession} />
                            <SectionNavigatorCard sectionRows={sectionRows} onSectionPress={scrollToSection} />

                            <SurfaceCard>
                                <Text
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.titleMd.fontSize}
                                >
                                    {t("detail.auditMetadata", { ns: "reports" })}
                                </Text>
                                <MetadataRow
                                    label={t("detail.auditCode", { ns: "reports" })}
                                    value={auditSession.audit_code}
                                    selectable
                                    isCode
                                />
                                <MetadataRow
                                    label={t("detail.status", { ns: "reports" })}
                                    value={getPlaceStatusLabel(
                                        derivePlaceStatus(place?.audit_status ?? auditSession.status),
                                        t,
                                    )}
                                />
                                {place === undefined ? null : (
                                    <MetadataRow
                                        label={t("detail.project", { ns: "reports" })}
                                        value={place.project_name}
                                    />
                                )}
                                <MetadataRow
                                    label={t("detail.startedAt", { ns: "reports" })}
                                    value={formatDateTime(auditSession.started_at)}
                                />
                                <MetadataRow
                                    label={t("detail.submittedAt", { ns: "reports" })}
                                    value={
                                        auditSession.submitted_at === null
                                            ? t("filters.notScored", { ns: "common" })
                                            : formatDateTime(auditSession.submitted_at)
                                    }
                                />
                                <MetadataRow
                                    label={t("detail.progress", { ns: "reports" })}
                                    value={`${auditSession.progress.answered_visible_questions}/${auditSession.progress.total_visible_questions}`}
                                />
                            </SurfaceCard>

                            {place === undefined ? null : (
                                <SurfaceCard>
                                    <XStack items="center" gap="$2">
                                        <FileBarChart size={16} color={ds.colors.primary} />
                                        <Text
                                            color={ds.colors.foreground}
                                            fontFamily={ds.fonts.bodyBold}
                                            fontSize={ds.typography.titleMd.fontSize}
                                        >
                                            {t("detail.exportThisAudit", { ns: "reports" })}
                                        </Text>
                                    </XStack>
                                    <YStack gap="$2" mt="$1">
                                        <ActionButton
                                            label={t("exportPdf", { ns: "reports" })}
                                            onPress={() => {
                                                handleSingleAuditExport("pdf").catch(() => undefined);
                                            }}
                                            disabled={activeExportKey !== null}
                                            isLoading={activeExportKey === `single:${place.place_id}:pdf`}
                                        />
                                        <ActionButton
                                            label={t("exportCsv", { ns: "reports" })}
                                            onPress={() => {
                                                handleSingleAuditExport("csv").catch(() => undefined);
                                            }}
                                            disabled={activeExportKey !== null}
                                            isLoading={activeExportKey === `single:${place.place_id}:csv`}
                                        />
                                        <ActionButton
                                            label={t("exportExcel", { ns: "reports" })}
                                            onPress={() => {
                                                handleSingleAuditExport("xlsx").catch(() => undefined);
                                            }}
                                            disabled={activeExportKey !== null}
                                            isLoading={activeExportKey === `single:${place.place_id}:xlsx`}
                                        />
                                    </YStack>
                                </SurfaceCard>
                            )}

                            <SectionBreakdownCard
                                sectionRows={sectionRows}
                                scoreSummaryLabels={scoreSummaryLabels}
                                onSectionLayout={handleSectionLayout}
                            />
                        </YStack>
                    )}
                </ScrollView>
            )}
        </>
    );
}

interface AuditHeaderProps {
    readonly auditSession: AuditSession;
    readonly place: AuditorPlace | undefined;
}

/**
 * Header block for the audit detail screen.
 *
 * @param props Loaded audit session, optional place summary, and active language.
 * @returns Audit header card cluster.
 */
function AuditHeader({ auditSession, place }: Readonly<AuditHeaderProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["reports", "common"]);
    const status = derivePlaceStatus(place?.audit_status ?? auditSession.status);
    const statusTone = getPlaceStatusTone(status, ds.colors);
    const locality = place === undefined ? null : deriveLocality(place, t("place.assignedPlace", { ns: "common" }));

    return (
        <YStack gap="$3">
            <XStack justify="space-between" items="flex-start" gap="$3">
                <YStack flex={1} gap="$1.5">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={layout.isTablet ? ds.typography.metricLg.fontSize : ds.typography.metricMd.fontSize}
                        lineHeight={
                            layout.isTablet ? ds.typography.metricLg.lineHeight : ds.typography.metricMd.lineHeight
                        }
                    >
                        {place?.place_name ?? auditSession.place_name}
                    </Text>
                    {place === undefined ? null : (
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyMd.fontSize}
                        >
                            {place.project_name}
                        </Paragraph>
                    )}
                </YStack>
                <YStack
                    rounded={ds.radii.full}
                    px="$3"
                    py="$1.5"
                    style={{ backgroundColor: statusTone.surface, maxWidth: "45%" }}
                >
                    <Text
                        style={{ color: statusTone.text }}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelXs.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {getPlaceStatusLabel(status, t)}
                    </Text>
                </YStack>
            </XStack>
            {locality === null ? null : (
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
            )}
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyMedium}
                fontSize={ds.typography.bodyLg.fontSize}
            >
                {formatDateTime(auditSession.started_at)}
            </Paragraph>
        </YStack>
    );
}

/**
 * Format helper text that only shows the maximum score ceiling for a metric.
 *
 * @param maximum Maximum possible score.
 * @returns Helper text or undefined when the ceiling is unavailable.
 */
function formatMetricMaxHelper(maximum: number | null): string | undefined {
    if (maximum === null || maximum <= 0) {
        return undefined;
    }
    return `${formatScoreValue(maximum)} max`;
}

interface AuditMetricsProps {
    readonly auditSession: AuditSession;
}

/**
 * Top-line audit score cards shown above the section breakdown.
 *
 * @param props Loaded audit session.
 * @returns Summary metric card grid.
 */
function AuditMetrics({ auditSession }: Readonly<AuditMetricsProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation("reports");
    const overall = auditSession.scores.overall;
    const overallScore = overall === null ? null : getCombinedConstructScore(overall);
    const overallMaximum = overall === null ? null : getCombinedConstructMaxScore(overall);
    const pendingMetricText = t("detail.pendingMetric", { ns: "reports" });
    const overallMetricValue =
        overallScore === null || overallMaximum === null
            ? pendingMetricText
            : formatScoreWithPercentage(overallScore, overallMaximum);
    const playValueMetricValue =
        overall === null
            ? pendingMetricText
            : formatScoreWithPercentage(overall.play_value_total, overall.play_value_total_max);
    const usabilityMetricValue =
        overall === null
            ? pendingMetricText
            : formatScoreWithPercentage(overall.usability_total, overall.usability_total_max);
    const sociabilityMetricValue =
        overall === null
            ? pendingMetricText
            : formatScoreWithPercentage(overall.sociability_total, overall.sociability_total_max);

    const overallHelperText =
        overall === null || overallMaximum === null || overallMaximum <= 0
            ? undefined
            : `${t("detail.overallScoreHint", { ns: "reports" })} · ${formatScoreValue(overallMaximum)} max`;

    return (
        <YStack gap="$3">
            <Text color={ds.colors.foreground} fontFamily={ds.fonts.bodyBold} fontSize={ds.typography.titleMd.fontSize}>
                {t("detail.scoreSummaryTitle", { ns: "reports" })}
            </Text>
            <XStack gap="$3">
                <StatCard
                    label={t("detail.overallScore", { ns: "reports" })}
                    value={overallMetricValue}
                    accentColor={ds.colors.primary}
                    helperText={overallHelperText}
                    minHeight={layout.summaryCardMinHeight}
                />
                <StatCard
                    label={t("detail.playValueCardLabel", { ns: "reports" })}
                    value={playValueMetricValue}
                    accentColor={ds.colors.primary}
                    helperText={overall === null ? undefined : formatMetricMaxHelper(overall.play_value_total_max)}
                    minHeight={layout.summaryCardMinHeight}
                />
            </XStack>
            <XStack gap="$3">
                <StatCard
                    label={t("detail.usabilityCardLabel", { ns: "reports" })}
                    value={usabilityMetricValue}
                    accentColor={ds.colors.primary}
                    helperText={overall === null ? undefined : formatMetricMaxHelper(overall.usability_total_max)}
                    minHeight={layout.summaryCardMinHeight}
                />
                <StatCard
                    label={t("detail.sociabilityCardLabel", { ns: "reports" })}
                    value={sociabilityMetricValue}
                    accentColor={ds.colors.primary}
                    helperText={overall === null ? undefined : formatMetricMaxHelper(overall.sociability_total_max)}
                    minHeight={layout.summaryCardMinHeight}
                />
            </XStack>
        </YStack>
    );
}

interface MetadataRowProps {
    readonly label: string;
    readonly value: string;
    readonly selectable?: boolean;
    readonly isCode?: boolean;
}

/**
 * Label/value row used in the audit metadata card.
 *
 * @param props Metadata label and value.
 * @returns Horizontal metadata row.
 */
function MetadataRow({ label, value, selectable = false, isCode = false }: Readonly<MetadataRowProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    return (
        <XStack justify="space-between" items="flex-start" gap="$3">
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={ds.typography.bodySm.fontSize}
                flex={1}
            >
                {label}
            </Paragraph>
            {isCode ? (
                <YStack flex={1}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{
                            flexGrow: 1,
                            justifyContent: "flex-end",
                            alignItems: "center",
                        }}
                    >
                        <Text
                            selectable={selectable}
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.monoMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                            lineHeight={ds.typography.bodySm.lineHeight}
                            style={{
                                minWidth: layout.isTablet ? layout.supportRailWidth - 48 : 0,
                                textAlign: "right",
                                alignItems: "center",
                            }}
                        >
                            {value}
                        </Text>
                    </ScrollView>
                </YStack>
            ) : (
                <Text
                    selectable={selectable}
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                    lineHeight={ds.typography.bodySm.lineHeight}
                    flex={1}
                    style={{ textAlign: "right" }}
                >
                    {value}
                </Text>
            )}
        </XStack>
    );
}

interface DetailStateCardProps {
    readonly title: string;
    readonly message: string;
    readonly isLoading?: boolean;
}

/**
 * Compact placeholder state used while a report detail route is loading or unavailable.
 *
 * @param props Placeholder title, message, and loading state.
 * @returns Full-screen centered placeholder card.
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

/**
 * Format an ISO timestamp into a localized date/time label.
 *
 * @param value ISO timestamp.
 * @returns Localized date and time string.
 */
function formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const dateLabel = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
    const timeLabel = new Intl.DateTimeFormat("en-GB", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    })
        .format(date)
        .replace(/\b(am|pm)\b/i, (match) => match.toUpperCase());

    return `${dateLabel}, ${timeLabel}`;
}
