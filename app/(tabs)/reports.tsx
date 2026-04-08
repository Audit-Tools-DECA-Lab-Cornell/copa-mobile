import { FlashList, FlashListRef, type ListRenderItemInfo } from "@shopify/flash-list";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
    TriangleAlert,
    ArrowRight,
    Clock3,
    FileBarChart,
    MapPin,
    Dot,
} from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { useToastController } from "@tamagui/toast";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { ActionButton } from "components/ui/action-button";
import { CollapsibleCard } from "components/ui/collapsible-card";
import { FilterChip } from "components/ui/filter-chip";
import { SearchInput } from "components/ui/search-input";
import { StatCard } from "components/ui/stat-card";
import {
    buildExportableAuditForPlace,
    loadOptionalExportAuditorProfile,
} from "lib/audit/export-helpers";
import type { AuditExportFormat, AuditExportPreview, ExportAuditorProfile } from "lib/audit/export";
import { buildAuditExportPreview, shareBulkAuditExport } from "lib/audit/export";
import type { AuditorPlace } from "lib/audit/places-api";
import {
    deriveLocality,
    derivePlaceStatus,
    getPlaceLastActivityTimestamp,
    matchesPlaceSearch,
} from "lib/audit/place-helpers";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import {
    formatColumnSummary,
    formatConstructSummary,
    formatScoreValue,
    getCombinedConstructScore,
    type ScoreSummaryLabels,
} from "lib/audit/score-helpers";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { useDesignSystem, getPlaceStatusTone } from "lib/design-system";
import { formatRelativeTimeLabel, getPlaceStatusLabel } from "lib/i18n/format";
import { getCardTextLineLimit } from "lib/responsive";
import { useLocalizedInstrument } from "lib/i18n/instrument-translations";
import { buildPairGridRows, type PairGridRow } from "lib/ui/pair-grid";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";
import { usePlacesStore } from "stores/places-store";

type ReportFilter = "all" | "submitted" | "scored" | "not_scored";
type ReportSortOption = "score" | "recent" | "name";
type ReportsListItem = AuditorPlace | PairGridRow<AuditorPlace>;

/**
 * Scoring tab with audit performance visuals derived from assigned places.
 * Keeps summary analytics on the tab and pushes deeper audit detail into a dedicated screen.
 */
