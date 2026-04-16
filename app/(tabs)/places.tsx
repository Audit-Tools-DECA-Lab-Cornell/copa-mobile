import { FlashList, FlashListRef, type ListRenderItemInfo } from "@shopify/flash-list";
import { ArrowRight, Clock3 } from "@tamagui/lucide-icons-2";
import { FilterChip } from "components/ui/filter-chip";
import { SearchInput } from "components/ui/search-input";
import { useRouter } from "expo-router";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import {
    deriveLocality,
    derivePlaceStatus,
    getPlaceLastActivityTimestamp,
    matchesPlaceSearch,
} from "lib/audit/place-helpers";
import type { AuditorPlace } from "lib/audit/places-api";
import { formatConstructSummary, formatScoreValue, type ScoreSummaryLabels } from "lib/audit/score-helpers";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { getPlaceStatusTone, isGlassUiEnabled, useDesignSystem, type DesignTone } from "lib/design-system";
import { formatRelativeTimeLabel, getPlaceStatusLabel, type LocalizedPlaceStatus } from "lib/i18n/format";
import { getCardTextLineLimit } from "lib/responsive";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { buildPairGridRows, type PairGridRow } from "lib/ui/pair-grid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, ScrollView } from "react-native";
import { useAuthStore } from "stores/auth-store";
import { usePlacesStore } from "stores/places-store";
import { Paragraph, Text, XStack, YStack } from "tamagui";

type PlaceStatusFilter = "all" | LocalizedPlaceStatus;
type PlaceSortOption = "recent" | "progress" | "name";

/**
 * Assigned places tab for auditor field execution.
 * Displays the full list of places from the auditor's assignment API,
 * now with search, status filters, and sortable place cards.
 */
