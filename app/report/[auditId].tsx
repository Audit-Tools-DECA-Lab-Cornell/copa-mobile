import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useToastController } from "@tamagui/toast";
import { FileBarChart, MapPin } from "@tamagui/lucide-icons-2";
import { useTranslation } from "react-i18next";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { ActionButton } from "components/ui/action-button";
import { StatCard } from "components/ui/stat-card";
import { fetchAuditSession } from "lib/audit/api";
import { shareSingleAuditExport, type AuditExportFormat } from "lib/audit/export";
import {
    buildExportableAuditForPlace,
    loadOptionalExportAuditorProfile,
} from "lib/audit/export-helpers";
import type { AuditorPlace } from "lib/audit/places-api";
import { deriveLocality, derivePlaceStatus } from "lib/audit/place-helpers";
import {
    formatColumnSummary,
    formatConstructSummary,
    formatScoreValue,
    getCombinedConstructScore,
    type ScoreSummaryLabels,
} from "lib/audit/score-helpers";
import type { AuditScoreTotals, AuditSession } from "lib/audit/types";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { getPlaceStatusTone, useDesignSystem } from "lib/design-system";
import { formatLocalizedDate, formatLocalizedTime, getPlaceStatusLabel } from "lib/i18n/format";
import { createMetricDisplayState } from "lib/metric-display";
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
 * Full-screen audit detail shown from the reports tab.
 */