export default function ReportsScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["reports", "common"]);
    const instrument = useLocalizedInstrument();
    const toast = useToastController();
    const session = useAuthStore((state) => state.session);
    const places = useLocalFirstPlaces();
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);
    const sessionsByAuditId = usePlayspaceAuditStore((state) => state.sessionsByAuditId);
    const [previewData, setPreviewData] = useState<AuditExportPreview | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [activeExportKey, setActiveExportKey] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [reportFilter, setReportFilter] = useState<ReportFilter>("all");
    const [sortOption, setSortOption] = useState<ReportSortOption>("score");
    const listRef = useRef<FlashListRef<ReportsListItem> | null>(null);

    useEffect(() => {
        if (session !== null) {
            loadPlaces(session).catch(() => undefined);
        }
    }, [session, loadPlaces]);

    const reportPlaces = useMemo(() => {
        return places.filter((place) => place.audit_id !== null);
    }, [places]);

    const placesWithScores = useMemo(() => {
        return reportPlaces.filter((place) => place.score_totals !== null);
    }, [reportPlaces]);

    const exportablePlaces = useMemo(() => {
        return placesWithScores.filter((place) => place.audit_id !== null);
    }, [placesWithScores]);

    const averageCombinedConstructScore = useMemo(() => {
        if (placesWithScores.length === 0) {
            return 0;
        }
        const sum = placesWithScores.reduce((total, place) => {
            return total + (getCombinedConstructScore(place.score_totals) ?? 0);
        }, 0);
        return sum / placesWithScores.length;
    }, [placesWithScores]);

    const averageSociabilityScore = useMemo(() => {
        if (placesWithScores.length === 0) {
            return 0;
        }
        const sum = placesWithScores.reduce((total, place) => {
            return total + (place.score_totals?.sociability_total ?? 0);
        }, 0);
        return sum / placesWithScores.length;
    }, [placesWithScores]);

    const topScoringPlace = useMemo(() => {
        if (exportablePlaces.length === 0) {
            return null;
        }
        return exportablePlaces.reduce((best, current) => {
            return (getCombinedConstructScore(current.score_totals) ?? 0) >
                (getCombinedConstructScore(best.score_totals) ?? 0)
                ? current
                : best;
        });
    }, [exportablePlaces]);

    const maxCombinedConstructScore = useMemo(() => {
        return placesWithScores.reduce((currentMax, place) => {
            return Math.max(currentMax, getCombinedConstructScore(place.score_totals) ?? 0);
        }, 0);
    }, [placesWithScores]);

    const filteredReportPlaces = useMemo(() => {
        const visiblePlaces = reportPlaces.filter((place) => {
            if (!matchesPlaceSearch(place, searchQuery)) {
                return false;
            }

            if (reportFilter === "submitted") {
                return place.audit_status === "SUBMITTED";
            }
            if (reportFilter === "scored") {
                return place.score_totals !== null;
            }
            if (reportFilter === "not_scored") {
                return place.score_totals === null;
            }
            return true;
        });

        return visiblePlaces.sort((leftPlace, rightPlace) => {
            if (sortOption === "name") {
                return leftPlace.place_name.localeCompare(rightPlace.place_name);
            }

            if (sortOption === "score") {
                const scoreDifference =
                    (getCombinedConstructScore(rightPlace.score_totals) ?? -1) -
                    (getCombinedConstructScore(leftPlace.score_totals) ?? -1);
                if (scoreDifference !== 0) {
                    return scoreDifference;
                }
            }

            const recentDifference =
                getPlaceLastActivityTimestamp(rightPlace) -
                getPlaceLastActivityTimestamp(leftPlace);
            if (recentDifference !== 0) {
                return recentDifference;
            }

            return leftPlace.place_name.localeCompare(rightPlace.place_name);
        });
    }, [reportFilter, reportPlaces, searchQuery, sortOption]);
    const tabletRows = useMemo(() => {
        return buildPairGridRows(filteredReportPlaces, (place) => {
            return getProjectPlaceKey(place.project_id, place.place_id);
        });
    }, [filteredReportPlaces]);
    const listItems: ReportsListItem[] = layout.isTablet ? tabletRows : filteredReportPlaces;

    const scrollReportsToOffset = useCallback((offset: number) => {
        listRef.current?.scrollToOffset({ animated: false, offset });
    }, []);

    useScreenshotScrollAutomation({
        contentReady: true,
        rerunKey: listItems.length,
        scrollToOffset: scrollReportsToOffset,
    });

    const previewPlace = useMemo(() => {
        const filteredScoredPlace = filteredReportPlaces.find(
            (place) => place.score_totals !== null,
        );
        if (filteredScoredPlace !== undefined) {
            return filteredScoredPlace;
        }

        if (searchQuery.trim().length > 0 || reportFilter !== "all") {
            return null;
        }

        return topScoringPlace ?? exportablePlaces[0] ?? null;
    }, [exportablePlaces, filteredReportPlaces, reportFilter, searchQuery, topScoringPlace]);

    const buildExportableAudit = useCallback(
        async (place: AuditorPlace, auditorProfile?: ExportAuditorProfile | null) => {
            const exportParams = {
                session,
                place,
                cachedAudit:
                    place.audit_id === null ? undefined : sessionsByAuditId[place.audit_id],
                exportSessionRequiredMessage: t("exportSessionRequired"),
                exportAuditMissingMessage: t("exportAuditMissing"),
                ...(auditorProfile === undefined ? {} : { auditorProfile }),
            };

            return buildExportableAuditForPlace(exportParams);
        },
        [session, sessionsByAuditId, t],
    );

    useEffect(() => {
        let isCancelled = false;

        if (previewPlace === null) {
            setPreviewData(null);
            setIsLoadingPreview(false);
            return () => {
                isCancelled = true;
            };
        }

        setIsLoadingPreview(true);
        buildExportableAudit(previewPlace)
            .then((exportableAudit) => {
                if (isCancelled) {
                    return;
                }
                setPreviewData(buildAuditExportPreview(exportableAudit, instrument));
            })
            .catch(() => {
                if (isCancelled) {
                    return;
                }
                setPreviewData(null);
            })
            .finally(() => {
                if (isCancelled) {
                    return;
                }
                setIsLoadingPreview(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [buildExportableAudit, instrument, previewPlace]);

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
                    : t("exportFailedMessage");
            toast.show(t("exportFailedTitle"), {
                message,
                duration: 5000,
                variant: "error",
            });
        },
        [t, toast],
    );

    const handleBulkExport = useCallback(
        async (format: AuditExportFormat) => {
            const exportKey = `bulk:${format}`;
            setActiveExportKey(exportKey);
            try {
                const auditorProfile = await loadOptionalExportAuditorProfile(session);
                const exportableAudits = await Promise.all(
                    exportablePlaces.map((place) => buildExportableAudit(place, auditorProfile)),
                );
                const fileName = await shareBulkAuditExport(exportableAudits, instrument, format);
                showExportSuccess(fileName);
            } catch (error) {
                showExportError(error);
            } finally {
                setActiveExportKey((currentValue) =>
                    currentValue === exportKey ? null : currentValue,
                );
            }
        },
        [
            buildExportableAudit,
            exportablePlaces,
            instrument,
            session,
            showExportError,
            showExportSuccess,
        ],
    );

    const hasActiveFilters = searchQuery.trim().length > 0 || reportFilter !== "all";
    const keyExtractor = useCallback((item: ReportsListItem) => {
        return isPairGridRow(item) ? item.id : getProjectPlaceKey(item.project_id, item.place_id);
    }, []);
    const renderSeparator = useCallback(() => {
        return <YStack height={layout.isTablet ? 16 : 12} />;
    }, [layout.isTablet]);
    const renderItem = useCallback(
        ({ item }: ListRenderItemInfo<ReportsListItem>) => {
            if (isPairGridRow(item)) {
                const rightPlace = item.right;

                if (rightPlace === null) {
                    return (
                        <XStack gap="$3" items="stretch">
                            <ReportQueueCard
                                place={item.left}
                                maxCombinedConstructScore={maxCombinedConstructScore}
                            />

                            <YStack width="48.5%"></YStack>
                        </XStack>
                    );
                }

                return (
                    <XStack gap="$3" items="stretch">
                        <ReportQueueCard
                            place={item.left}
                            maxCombinedConstructScore={maxCombinedConstructScore}
                        />
                        <ReportQueueCard
                            place={rightPlace}
                            maxCombinedConstructScore={maxCombinedConstructScore}
                        />
                    </XStack>
                );
            }

            return (
                <ReportQueueCard
                    place={item}
                    maxCombinedConstructScore={maxCombinedConstructScore}
                />
            );
        },
        [maxCombinedConstructScore],
    );

    return (
        <FlashList<ReportsListItem>
            ref={listRef}
            data={listItems}
            keyExtractor={keyExtractor}
            contentInsetAdjustmentBehavior="automatic"
            maintainVisibleContentPosition={{ disabled: true }}
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 92,
            })}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
                <YStack gap="$4">
                    <YStack gap="$3">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={
                                layout.isTablet
                                    ? ds.typography.displayLg.fontSize
                                    : ds.typography.displayMd.fontSize
                            }
                            lineHeight={
                                layout.isTablet
                                    ? ds.typography.displayLg.lineHeight
                                    : ds.typography.displayMd.lineHeight
                            }
                            letterSpacing={-0.7}
                        >
                            {t("title")}
                        </Text>
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodyLg.fontSize}
                        >
                            {t("subtitle")}
                        </Paragraph>
                    </YStack>

                    {layout.isTablet ? (
                        <XStack gap="$3">
                            <StatCard
                                label={t("averageConstructScore")}
                                value={
                                    placesWithScores.length > 0
                                        ? formatScoreValue(averageCombinedConstructScore)
                                        : "--"
                                }
                                accentColor={ds.colors.primary}
                                helperText={t("scoredPlacesHelper", {
                                    scored: placesWithScores.length,
                                    total: reportPlaces.length,
                                })}
                                minHeight={layout.summaryCardMinHeight}
                            />
                            <StatCard
                                label={t("averageSociabilityScore")}
                                value={
                                    placesWithScores.length > 0
                                        ? formatScoreValue(averageSociabilityScore)
                                        : "--"
                                }
                                accentColor={ds.colors.success}
                                helperText={t("sociabilityHelper")}
                                minHeight={layout.summaryCardMinHeight}
                            />
                            <StatCard
                                label={t("topScoringPlace")}
                                value={
                                    topScoringPlace === null
                                        ? "Pending"
                                        : formatScoreValue(
                                              getCombinedConstructScore(
                                                  topScoringPlace.score_totals,
                                              ) ?? 0,
                                          )
                                }
                                accentColor={ds.colors.warning}
                                helperText={topScoringPlace?.place_name ?? t("noScoredPlacesYet")}
                                minHeight={layout.summaryCardMinHeight}
                            />
                        </XStack>
                    ) : (
                        <YStack gap="$3">
                            <XStack gap="$3">
                                <StatCard
                                    label={t("averageConstructScore")}
                                    value={
                                        placesWithScores.length > 0
                                            ? formatScoreValue(averageCombinedConstructScore)
                                            : "--"
                                    }
                                    accentColor={ds.colors.primary}
                                    helperText={t("scoredPlacesHelper", {
                                        scored: placesWithScores.length,
                                        total: reportPlaces.length,
                                    })}
                                />
                                <StatCard
                                    label={t("averageSociabilityScore")}
                                    value={
                                        placesWithScores.length > 0
                                            ? formatScoreValue(averageSociabilityScore)
                                            : "--"
                                    }
                                    accentColor={ds.colors.success}
                                    helperText={t("sociabilityHelper")}
                                />
                            </XStack>
                            <StatCard
                                label={t("topScoringPlace")}
                                value={
                                    topScoringPlace === null
                                        ? "Pending"
                                        : formatScoreValue(
                                              getCombinedConstructScore(
                                                  topScoringPlace.score_totals,
                                              ) ?? 0,
                                          )
                                }
                                accentColor={ds.colors.warning}
                                helperText={topScoringPlace?.place_name ?? t("noScoredPlacesYet")}
                            />
                        </YStack>
                    )}

                    <SearchInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={t("searchPlaceholder", { ns: "reports" })}
                    />

                    <YStack gap="$2">
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelSm.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            Filters
                        </Paragraph>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <XStack gap="$2">
                                <FilterChip
                                    label={t("filters.all", { ns: "common" })}
                                    isSelected={reportFilter === "all"}
                                    onPress={() => {
                                        setReportFilter("all");
                                    }}
                                />
                                <FilterChip
                                    label={t("filters.submitted", { ns: "common" })}
                                    isSelected={reportFilter === "submitted"}
                                    onPress={() => {
                                        setReportFilter("submitted");
                                    }}
                                />
                                <FilterChip
                                    label={t("filters.scored", { ns: "common" })}
                                    isSelected={reportFilter === "scored"}
                                    onPress={() => {
                                        setReportFilter("scored");
                                    }}
                                />
                                <FilterChip
                                    label={t("filters.notScored", { ns: "common" })}
                                    isSelected={reportFilter === "not_scored"}
                                    onPress={() => {
                                        setReportFilter("not_scored");
                                    }}
                                />
                            </XStack>
                        </ScrollView>

                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelSm.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            Sort By
                        </Paragraph>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <XStack gap="$2">
                                <FilterChip
                                    label={t("sort.score", { ns: "common" })}
                                    isSelected={sortOption === "score"}
                                    onPress={() => {
                                        setSortOption("score");
                                    }}
                                />
                                <FilterChip
                                    label={t("sort.recent", { ns: "common" })}
                                    isSelected={sortOption === "recent"}
                                    onPress={() => {
                                        setSortOption("recent");
                                    }}
                                />
                                <FilterChip
                                    label={t("sort.name", { ns: "common" })}
                                    isSelected={sortOption === "name"}
                                    onPress={() => {
                                        setSortOption("name");
                                    }}
                                />
                            </XStack>
                        </ScrollView>
                    </YStack>
                </YStack>
            }
            ListHeaderComponentStyle={{ marginBottom: layout.isTablet ? 28 : 24 }}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={
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
                        fontSize={ds.typography.titleLg.fontSize}
                    >
                        {hasActiveFilters ? t("emptyTitle", { ns: "reports" }) : t("title")}
                    </Text>
                    <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                        {hasActiveFilters ? t("emptyMessage", { ns: "reports" }) : t("subtitle")}
                    </Paragraph>
                </YStack>
            }
            ListFooterComponent={
                <YStack gap="$4">
                    <YStack
                        rounded={ds.radii.lg}
                        borderWidth={1}
                        borderColor={ds.colors.warning}
                        bg={ds.colors.warningSoft}
                        p={layout.cardPadding}
                        gap="$3"
                    >
                        <XStack items="center" gap="$2" width="100%">
                            <TriangleAlert size={16} color={ds.colors.warning} />
                            <Text
                                flex={1}
                                color={ds.colors.warning}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.bodySm.fontSize}
                                lineHeight={ds.typography.bodySm.lineHeight}
                                textTransform="uppercase"
                                letterSpacing={0.7}
                                style={{ flexShrink: 1 }}
                            >
                                {t("combinedScoringComingSoon", { ns: "reports" })}
                            </Text>
                        </XStack>
                        <Paragraph
                            color={ds.colors.secondaryForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                            lineHeight={ds.typography.bodySm.lineHeight}
                        >
                            {t("combinedScoringDescription", { ns: "reports" })}
                        </Paragraph>
                    </YStack>

                    <CollapsibleCard
                        title={t("exportPreview", { ns: "reports" })}
                        subtitle={t("exportDescription", { ns: "reports" })}
                        icon={<FileBarChart size={16} color={ds.colors.primary} />}
                    >
                        <YStack
                            rounded={ds.radii.md}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.input}
                            p="$3"
                            gap="$2"
                        >
                            <XStack justify="space-between" items="center" gap="$3">
                                <YStack flex={1}>
                                    <Text
                                        color={ds.colors.foreground}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.bodyMd.fontSize}
                                    >
                                        {t("previewRowsLabel")}
                                    </Text>
                                    <Paragraph
                                        color={ds.colors.mutedForeground}
                                        fontFamily={ds.fonts.bodyMedium}
                                        fontSize={ds.typography.bodyXs.fontSize}
                                    >
                                        {previewData === null
                                            ? t("previewUnavailable")
                                            : t("previewSource", {
                                                  auditCode: previewData.auditCode,
                                              })}
                                    </Paragraph>
                                </YStack>
                                {isLoadingPreview ? (
                                    <ActivityIndicator color={ds.colors.primary} />
                                ) : null}
                            </XStack>

                            {previewData === null ? (
                                <Paragraph
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.bodySm.fontSize}
                                >
                                    {t("previewUnavailable")}
                                </Paragraph>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <YStack style={{ minWidth: 980 }}>
                                        <XStack
                                            bg={ds.colors.surfaceMuted}
                                            borderWidth={1}
                                            borderColor={ds.colors.border}
                                        >
                                            {previewData.headers.map((header, index) => (
                                                <YStack
                                                    key={`${header}-${index.toString()}`}
                                                    width={150}
                                                    px="$2"
                                                    py="$2"
                                                    borderRightWidth={
                                                        index === previewData.headers.length - 1
                                                            ? 0
                                                            : 1
                                                    }
                                                    borderColor={ds.colors.border}
                                                >
                                                    <Text
                                                        color={ds.colors.foreground}
                                                        fontFamily={ds.fonts.bodyBold}
                                                        fontSize={ds.typography.labelXs.fontSize}
                                                    >
                                                        {header}
                                                    </Text>
                                                </YStack>
                                            ))}
                                        </XStack>
                                        {previewData.rows.map((row, rowIndex) => (
                                            <XStack
                                                key={`preview-row-${rowIndex.toString()}`}
                                                borderWidth={1}
                                                borderTopWidth={0}
                                                borderColor={ds.colors.border}
                                                bg={
                                                    rowIndex % 2 === 0
                                                        ? ds.colors.surface
                                                        : ds.colors.input
                                                }
                                            >
                                                {row.map((value, valueIndex) => (
                                                    <YStack
                                                        key={`${rowIndex.toString()}-${valueIndex.toString()}`}
                                                        width={150}
                                                        px="$2"
                                                        py="$2"
                                                        borderRightWidth={
                                                            valueIndex === row.length - 1 ? 0 : 1
                                                        }
                                                        borderColor={ds.colors.border}
                                                    >
                                                        <Text
                                                            color={ds.colors.mutedForeground}
                                                            fontFamily={ds.fonts.bodyMedium}
                                                            fontSize={ds.typography.bodyXs.fontSize}
                                                        >
                                                            {value}
                                                        </Text>
                                                    </YStack>
                                                ))}
                                            </XStack>
                                        ))}
                                    </YStack>
                                </ScrollView>
                            )}
                        </YStack>
                    </CollapsibleCard>

                    <YStack
                        rounded={ds.radii.lg}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.surface}
                        p={layout.cardPadding}
                        gap="$4"
                        style={{ boxShadow: ds.shadows.card }}
                    >
                        <Text
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            {t("bulkExportTitle", { ns: "reports" })}
                        </Text>
                        <XStack gap="$2">
                            <ActionButton
                                variant="default"
                                label={t("exportCsv", { ns: "reports" })}
                                onPress={() => {
                                    handleBulkExport("csv").catch(() => undefined);
                                }}
                                disabled={exportablePlaces.length === 0 || activeExportKey !== null}
                                isLoading={activeExportKey === "bulk:csv"}
                            />
                            <ActionButton
                                label={t("exportPdf", { ns: "reports" })}
                                variant="primary"
                                onPress={() => {
                                    handleBulkExport("pdf").catch(() => undefined);
                                }}
                                disabled={exportablePlaces.length === 0 || activeExportKey !== null}
                                isLoading={activeExportKey === "bulk:pdf"}
                            />
                            <ActionButton
                                label={t("exportExcel", { ns: "reports" })}
                                onPress={() => {
                                    handleBulkExport("xlsx").catch(() => undefined);
                                }}
                                disabled={exportablePlaces.length === 0 || activeExportKey !== null}
                                isLoading={activeExportKey === "bulk:xlsx"}
                            />
                        </XStack>
                    </YStack>
                </YStack>
            }
            ListFooterComponentStyle={{ marginTop: layout.isTablet ? 28 : 24 }}
            renderItem={renderItem}
        />
    );
}