export default function PlacesScreen() {
    const ds = useDesignSystem();
    const isGlassEnabled = isGlassUiEnabled();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation(["places", "common"]);
    const session = useAuthStore((state) => state.session);
    const places = useLocalFirstPlaces();
    const isLoading = usePlacesStore((state) => state.isLoading);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<PlaceStatusFilter>("all");
    const [sortOption, setSortOption] = useState<PlaceSortOption>("recent");
    const phoneListRef = useRef<FlashListRef<AuditorPlace> | null>(null);
    const tabletListRef = useRef<FlashListRef<PairGridRow<AuditorPlace>> | null>(null);

    useEffect(() => {
        if (session !== null) {
            loadPlaces(session).catch(() => undefined);
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
            } satisfies Record<LocalizedPlaceStatus, number>,
        );
    }, [places]);

    const scoreSummaryLabels = useMemo<ScoreSummaryLabels>(() => {
        return {
            playValueShort: t("playValueShort"),
            usabilityShort: t("usabilityShort"),
            sociabilityShort: t("sociabilityShort"),
            provisionShort: t("provisionShort"),
            diversityShort: t("diversityShort"),
            challengeShort: t("challengeShort"),
        };
    }, [t]);

    const filteredPlaces = useMemo(() => {
        const visiblePlaces = places.filter((place) => {
            if (!matchesPlaceSearch(place, searchQuery)) {
                return false;
            }

            if (statusFilter === "all") {
                return true;
            }

            return derivePlaceStatus(place.audit_status) === statusFilter;
        });

        return visiblePlaces.sort((leftPlace, rightPlace) => {
            if (sortOption === "name") {
                return leftPlace.place_name.localeCompare(rightPlace.place_name);
            }

            if (sortOption === "progress") {
                const progressDifference = (rightPlace.progress_percent ?? 0) - (leftPlace.progress_percent ?? 0);
                if (progressDifference !== 0) {
                    return progressDifference;
                }
            }

            const recentDifference =
                getPlaceLastActivityTimestamp(rightPlace) - getPlaceLastActivityTimestamp(leftPlace);
            if (recentDifference !== 0) {
                return recentDifference;
            }

            return leftPlace.place_name.localeCompare(rightPlace.place_name);
        });
    }, [places, searchQuery, sortOption, statusFilter]);
    const tabletRows = useMemo(() => {
        return buildPairGridRows(filteredPlaces, (place) => {
            return getProjectPlaceKey(place.project_id, place.place_id);
        });
    }, [filteredPlaces]);

    const scrollPlacesToOffset = useCallback(
        (offset: number) => {
            if (layout.isTablet) {
                tabletListRef.current?.scrollToOffset({ animated: false, offset });
                return;
            }

            phoneListRef.current?.scrollToOffset({ animated: false, offset });
        },
        [layout.isTablet],
    );

    useScreenshotScrollAutomation({
        contentReady: !isLoading || places.length > 0,
        rerunKey: layout.isTablet ? tabletRows.length : filteredPlaces.length,
        scrollToOffset: scrollPlacesToOffset,
    });

    const hasActiveFilters = searchQuery.trim().length > 0 || statusFilter !== "all";
    const keyExtractor = useCallback((item: AuditorPlace) => {
        return getProjectPlaceKey(item.project_id, item.place_id);
    }, []);
    const tabletRowKeyExtractor = useCallback((item: PairGridRow<AuditorPlace>) => {
        return item.id;
    }, []);
    const renderSeparator = useCallback(() => {
        return <YStack height={layout.isTablet ? 16 : 12} />;
    }, [layout.isTablet]);
    const renderItem = useCallback(
        ({ item: place }: ListRenderItemInfo<AuditorPlace>) => {
            return (
                <PlaceQueueCard
                    place={place}
                    scoreSummaryLabels={scoreSummaryLabels}
                    onPress={() => {
                        router.push(`/place/${place.place_id}?projectId=${encodeURIComponent(place.project_id)}`);
                    }}
                />
            );
        },
        [router, scoreSummaryLabels],
    );
    const renderTabletRow = useCallback(
        ({ item }: ListRenderItemInfo<PairGridRow<AuditorPlace>>) => {
            const rightPlace = item.right;

            if (rightPlace === null) {
                return (
                    <PlaceQueueCard
                        place={item.left}
                        scoreSummaryLabels={scoreSummaryLabels}
                        onPress={() => {
                            router.push(
                                `/place/${item.left.place_id}?projectId=${encodeURIComponent(item.left.project_id)}`,
                            );
                        }}
                    />
                );
            }

            return (
                <XStack gap="$3" items="stretch">
                    <PlaceQueueCard
                        place={item.left}
                        scoreSummaryLabels={scoreSummaryLabels}
                        onPress={() => {
                            router.push(
                                `/place/${item.left.place_id}?projectId=${encodeURIComponent(item.left.project_id)}`,
                            );
                        }}
                    />
                    <PlaceQueueCard
                        place={rightPlace}
                        scoreSummaryLabels={scoreSummaryLabels}
                        onPress={() => {
                            router.push(
                                `/place/${rightPlace.place_id}?projectId=${encodeURIComponent(rightPlace.project_id)}`,
                            );
                        }}
                    />
                </XStack>
            );
        },
        [router, scoreSummaryLabels],
    );

    if (isLoading && places.length === 0) {
        return (
            <YStack flex={1} items="center" justify="center" bg={ds.colors.background}>
                <ActivityIndicator size="large" color={ds.colors.primary} />
                <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium} mt="$4">
                    {t("loadingPlaces", { ns: "places" })}
                </Paragraph>
            </YStack>
        );
    }

    const headerComponent = (
        <YStack gap="$4">
            <YStack gap="$3">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={layout.isTablet ? ds.typography.displayLg.fontSize : ds.typography.displayMd.fontSize}
                    lineHeight={
                        layout.isTablet ? ds.typography.displayLg.lineHeight : ds.typography.displayMd.lineHeight
                    }
                >
                    {t("title", { ns: "places" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyLg.fontSize}
                >
                    {t("subtitle", { ns: "places" })}
                </Paragraph>
            </YStack>

            <XStack gap="$3">
                <SummaryTile label={t("status.inProgress", { ns: "common" })} value={placeStatusCounts.in_progress} />
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

            <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("searchPlaceholder", { ns: "places" })}
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
                            isSelected={statusFilter === "all"}
                            onPress={() => {
                                setStatusFilter("all");
                            }}
                        />
                        <FilterChip
                            label={t("status.inProgress", { ns: "common" })}
                            isSelected={statusFilter === "in_progress"}
                            onPress={() => {
                                setStatusFilter("in_progress");
                            }}
                        />
                        <FilterChip
                            label={t("status.notStarted", { ns: "common" })}
                            isSelected={statusFilter === "not_started"}
                            onPress={() => {
                                setStatusFilter("not_started");
                            }}
                        />
                        <FilterChip
                            label={t("status.submitted", { ns: "common" })}
                            isSelected={statusFilter === "submitted"}
                            onPress={() => {
                                setStatusFilter("submitted");
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
                            label={t("sort.recent", { ns: "common" })}
                            isSelected={sortOption === "recent"}
                            onPress={() => {
                                setSortOption("recent");
                            }}
                        />
                        <FilterChip
                            label={t("sort.progress", { ns: "common" })}
                            isSelected={sortOption === "progress"}
                            onPress={() => {
                                setSortOption("progress");
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
    );

    const emptyComponent = (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
            bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
            p="$4"
            gap="$2"
            style={{ boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card }}
        >
            <Text color={ds.colors.foreground} fontFamily={ds.fonts.bodyBold} fontSize={ds.typography.titleLg.fontSize}>
                {hasActiveFilters ? t("emptyTitle", { ns: "places" }) : t("title", { ns: "places" })}
            </Text>
            <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                {hasActiveFilters ? t("emptyMessage", { ns: "places" }) : t("subtitle", { ns: "places" })}
            </Paragraph>
        </YStack>
    );

    if (layout.isTablet) {
        return (
            <FlashList<PairGridRow<AuditorPlace>>
                ref={tabletListRef}
                data={tabletRows}
                keyExtractor={tabletRowKeyExtractor}
                contentInsetAdjustmentBehavior="automatic"
                maintainVisibleContentPosition={{ disabled: true }}
                style={{ backgroundColor: ds.colors.background }}
                contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                    bottomPadding: 92,
                })}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={headerComponent}
                ListHeaderComponentStyle={{ marginBottom: 28 }}
                ItemSeparatorComponent={renderSeparator}
                ListEmptyComponent={emptyComponent}
                renderItem={renderTabletRow}
            />
        );
    }

    return (
        <FlashList<AuditorPlace>
            ref={phoneListRef}
            data={filteredPlaces}
            keyExtractor={keyExtractor}
            contentInsetAdjustmentBehavior="automatic"
            maintainVisibleContentPosition={{ disabled: true }}
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 92,
            })}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={headerComponent}
            ListHeaderComponentStyle={{ marginBottom: 24 }}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={emptyComponent}
            renderItem={renderItem}
        />
    );
}