export default function AuditReportDetailScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t, i18n } = useTranslation(["reports", "common", "places"]);
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

    const cachedAudit = auditId === null ? undefined : sessionsByAuditId[auditId];
    const place = useMemo(() => {
        if (auditId === null) {
            return undefined;
        }
        return places.find((candidate) => candidate.audit_id === auditId);
    }, [auditId, places]);

    useEffect(() => {
        if (
            session !== null &&
            (places.length === 0 || (auditId !== null && place === undefined))
        ) {
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
        quantityShort: t("quantityShort", { ns: "reports" }),
        diversityShort: t("diversityShort", { ns: "reports" }),
        challengeShort: t("challengeShort", { ns: "reports" }),
    };

    const sectionRows = useMemo(() => {
        if (auditSession === null) {
            return [];
        }

        const progressByKey = new Map(
            auditSession.progress.sections.map(
                (section) => [section.section_key, section] as const,
            ),
        );
        const scoresByKey = auditSession.scores.by_section;

        return instrument.sections.reduce<SectionReportRow[]>((rows, section) => {
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
    }, [auditSession, instrument.sections]);

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
                await shareSingleAuditExport(exportableAudit, instrument, format);
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
                const userFriendlyFileName =
                    "PVUA " +
                    projectAbbreviatedName +
                    " " +
                    placeAbbreviatedName +
                    " " +
                    auditorCode +
                    " " +
                    format.toUpperCase();

                showExportSuccess(userFriendlyFileName);
            } catch (error) {
                showExportError(error);
            } finally {
                setActiveExportKey((currentValue) =>
                    currentValue === exportKey ? null : currentValue,
                );
            }
        },
        [cachedAudit, instrument, place, session, showExportError, showExportSuccess, t],
    );

    const scrollReportDetailToOffset = useCallback((offset: number) => {
        scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: offset });
    }, []);

    useScreenshotScrollAutomation({
        contentReady: auditSession !== null,
        rerunKey: auditSession?.audit_id ?? auditId ?? "report-detail",
        scrollToOffset: scrollReportDetailToOffset,
    });

    const title =
        place?.place_name ?? auditSession?.place_name ?? t("detail.screenTitle", { ns: "reports" });

    return (
        <>
            <Stack.Screen
                options={{
                    title,
                    headerShown: true,
                    headerStyle: { backgroundColor: ds.colors.surface },
                    headerTintColor: ds.colors.primary,
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
                    })}
                >
                    <AuditHeader
                        auditSession={auditSession}
                        place={place}
                        language={i18n.language}
                    />

                    {layout.isTablet ? (
                        <XStack gap={layout.twoPaneGap} items="flex-start">
                            <YStack flex={1} gap="$3">
                                <AuditMetrics auditSession={auditSession} />
                                <YStack
                                    rounded={ds.radii.lg}
                                    borderWidth={1}
                                    borderColor={ds.colors.border}
                                    bg={ds.colors.surface}
                                    p={layout.cardPadding}
                                    gap="$3"
                                    style={{ boxShadow: ds.shadows.card }}
                                >
                                    <Text
                                        color={ds.colors.foreground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.titleMd.fontSize}
                                    >
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
                                                    rounded={ds.radii.md}
                                                    borderWidth={1}
                                                    borderColor={ds.colors.border}
                                                    bg={ds.colors.input}
                                                    p="$4"
                                                    gap="$2"
                                                >
                                                    <XStack
                                                        justify="space-between"
                                                        items="flex-start"
                                                        gap="$3"
                                                    >
                                                        <YStack flex={1}>
                                                            <Text
                                                                color={ds.colors.foreground}
                                                                fontFamily={ds.fonts.bodyBold}
                                                                fontSize={
                                                                    ds.typography.bodyLg.fontSize
                                                                }
                                                            >
                                                                {`${sectionRow.sectionNumber}. ${sectionRow.title}`}
                                                            </Text>
                                                            <Paragraph
                                                                color={ds.colors.mutedForeground}
                                                                fontFamily={ds.fonts.bodyMedium}
                                                                fontSize={
                                                                    ds.typography.bodySm.fontSize
                                                                }
                                                            >
                                                                {`${sectionRow.answeredCount}/${sectionRow.totalCount}`}
                                                            </Paragraph>
                                                        </YStack>
                                                        <Text
                                                            color={
                                                                sectionRow.scoreTotals === null
                                                                    ? ds.colors.mutedForeground
                                                                    : ds.colors.primary
                                                            }
                                                            fontFamily={ds.fonts.bodyBold}
                                                            fontSize={
                                                                ds.typography.metricSm.fontSize
                                                            }
                                                        >
                                                            {sectionRow.scoreTotals === null
                                                                ? "--"
                                                                : formatScoreValue(
                                                                      getCombinedConstructScore(
                                                                          sectionRow.scoreTotals,
                                                                      ) ?? 0,
                                                                  )}
                                                        </Text>
                                                    </XStack>
                                                    {sectionRow.scoreTotals === null ? (
                                                        <Paragraph
                                                            color={ds.colors.mutedForeground}
                                                            fontFamily={ds.fonts.bodyMedium}
                                                            fontSize={ds.typography.bodySm.fontSize}
                                                        >
                                                            {t("detail.scorePending", {
                                                                ns: "reports",
                                                            })}
                                                        </Paragraph>
                                                    ) : (
                                                        <YStack gap="$1">
                                                            <Paragraph
                                                                color={ds.colors.primary}
                                                                fontFamily={ds.fonts.bodyMedium}
                                                                fontSize={
                                                                    ds.typography.bodyXs.fontSize
                                                                }
                                                            >
                                                                {formatConstructSummary(
                                                                    sectionRow.scoreTotals,
                                                                    scoreSummaryLabels,
                                                                )}
                                                            </Paragraph>
                                                            <Paragraph
                                                                color={ds.colors.primary}
                                                                fontFamily={ds.fonts.bodyMedium}
                                                                fontSize={
                                                                    ds.typography.bodyXs.fontSize
                                                                }
                                                            >
                                                                {formatColumnSummary(
                                                                    sectionRow.scoreTotals,
                                                                    scoreSummaryLabels,
                                                                )}
                                                            </Paragraph>
                                                        </YStack>
                                                    )}
                                                </YStack>
                                            ))}
                                        </YStack>
                                    )}
                                </YStack>
                            </YStack>

                            <YStack width={layout.supportRailWidth} gap="$3">
                                <YStack
                                    rounded={ds.radii.lg}
                                    borderWidth={1}
                                    borderColor={ds.colors.border}
                                    bg={ds.colors.surface}
                                    p={layout.cardPadding}
                                    gap="$3"
                                    style={{ boxShadow: ds.shadows.card }}
                                >
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
                                            derivePlaceStatus(
                                                place?.audit_status ?? auditSession.status,
                                            ),
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
                                        value={formatDateTime(
                                            auditSession.started_at,
                                            i18n.language,
                                        )}
                                    />
                                    <MetadataRow
                                        label={t("detail.submittedAt", { ns: "reports" })}
                                        value={
                                            auditSession.submitted_at === null
                                                ? t("filters.notScored", { ns: "common" })
                                                : formatDateTime(
                                                      auditSession.submitted_at,
                                                      i18n.language,
                                                  )
                                        }
                                    />
                                    <MetadataRow
                                        label={t("detail.progress", { ns: "reports" })}
                                        value={`${auditSession.progress.answered_visible_questions}/${auditSession.progress.total_visible_questions}`}
                                    />
                                </YStack>

                                {place === undefined ? null : (
                                    <YStack
                                        rounded={ds.radii.lg}
                                        borderWidth={1}
                                        borderColor={ds.colors.border}
                                        bg={ds.colors.surface}
                                        p={layout.cardPadding}
                                        gap="$4"
                                        style={{ boxShadow: ds.shadows.card }}
                                    >
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
                                        <YStack gap="$2">
                                            <ActionButton
                                                label={t("exportPdf", { ns: "reports" })}
                                                onPress={() => {
                                                    handleSingleAuditExport("pdf").catch(
                                                        () => undefined,
                                                    );
                                                }}
                                                disabled={activeExportKey !== null}
                                                isLoading={
                                                    activeExportKey ===
                                                    `single:${place.place_id}:pdf`
                                                }
                                            />
                                            <ActionButton
                                                label={t("exportCsv", { ns: "reports" })}
                                                variant="primary"
                                                onPress={() => {
                                                    handleSingleAuditExport("csv").catch(
                                                        () => undefined,
                                                    );
                                                }}
                                                disabled={activeExportKey !== null}
                                                isLoading={
                                                    activeExportKey ===
                                                    `single:${place.place_id}:csv`
                                                }
                                            />
                                            <ActionButton
                                                label={t("exportExcel", { ns: "reports" })}
                                                onPress={() => {
                                                    handleSingleAuditExport("xlsx").catch(
                                                        () => undefined,
                                                    );
                                                }}
                                                disabled={activeExportKey !== null}
                                                isLoading={
                                                    activeExportKey ===
                                                    `single:${place.place_id}:xlsx`
                                                }
                                            />
                                        </YStack>
                                    </YStack>
                                )}
                            </YStack>
                        </XStack>
                    ) : (
                        <YStack gap="$3">
                            <AuditMetrics auditSession={auditSession} />

                            <YStack
                                rounded={ds.radii.lg}
                                borderWidth={1}
                                borderColor={ds.colors.border}
                                bg={ds.colors.surface}
                                p={layout.cardPadding}
                                gap="$3"
                                style={{ boxShadow: ds.shadows.card }}
                            >
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
                                        derivePlaceStatus(
                                            place?.audit_status ?? auditSession.status,
                                        ),
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
                                    value={formatDateTime(auditSession.started_at, i18n.language)}
                                />
                                <MetadataRow
                                    label={t("detail.submittedAt", { ns: "reports" })}
                                    value={
                                        auditSession.submitted_at === null
                                            ? t("filters.notScored", { ns: "common" })
                                            : formatDateTime(
                                                  auditSession.submitted_at,
                                                  i18n.language,
                                              )
                                    }
                                />
                                <MetadataRow
                                    label={t("detail.progress", { ns: "reports" })}
                                    value={`${auditSession.progress.answered_visible_questions}/${auditSession.progress.total_visible_questions}`}
                                />
                            </YStack>

                            {place === undefined ? null : (
                                <YStack
                                    rounded={ds.radii.lg}
                                    borderWidth={1}
                                    borderColor={ds.colors.border}
                                    bg={ds.colors.surface}
                                    p={layout.cardPadding}
                                    gap="$4"
                                    style={{ boxShadow: ds.shadows.card }}
                                >
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
                                    <XStack gap="$2">
                                        <ActionButton
                                            label={t("exportPdf", { ns: "reports" })}
                                            onPress={() => {
                                                handleSingleAuditExport("pdf").catch(
                                                    () => undefined,
                                                );
                                            }}
                                            disabled={activeExportKey !== null}
                                            isLoading={
                                                activeExportKey === `single:${place.place_id}:pdf`
                                            }
                                        />
                                        <ActionButton
                                            label={t("exportCsv", { ns: "reports" })}
                                            variant="primary"
                                            onPress={() => {
                                                handleSingleAuditExport("csv").catch(
                                                    () => undefined,
                                                );
                                            }}
                                            disabled={activeExportKey !== null}
                                            isLoading={
                                                activeExportKey === `single:${place.place_id}:csv`
                                            }
                                        />
                                        <ActionButton
                                            label={t("exportExcel", { ns: "reports" })}
                                            onPress={() => {
                                                handleSingleAuditExport("xlsx").catch(
                                                    () => undefined,
                                                );
                                            }}
                                            disabled={activeExportKey !== null}
                                            isLoading={
                                                activeExportKey === `single:${place.place_id}:xlsx`
                                            }
                                        />
                                    </XStack>
                                </YStack>
                            )}

                            <YStack
                                rounded={ds.radii.lg}
                                borderWidth={1}
                                borderColor={ds.colors.border}
                                bg={ds.colors.surface}
                                p={layout.cardPadding}
                                gap="$3"
                                style={{ boxShadow: ds.shadows.card }}
                            >
                                <Text
                                    color={ds.colors.foreground}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.titleMd.fontSize}
                                >
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
                                                rounded={ds.radii.md}
                                                borderWidth={1}
                                                borderColor={ds.colors.border}
                                                bg={ds.colors.input}
                                                p="$4"
                                                gap="$2"
                                            >
                                                <XStack
                                                    justify="space-between"
                                                    items="flex-start"
                                                    gap="$3"
                                                >
                                                    <YStack flex={1}>
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
                                                            {`${sectionRow.answeredCount}/${sectionRow.totalCount}`}
                                                        </Paragraph>
                                                    </YStack>
                                                    <Text
                                                        color={
                                                            sectionRow.scoreTotals === null
                                                                ? ds.colors.mutedForeground
                                                                : ds.colors.primary
                                                        }
                                                        fontFamily={ds.fonts.bodyBold}
                                                        fontSize={ds.typography.bodyMd.fontSize}
                                                    >
                                                        {sectionRow.scoreTotals === null
                                                            ? "--"
                                                            : formatScoreValue(
                                                                  getCombinedConstructScore(
                                                                      sectionRow.scoreTotals,
                                                                  ) ?? 0,
                                                              )}
                                                    </Text>
                                                </XStack>
                                                {sectionRow.scoreTotals === null ? (
                                                    <Paragraph
                                                        color={ds.colors.mutedForeground}
                                                        fontFamily={ds.fonts.bodyMedium}
                                                        fontSize={ds.typography.bodySm.fontSize}
                                                    >
                                                        {t("detail.scorePending", {
                                                            ns: "reports",
                                                        })}
                                                    </Paragraph>
                                                ) : (
                                                    <YStack gap="$1">
                                                        <Paragraph
                                                            color={ds.colors.primary}
                                                            fontFamily={ds.fonts.bodyMedium}
                                                            fontSize={ds.typography.bodyXs.fontSize}
                                                        >
                                                            {formatConstructSummary(
                                                                sectionRow.scoreTotals,
                                                                scoreSummaryLabels,
                                                            )}
                                                        </Paragraph>
                                                        <Paragraph
                                                            color={ds.colors.primary}
                                                            fontFamily={ds.fonts.bodyMedium}
                                                            fontSize={ds.typography.bodyXs.fontSize}
                                                        >
                                                            {formatColumnSummary(
                                                                sectionRow.scoreTotals,
                                                                scoreSummaryLabels,
                                                            )}
                                                        </Paragraph>
                                                    </YStack>
                                                )}
                                            </YStack>
                                        ))}
                                    </YStack>
                                )}
                            </YStack>
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
    readonly language: string;
}