interface ReportQueueCardProps {
    readonly place: AuditorPlace;
    readonly maxCombinedConstructScore: number;
}

function ReportQueueCard({ place, maxCombinedConstructScore }: Readonly<ReportQueueCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t, i18n } = useTranslation(["reports", "common"]);
    const scoreSummaryLabels = useMemo<ScoreSummaryLabels>(() => {
        return {
            playValueShort: t("playValueShort"),
            usabilityShort: t("usabilityShort"),
            sociabilityShort: t("sociabilityShort"),
            quantityShort: t("quantityShort"),
            diversityShort: t("diversityShort"),
            challengeShort: t("challengeShort"),
        };
    }, [t]);
    const status = derivePlaceStatus(place.audit_status);
    const statusTone = getPlaceStatusTone(status, ds.colors);
    const locality = deriveLocality(place, t("place.assignedPlace", { ns: "common" }));
    const hasScore = place.score_totals !== null;
    const combinedConstructScore = getCombinedConstructScore(place.score_totals);
    const barWidth =
        hasScore && combinedConstructScore !== null && maxCombinedConstructScore > 0
            ? `${Math.max((combinedConstructScore / maxCombinedConstructScore) * 100, 6)}%`
            : "0%";
    const updatedLabel = formatRelativeTimeLabel(
        place.started_at,
        place.submitted_at,
        i18n.language,
        t,
    );

    return (
        <Pressable
            accessibilityRole="button"
            onPress={() => {
                if (place.audit_id !== null) {
                    router.push(`/report/${place.audit_id}`);
                }
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1, flex: 1 })}
        >
            <YStack
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.surface}
                p={layout.cardPadding}
                gap="$3.5"
                justify="space-between"
                style={{
                    minHeight: layout.isTablet ? layout.queueCardMinHeight : undefined,
                    boxShadow: ds.shadows.card,
                }}
            >
                <YStack gap="$3">
                    <XStack justify="space-between" items="flex-start" gap="$3">
                        <YStack flex={1} gap="$1.5" style={{ minWidth: 0 }}>
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.headingBold}
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
                                numberOfLines={getCardTextLineLimit("title")}
                            >
                                {place.place_name}
                            </Text>
                            <Paragraph
                                color={ds.colors.secondaryForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                numberOfLines={getCardTextLineLimit("supporting")}
                            >
                                {place.project_name}
                            </Paragraph>
                        </YStack>
                        <YStack items="flex-end" gap="$2">
                            <YStack
                                rounded={ds.radii.full}
                                px="$3"
                                py="$1"
                                style={{ backgroundColor: statusTone.surface }}
                            >
                                <Text
                                    style={{ color: statusTone.text }}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelMd.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1}
                                >
                                    {getPlaceStatusLabel(status, t)}
                                </Text>
                            </YStack>
                            <Paragraph
                                color={hasScore ? ds.colors.primary : ds.colors.mutedForeground}
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
                                numberOfLines={getCardTextLineLimit("meta")}
                            >
                                {hasScore && formatScoreValue(combinedConstructScore ?? 0)}
                            </Paragraph>
                        </YStack>
                    </XStack>

                    <XStack items="center" gap="$2" bg="$background" p="$2" rounded={ds.radii.sm}>
                        <MapPin size={14} color={ds.colors.mutedForeground} />
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                            lineHeight={ds.typography.bodySm.lineHeight}
                            numberOfLines={getCardTextLineLimit("supporting")}
                        >
                            {locality}
                        </Paragraph>
                    </XStack>

                    <XStack items="center" gap="$2" px="$2">
                        <Clock3 size={14} color={ds.colors.mutedForeground} />
                        <Paragraph
                            color={ds.colors.mutedForeground}
                            fontFamily={ds.fonts.bodyMedium}
                            fontSize={ds.typography.bodySm.fontSize}
                            numberOfLines={getCardTextLineLimit("meta")}
                        >
                            {updatedLabel}
                        </Paragraph>
                    </XStack>

                    {hasScore ? (
                        <YStack gap="$1.5" height={52}>
                            <XStack items="center" gap="$2" justify="flex-start">
                                <Paragraph
                                    color={ds.colors.primary}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.bodyXs.fontSize}
                                    numberOfLines={getCardTextLineLimit("meta")}
                                >
                                    {formatConstructSummary(place.score_totals, scoreSummaryLabels)}
                                </Paragraph>
                                <Dot size={14} color={ds.colors.primary} />
                                <Paragraph
                                    color={ds.colors.primary}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.bodyXs.fontSize}
                                    numberOfLines={getCardTextLineLimit("meta")}
                                >
                                    {formatColumnSummary(place.score_totals, scoreSummaryLabels)}
                                </Paragraph>
                            </XStack>
                            <YStack
                                height={6}
                                mt="$3"
                                rounded={ds.radii.full}
                                bg={ds.colors.mutedSurface}
                                overflow="hidden"
                            >
                                <YStack
                                    height={6}
                                    rounded={ds.radii.full}
                                    bg={ds.colors.primary}
                                    style={{ width: barWidth }}
                                />
                            </YStack>
                        </YStack>
                    ) : (
                        <YStack height={52}>
                            <Paragraph
                                mt="$3"
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                numberOfLines={getCardTextLineLimit("meta")}
                            >
                                {t("detail.scorePending", { ns: "reports" })}
                            </Paragraph>
                        </YStack>
                    )}
                </YStack>

                <XStack justify="flex-end" items="center" gap="$1.5">
                    <Text
                        color={ds.colors.primary}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.labelMd.fontSize}
                        textTransform="uppercase"
                        letterSpacing={1.1}
                    >
                        {t("actions.viewDetails", { ns: "common" })}
                    </Text>
                    <ArrowRight size={14} color={ds.colors.primary} />
                </XStack>
            </YStack>
        </Pressable>
    );
}

function isPairGridRow(item: ReportsListItem): item is PairGridRow<AuditorPlace> {
    return "left" in item;
}