interface PlaceQueueCardProps {
    readonly place: AuditorPlace;
    readonly scoreSummaryLabels: ScoreSummaryLabels;
    readonly onPress: () => void;
}

function PlaceQueueCard({ place, scoreSummaryLabels, onPress }: Readonly<PlaceQueueCardProps>) {
    const ds = useDesignSystem();
    const isGlassEnabled = isGlassUiEnabled();
    const layout = useResponsiveLayout();
    const { t, i18n } = useTranslation(["places", "common"]);
    const status = derivePlaceStatus(place.audit_status);
    const placeTone = getPlaceStatusTone(status, ds.colors);
    const locality = deriveLocality(place, t("place.assignedPlace", { ns: "common" }));
    const auditScoreLabel =
        place.score_totals === null
            ? place.summary_score === null
                ? "Pending score"
                : formatScoreValue(place.summary_score)
            : formatConstructSummary(place.score_totals, scoreSummaryLabels);
    const progressPercent = place.progress_percent ?? 0;
    const updatedLabel = formatRelativeTimeLabel(place.started_at, place.submitted_at, i18n.language, t);

    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1, flex: 1 })}
        >
            <YStack
                rounded={ds.radii.lg}
                borderWidth={1}
                borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
                bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
                overflow="hidden"
                style={{
                    minHeight: layout.isTablet ? layout.queueCardMinHeight : undefined,
                    boxShadow: isGlassEnabled ? ds.glass.elevatedShadow : ds.shadows.card,
                }}
            >
                <XStack flex={1}>
                    <YStack width={4} style={{ backgroundColor: placeTone.accent }} />
                    <YStack flex={1} justify="space-between" p={layout.cardPadding} gap="$3.5">
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

                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                numberOfLines={getCardTextLineLimit("supporting")}
                            >
                                {locality}
                            </Paragraph>

                            <ScoreTile
                                label={t("scoreSummary", { ns: "places" })}
                                value={auditScoreLabel}
                                valueColor={ds.colors.primary}
                            />
                        </YStack>

                        <YStack gap="$3">
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

                            <XStack justify="space-between" items="center" gap="$3">
                                <XStack items="center" gap="$1.5" flex={1} style={{ minWidth: 0 }}>
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
                                <XStack items="center" gap="$1.5">
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
                            </XStack>
                        </YStack>
                    </YStack>
                </XStack>
            </YStack>
        </Pressable>
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
function SummaryTile({ label, value, tone }: Readonly<SummaryTileProps>) {
    const ds = useDesignSystem();
    const isGlassEnabled = isGlassUiEnabled();
    const layout = useResponsiveLayout();
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
            borderColor={isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border}
            bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
            justify="space-between"
            p={layout.isTablet ? 16 : 12}
            style={{ minHeight: layout.isTablet ? 116 : undefined }}
        >
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={layout.isTablet ? ds.typography.labelSm.fontSize : ds.typography.labelXs.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={ds.fonts.headingBold}
                fontSize={layout.isTablet ? ds.typography.metricMd.fontSize : ds.typography.metricSm.fontSize}
                lineHeight={layout.isTablet ? ds.typography.metricMd.lineHeight : ds.typography.metricSm.lineHeight}
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
function ScoreTile({ label, value, valueColor }: Readonly<ScoreTileProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    return (
        <YStack
            flex={1}
            rounded={ds.radii.md}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.input}
            p={layout.isTablet ? 16 : 12}
        >
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={layout.isTablet ? ds.typography.labelMd.fontSize : ds.typography.labelSm.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={ds.fonts.headingBold}
                fontSize={layout.isTablet ? ds.typography.metricSm.fontSize : ds.typography.metricXs.fontSize}
                lineHeight={layout.isTablet ? ds.typography.metricSm.lineHeight : ds.typography.metricXs.lineHeight}
                mt="$2"
                style={{ color: valueColor }}
                numberOfLines={getCardTextLineLimit("meta")}
            >
                {value}
            </Text>
        </YStack>
    );
}
