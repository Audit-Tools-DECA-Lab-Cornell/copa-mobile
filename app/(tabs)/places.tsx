import { FlashList, FlashListRef, type ListRenderItemInfo } from "@shopify/flash-list";
import { ArrowRight, Clock3 } from "@tamagui/lucide-icons-2";
import { ProjectFilterSelect } from "components/ui/project-filter-select";
import { TypeFilterSelect } from "components/ui/type-filter-select";
import { SearchInput } from "components/ui/search-input";
import { useRouter } from "expo-router";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import {
    deriveLocality,
    derivePlaceRequirementStatus,
    getPlaceLastActivityTimestamp,
    matchesPlaceSearch,
} from "lib/audit/place-helpers";
import type { AuditorPlace } from "lib/audit/places-api";
import { formatScorePair, getEffectivePlaceScores } from "lib/audit/score-helpers";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { getPlaceStatusTone, isGlassUiEnabled, useDesignSystem, type DesignTone } from "lib/design-system";
import { formatRelativeTimeLabel, getPlaceStatusLabel, type LocalizedPlaceStatus } from "lib/i18n/format";
import { getCardTextLineLimit } from "lib/responsive";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { buildPairGridRows, type PairGridRow } from "lib/ui/pair-grid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable } from "react-native";
import { useAuthStore } from "stores/auth-store";
import { usePlacesStore } from "stores/places-store";
import { Paragraph, Text, XStack, YStack, type ColorTokens } from "tamagui";

type PlaceProjectFilter = "all" | string;
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
    const [projectFilter, setProjectFilter] = useState<PlaceProjectFilter>("all");
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
                const status = derivePlaceRequirementStatus(place);
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

    /** Unique projects derived from the loaded places for the project filter. */
    const uniqueProjects = useMemo(() => {
        const projectMap = new Map<string, string>();
        for (const place of places) {
            if (!projectMap.has(place.project_id)) {
                projectMap.set(place.project_id, place.project_name);
            }
        }
        return Array.from(projectMap.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [places]);

    useEffect(() => {
        if (projectFilter !== "all" && !uniqueProjects.some((project) => project.id === projectFilter)) {
            setProjectFilter("all");
        }
    }, [projectFilter, uniqueProjects]);

    const filteredPlaces = useMemo(() => {
        const visiblePlaces = places.filter((place) => {
            if (!matchesPlaceSearch(place, searchQuery)) {
                return false;
            }

            if (projectFilter !== "all" && place.project_id !== projectFilter) {
                return false;
            }

            if (statusFilter === "all") {
                return true;
            }

            return derivePlaceRequirementStatus(place) === statusFilter;
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
    }, [places, projectFilter, searchQuery, sortOption, statusFilter]);
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

    const hasActiveFilters = searchQuery.trim().length > 0 || projectFilter !== "all" || statusFilter !== "all";
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
                    onPress={() => {
                        router.push(`/place/${place.place_id}?projectId=${encodeURIComponent(place.project_id)}`);
                    }}
                />
            );
        },
        [router],
    );
    const renderTabletRow = useCallback(
        ({ item }: ListRenderItemInfo<PairGridRow<AuditorPlace>>) => {
            const rightPlace = item.right;

            if (rightPlace === null) {
                return (
                    <XStack gap="$3" items="stretch">
                        <PlaceQueueCard
                            place={item.left}
                            onPress={() => {
                                router.push(
                                    `/place/${item.left.place_id}?projectId=${encodeURIComponent(item.left.project_id)}`,
                                );
                            }}
                        />
                        <YStack width="48.5%" style={{ minHeight: layout.queueCardMinHeight }}></YStack>
                    </XStack>
                );
            }

            return (
                <XStack gap="$3" items="stretch">
                    <PlaceQueueCard
                        place={item.left}
                        onPress={() => {
                            router.push(
                                `/place/${item.left.place_id}?projectId=${encodeURIComponent(item.left.project_id)}`,
                            );
                        }}
                    />
                    <PlaceQueueCard
                        place={rightPlace}
                        onPress={() => {
                            router.push(
                                `/place/${rightPlace.place_id}?projectId=${encodeURIComponent(rightPlace.project_id)}`,
                            );
                        }}
                    />
                </XStack>
            );
        },
        [layout.queueCardMinHeight, router],
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
            {layout.isTablet ? (
                <XStack justify="space-between" items="flex-end" gap="$4">
                    <YStack gap="$3" flex={1}>
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={ds.typography.displayLg.fontSize}
                            lineHeight={ds.typography.displayLg.lineHeight}
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
                </XStack>
            ) : (
                <YStack gap="$3">
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={ds.typography.displayMd.fontSize}
                        lineHeight={ds.typography.displayMd.lineHeight}
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
            )}

            <XStack gap="$3">
                <Pressable
                    onPress={() => setStatusFilter(statusFilter === "in_progress" ? "all" : "in_progress")}
                    style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, flex: 1 })}
                    accessibilityRole="button"
                >
                    <SummaryTile
                        label={t("status.inProgress", { ns: "common" })}
                        value={placeStatusCounts.in_progress}
                        isActive={statusFilter === "in_progress"}
                    />
                </Pressable>
                <Pressable
                    onPress={() => setStatusFilter(statusFilter === "not_started" ? "all" : "not_started")}
                    style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, flex: 1 })}
                    accessibilityRole="button"
                >
                    <SummaryTile
                        label={t("status.notStarted", { ns: "common" })}
                        value={placeStatusCounts.not_started}
                        isActive={statusFilter === "not_started"}
                        tone={{
                            accent: ds.colors.warning,
                            surface: ds.colors.warningSoft,
                            text: ds.colors.warning,
                        }}
                    />
                </Pressable>
                <Pressable
                    onPress={() => setStatusFilter(statusFilter === "submitted" ? "all" : "submitted")}
                    style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, flex: 1 })}
                    accessibilityRole="button"
                >
                    <SummaryTile
                        label={t("status.submitted", { ns: "common" })}
                        value={placeStatusCounts.submitted}
                        isActive={statusFilter === "submitted"}
                        tone={{
                            accent: ds.colors.success,
                            surface: ds.colors.successSoft,
                            text: ds.colors.success,
                        }}
                    />
                </Pressable>
            </XStack>

            <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("searchPlaceholder", { ns: "places" })}
            />

            {uniqueProjects.length > 1 ? (
                <ProjectFilterSelect
                    uniqueProjects={uniqueProjects}
                    value={projectFilter}
                    onChange={setProjectFilter}
                    sectionLabel={t("projectFilter", { ns: "places", defaultValue: "Project" })}
                    allProjectsLabel={t("filters.all", { ns: "common" })}
                />
            ) : null}

            <XStack gap="$2">
                <TypeFilterSelect
                    label={t("filterStatus", { ns: "places" })}
                    options={[
                        { id: "all", label: t("filters.all", { ns: "common" }) },
                        { id: "in_progress", label: t("status.inProgress", { ns: "common" }) },
                        { id: "not_started", label: t("status.notStarted", { ns: "common" }) },
                        { id: "submitted", label: t("status.submitted", { ns: "common" }) },
                    ]}
                    value={statusFilter}
                    onChange={(next) => {
                        setStatusFilter(next as PlaceStatusFilter);
                    }}
                />
                <TypeFilterSelect
                    label={t("filterSort", { ns: "places" })}
                    options={[
                        { id: "recent", label: t("sort.recent", { ns: "common" }) },
                        { id: "progress", label: t("sort.progress", { ns: "common" }) },
                        { id: "name", label: t("sort.name", { ns: "common" }) },
                    ]}
                    value={sortOption}
                    onChange={(next) => {
                        setSortOption(next as PlaceSortOption);
                    }}
                />
            </XStack>
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
    readonly onPress: () => void;
}