/**
 * Header block for the audit detail screen.
 *
 * @param props Loaded audit session, optional place summary, and active language.
 * @returns Audit header card cluster.
 */
function AuditHeader({ auditSession, place, language }: Readonly<AuditHeaderProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["reports", "common"]);
    const status = derivePlaceStatus(place?.audit_status ?? auditSession.status);
    const statusTone = getPlaceStatusTone(status, ds.colors);
    const locality =
        place === undefined
            ? null
            : deriveLocality(place, t("place.assignedPlace", { ns: "common" }));

    return (
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
                {formatDateTime(auditSession.started_at, language)}
            </Paragraph>
        </YStack>
    );
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
    const pendingMetricText = t("detail.pendingMetric", { ns: "reports" });
    const overallMetric = createMetricDisplayState({
        pendingText: pendingMetricText,
        value: overallScore,
        formatValue: formatScoreValue,
    });
    const playValueMetric = createMetricDisplayState({
        pendingText: pendingMetricText,
        value: overall?.play_value_total ?? null,
        formatValue: formatScoreValue,
    });
    const usabilityMetric = createMetricDisplayState({
        pendingText: pendingMetricText,
        value: overall?.usability_total ?? null,
        formatValue: formatScoreValue,
    });
    const sociabilityMetric = createMetricDisplayState({
        pendingText: pendingMetricText,
        value: overall?.sociability_total ?? null,
        formatValue: formatScoreValue,
    });

    return (
        <YStack gap="$3">
            <XStack gap="$3">
                <StatCard
                    label={t("detail.overallScore", { ns: "reports" })}
                    value={overallMetric.value}
                    accentColor={ds.colors.primary}
                    helperText={overallMetric.helperText}
                    minHeight={layout.summaryCardMinHeight}
                />
                <StatCard
                    label="Play Value (PV)"
                    value={playValueMetric.value}
                    accentColor={ds.colors.warning}
                    helperText={playValueMetric.helperText}
                    minHeight={layout.summaryCardMinHeight}
                />
            </XStack>
            <XStack gap="$3">
                <StatCard
                    label="Usability (U)"
                    value={usabilityMetric.value}
                    accentColor={ds.colors.primary}
                    helperText={usabilityMetric.helperText}
                    minHeight={layout.summaryCardMinHeight}
                />
                <StatCard
                    label="Sociability (S)"
                    value={sociabilityMetric.value}
                    accentColor={ds.colors.success}
                    helperText={sociabilityMetric.helperText}
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
function MetadataRow({
    label,
    value,
    selectable = false,
    isCode = false,
}: Readonly<MetadataRowProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const valueFontSize = isCode ? ds.typography.bodyXs.fontSize : ds.typography.bodySm.fontSize;
    const valueLineHeight = isCode
        ? ds.typography.bodyXs.lineHeight
        : ds.typography.bodySm.lineHeight;
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
                        }}
                    >
                        <Text
                            selectable={selectable}
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.monoMedium}
                            fontSize={valueFontSize}
                            lineHeight={valueLineHeight}
                            style={{
                                minWidth: layout.isTablet ? layout.supportRailWidth - 48 : 0,
                                textAlign: "right",
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
                    fontSize={valueFontSize}
                    lineHeight={valueLineHeight}
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

/**
 * Format an ISO timestamp into a localized date/time label.
 *
 * @param value ISO timestamp.
 * @param language Active i18n language.
 * @returns Localized date and time string.
 */
function formatDateTime(value: string, language: string): string {
    const dateLabel = formatLocalizedDate(value, language);
    const timeLabel = formatLocalizedTime(value, language);
    if (dateLabel.length === 0) {
        return value;
    }
    return timeLabel.length === 0 ? dateLabel : `${dateLabel} ${timeLabel}`;
}