function PlaceQueueCard({ place, onPress }: Readonly<PlaceQueueCardProps>) {
    const ds = useDesignSystem();
    const isGlassEnabled = isGlassUiEnabled();
    const layout = useResponsiveLayout();
    const { t, i18n } = useTranslation(["places", "common"]);

    const status = derivePlaceRequirementStatus(place);
    const placeTone = getPlaceStatusTone(status, ds.colors);
    const locality = deriveLocality(place, t("place.assignedPlace", { ns: "common" }));
    const auditScoreLabel = formatScorePair(getEffectivePlaceScores(place)) ?? "Pending score";
    const progressPercent = place.progress_percent ?? 0;
    const updatedLabel = formatRelativeTimeLabel(place.started_at, place.submitted_at, i18n.language, t);

    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => ({
                opacity: pressed ? 0.96 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }], // Fancy press scale effect
                flex: 1,
                height: "100%", // Enforces stretching to match row height
            })}
        >
            <YStack
                flex={1} // Ensures internal wrapper fills the Pressable
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
                    {/* Left Status Accent Bar */}
                    <YStack width={4} style={{ backgroundColor: placeTone.accent }} />

                    <YStack flex={1} p={layout.cardPadding} gap="$4">
                        {/* --- TOP SECTION: Header & Primary Status --- */}
                        <XStack justify="space-between" items="flex-start" gap="$3">
                            <YStack flex={1} gap="$1" style={{ minWidth: 0 }}>
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
                                accessible={true}
                                accessibilityLabel={getPlaceStatusLabel(status, t)}
                                rounded={ds.radii.full}
                                px="$2.5"
                                py="$1"
                                style={{ backgroundColor: placeTone.surface }}
                            >
                                <Text
                                    accessibilityElementsHidden={true}
                                    importantForAccessibility="no"
                                    style={{ color: placeTone.text }}
                                    fontFamily={ds.fonts.bodyBold}
                                    fontSize={ds.typography.labelSm.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={0.5}
                                >
                                    {getPlaceStatusLabel(status, t)}
                                </Text>
                            </YStack>
                        </XStack>

                        {/* --- MIDDLE SECTION: Meta details --- */}
                        <YStack gap="$2" mt="$-2">
                            {place.address !== null && place.address !== undefined && (
                                <Paragraph
                                    color={ds.colors.mutedForeground}
                                    fontFamily={ds.fonts.bodyMedium}
                                    fontSize={ds.typography.bodySm.fontSize}
                                    numberOfLines={getCardTextLineLimit("supporting")}
                                >
                                    {place.address}
                                </Paragraph>
                            )}
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                                fontSize={ds.typography.bodySm.fontSize}
                                numberOfLines={getCardTextLineLimit("supporting")}
                            >
                                {locality}
                            </Paragraph>
                        </YStack>

                        {/* --- BOTTOM SECTION: Progress & Call to Action --- */}
                        <YStack flex={1} justify="flex-end" gap="$3" pt="$3">
                            <YStack gap="$2">
                                <ScoreTile
                                    label={t("scoreSummary", { ns: "places" })}
                                    value={auditScoreLabel}
                                    valueColor={ds.colors.primary}
                                />
                                <XStack justify="space-between" items="center">
                                    <Paragraph
                                        color={ds.colors.primary}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.bodyXs.fontSize}
                                    >
                                        {t("mandatoryCompletion", { ns: "places" })}
                                    </Paragraph>
                                    <Text
                                        color={ds.colors.mutedForeground}
                                        fontFamily={ds.fonts.monoBold}
                                        fontSize={ds.typography.labelXs.fontSize}
                                    >
                                        {progressPercent}%
                                    </Text>
                                </XStack>
                                <YStack
                                    height={layout.isTablet ? 6 : 4} // Slimmer progress bar for elegance
                                    rounded={ds.radii.full}
                                    bg={ds.colors.mutedSurface}
                                    overflow="hidden"
                                >
                                    <YStack
                                        height="100%"
                                        rounded={ds.radii.full}
                                        bg={ds.colors.primary}
                                        width={`${progressPercent}%`}
                                    />
                                </YStack>
                            </YStack>

                            <XStack justify="space-between" items="center" gap="$3">
                                <XStack items="center" gap="$2" flex={1} style={{ minWidth: 0 }}>
                                    <Clock3 size={14} color={ds.colors.mutedForeground} opacity={0.8} />
                                    <Paragraph
                                        color={ds.colors.mutedForeground}
                                        fontFamily={ds.fonts.bodyMedium}
                                        fontSize={ds.typography.bodySm.fontSize}
                                        numberOfLines={1}
                                    >
                                        {updatedLabel}
                                    </Paragraph>
                                </XStack>

                                {/* Decluttered View Details */}
                                <XStack justify="flex-end" items="center" gap="$1.5">
                                    <Text
                                        color={ds.colors.primary}
                                        fontFamily={ds.fonts.bodyBold}
                                        fontSize={ds.typography.labelSm.fontSize}
                                        textTransform="uppercase"
                                        letterSpacing={0.5}
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
    readonly isActive?: boolean;
}

/**
 * Compact summary tile used above the places queue.
 *
 * @param props Summary tile props.
 * @returns Small metric card.
 */
function SummaryTile({ label, value, tone, isActive = false }: Readonly<SummaryTileProps>) {
    const ds = useDesignSystem();
    const isGlassEnabled = isGlassUiEnabled();
    const layout = useResponsiveLayout();
    const tileTone = tone ?? {
        accent: ds.colors.primary as ColorTokens,
        surface: ds.colors.primarySoft as ColorTokens,
        text: ds.colors.primary as ColorTokens,
    };

    return (
        <YStack
            flex={1}
            rounded={ds.radii.lg}
            borderWidth={isActive ? 2 : 1}
            borderColor={
                isActive
                    ? tileTone.accent
                    : ((isGlassEnabled ? ds.glass.elevatedBorder : ds.colors.border) as ColorTokens)
            }
            bg={isGlassEnabled ? ds.glass.elevatedSurface : ds.colors.surface}
            justify="space-between"
            p={layout.isTablet ? 16 : 12}
            style={{ minHeight: layout.isTablet ? 116 : undefined }}
        >
            <Paragraph
                color={ds.colors.mutedForeground}
                fontFamily={ds.fonts.bodyBold}
                fontSize={layout.isTablet ? ds.typography.labelMd.fontSize : ds.typography.labelXs.fontSize}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={ds.fonts.headingBold}
                fontSize={layout.isTablet ? ds.typography.displayLg.fontSize : ds.typography.displaySm.fontSize}
                lineHeight={layout.isTablet ? ds.typography.displayLg.lineHeight : ds.typography.displaySm.lineHeight}
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
            bg={ds.colors.mutedSurface}
            mb="$3"
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
