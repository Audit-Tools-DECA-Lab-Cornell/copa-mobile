import { FlashList, FlashListRef, type ListRenderItemInfo } from "@shopify/flash-list";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, ClipboardCheck } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { FilterChip } from "components/ui/filter-chip";
import { SearchInput } from "components/ui/search-input";
import type { AuditorPlace } from "lib/audit/places-api";
import { getExecuteFlowSubject } from "lib/audit/execute-flow";
import { deriveLocality, matchesPlaceSearch } from "lib/audit/place-helpers";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { useDesignSystem } from "lib/design-system";
import { buildPairGridRows, type PairGridRow } from "lib/ui/pair-grid";
import { getResponsiveContentContainerStyle, useResponsiveLayout } from "lib/responsive-layout";
import { useScreenshotScrollAutomation } from "lib/screenshot-automation";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";
import { usePlacesStore } from "stores/places-store";

type ExecuteFilter = "active" | "all";

/**
 * Execute tab landing screen with place picker and audit flow entry point.
 * Adds search and a focused active/all filter so large field queues stay usable.
 */
export default function ExecuteIndexScreen() {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const router = useRouter();
    const { t } = useTranslation(["audit", "common"]);
    const session = useAuthStore((state) => state.session);
    const hydrate = usePlayspaceAuditStore((state) => state.hydrate);
    const currentUserId = usePlayspaceAuditStore((state) => state.currentUserId);
    const places = useLocalFirstPlaces();
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);
    const sessionsByPairKey = usePlayspaceAuditStore((state) => state.sessionsByPairKey);
    const [searchQuery, setSearchQuery] = useState("");
    const [executeFilter, setExecuteFilter] = useState<ExecuteFilter>("active");
    const phoneListRef = useRef<FlashListRef<AuditorPlace> | null>(null);
    const tabletListRef = useRef<FlashListRef<PairGridRow<AuditorPlace>> | null>(null);

    useEffect(() => {
        hydrate(session?.user.id ?? null).catch(() => undefined);
    }, [hydrate, session]);

    useEffect(() => {
        if (session !== null) {
            loadPlaces(session).catch(() => undefined);
        }
    }, [session, loadPlaces]);

    const hasHydratedCurrentUser = session === null || currentUserId === session.user.id;

    const filteredPlaces = useMemo(() => {
        const visiblePlaces = places.filter((place) => {
            if (executeFilter === "active" && place.audit_status === "SUBMITTED") {
                return false;
            }
            return matchesPlaceSearch(place, searchQuery);
        });

        return visiblePlaces.sort((leftPlace, rightPlace) => {
            const leftHasSession =
                hasHydratedCurrentUser &&
                sessionsByPairKey[getProjectPlaceKey(leftPlace.project_id, leftPlace.place_id)] !==
                    undefined;
            const rightHasSession =
                hasHydratedCurrentUser &&
                sessionsByPairKey[
                    getProjectPlaceKey(rightPlace.project_id, rightPlace.place_id)
                ] !== undefined;

            if (leftHasSession !== rightHasSession) {
                return leftHasSession ? -1 : 1;
            }

            return leftPlace.place_name.localeCompare(rightPlace.place_name);
        });
    }, [executeFilter, hasHydratedCurrentUser, places, searchQuery, sessionsByPairKey]);

    const featuredPlace =
        searchQuery.trim().length === 0 && executeFilter === "active"
            ? filteredPlaces[0]
            : undefined;
    const listPlaces =
        featuredPlace === undefined
            ? filteredPlaces
            : filteredPlaces.filter((place) => {
                  return (
                      getProjectPlaceKey(place.project_id, place.place_id) !==
                      getProjectPlaceKey(featuredPlace.project_id, featuredPlace.place_id)
                  );
              });
    const tabletRows = useMemo(() => {
        return buildPairGridRows(listPlaces, (place) => {
            return getProjectPlaceKey(place.project_id, place.place_id);
        });
    }, [listPlaces]);

    const scrollExecuteListToOffset = useCallback(
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
        contentReady: true,
        rerunKey: layout.isTablet ? tabletRows.length : listPlaces.length,
        scrollToOffset: scrollExecuteListToOffset,
    });
    const hasActiveFilters = searchQuery.trim().length > 0 || executeFilter !== "active";
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
                <ExecuteQueueCard
                    place={place}
                    hasHydratedCurrentUser={hasHydratedCurrentUser}
                    sessionsByPairKey={sessionsByPairKey}
                    onPress={() => {
                        router.push(
                            `/execute/${place.place_id}?projectId=${encodeURIComponent(place.project_id)}`,
                        );
                    }}
                />
            );
        },
        [hasHydratedCurrentUser, router, sessionsByPairKey],
    );
    const renderTabletRow = useCallback(
        ({ item }: ListRenderItemInfo<PairGridRow<AuditorPlace>>) => {
            const rightPlace = item.right;

            if (rightPlace === null) {
                return (
                    <ExecuteQueueCard
                        place={item.left}
                        hasHydratedCurrentUser={hasHydratedCurrentUser}
                        sessionsByPairKey={sessionsByPairKey}
                        onPress={() => {
                            router.push(
                                `/execute/${item.left.place_id}?projectId=${encodeURIComponent(item.left.project_id)}`,
                            );
                        }}
                    />
                );
            }

            return (
                <XStack gap="$3" items="stretch">
                    <ExecuteQueueCard
                        place={item.left}
                        hasHydratedCurrentUser={hasHydratedCurrentUser}
                        sessionsByPairKey={sessionsByPairKey}
                        onPress={() => {
                            router.push(
                                `/execute/${item.left.place_id}?projectId=${encodeURIComponent(item.left.project_id)}`,
                            );
                        }}
                    />
                    <ExecuteQueueCard
                        place={rightPlace}
                        hasHydratedCurrentUser={hasHydratedCurrentUser}
                        sessionsByPairKey={sessionsByPairKey}
                        onPress={() => {
                            router.push(
                                `/execute/${rightPlace.place_id}?projectId=${encodeURIComponent(rightPlace.project_id)}`,
                            );
                        }}
                    />
                </XStack>
            );
        },
        [hasHydratedCurrentUser, router, sessionsByPairKey],
    );

    const headerComponent = (
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
                >
                    {t("executeLanding.title", { ns: "audit" })}
                </Text>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodyLg.fontSize}
                >
                    {t("executeLanding.subtitle", { ns: "audit" })}
                </Paragraph>
            </YStack>

            <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("executeLanding.searchPlaceholder", { ns: "audit" })}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack gap="$2">
                    <FilterChip
                        label={t("filters.active", { ns: "common" })}
                        isSelected={executeFilter === "active"}
                        onPress={() => {
                            setExecuteFilter("active");
                        }}
                    />
                    <FilterChip
                        label={t("filters.all", { ns: "common" })}
                        isSelected={executeFilter === "all"}
                        onPress={() => {
                            setExecuteFilter("all");
                        }}
                    />
                </XStack>
            </ScrollView>

            {featuredPlace === undefined ? null : (
                <FeaturedPlaceCard>
                    <XStack items="center" gap="$2">
                        <ClipboardCheck size={16} color={ds.colors.primary} />
                        <Text
                            color={ds.colors.primary}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            {t("executeLanding.continueSelectedPlace", { ns: "audit" })}
                        </Text>
                    </XStack>
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.headingBold}
                        fontSize={ds.typography.titleLg.fontSize}
                    >
                        {featuredPlace.place_name}
                    </Text>

                    <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                        {deriveLocality(featuredPlace, t("place.assignedPlace", { ns: "common" }))}
                    </Paragraph>
                    <Button
                        height={layout.isTablet ? layout.buttonHeight : 48}
                        rounded={ds.radii.md}
                        borderWidth={0}
                        bg={ds.colors.primary}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={() => {
                            router.push(
                                `/execute/${featuredPlace.place_id}?projectId=${encodeURIComponent(featuredPlace.project_id)}`,
                            );
                        }}
                    >
                        <XStack items="center" gap="$2">
                            <Text
                                color={ds.colors.primaryForeground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.labelLg.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.2}
                            >
                                {t("executeLanding.openSelectedAudit", { ns: "audit" })}
                            </Text>
                            <ArrowRight size={16} color={ds.colors.primaryForeground} />
                        </XStack>
                    </Button>
                </FeaturedPlaceCard>
            )}
        </YStack>
    );

    const emptyComponent = (
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
                {hasActiveFilters
                    ? t("executeLanding.emptyTitle", { ns: "audit" })
                    : t("executeLanding.title", { ns: "audit" })}
            </Text>
            <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                {hasActiveFilters
                    ? t("executeLanding.emptyMessage", { ns: "audit" })
                    : t("executeLanding.subtitle", { ns: "audit" })}
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
                ListHeaderComponentStyle={{ marginBottom: 24 }}
                ItemSeparatorComponent={renderSeparator}
                ListEmptyComponent={emptyComponent}
                renderItem={renderTabletRow}
            />
        );
    }

    return (
        <FlashList<AuditorPlace>
            ref={phoneListRef}
            data={listPlaces}
            keyExtractor={keyExtractor}
            contentInsetAdjustmentBehavior="automatic"
            maintainVisibleContentPosition={{ disabled: true }}
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={getResponsiveContentContainerStyle(layout, {
                bottomPadding: 92,
            })}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={headerComponent}
            ListHeaderComponentStyle={{ marginBottom: 20 }}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={emptyComponent}
            renderItem={renderItem}
        />
    );
}

interface ExecuteQueueCardProps {
    readonly place: AuditorPlace;
    readonly hasHydratedCurrentUser: boolean;
    readonly sessionsByPairKey: Record<string, unknown>;
    readonly onPress: () => void;
}

function ExecuteQueueCard({
    place,
    hasHydratedCurrentUser,
    sessionsByPairKey,
    onPress,
}: Readonly<ExecuteQueueCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    const { t } = useTranslation(["audit", "common"]);
    const activeSession = hasHydratedCurrentUser
        ? sessionsByPairKey[getProjectPlaceKey(place.project_id, place.place_id)]
        : undefined;
    const hasActiveSession = activeSession !== undefined;
    const flowSubject =
        place.selected_execution_mode === null
            ? null
            : t(`subjects.${getExecuteFlowSubject(place.selected_execution_mode)}`, {
                  ns: "audit",
              });

    return (
        <YStack
            flex={1}
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
            <YStack gap="$2.5">
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.headingBold}
                    fontSize={
                        layout.isWideTablet
                            ? ds.typography.titleLg.fontSize
                            : ds.typography.titleMd.fontSize
                    }
                    lineHeight={
                        layout.isWideTablet
                            ? ds.typography.titleLg.lineHeight
                            : ds.typography.titleMd.lineHeight
                    }
                >
                    {place.place_name}
                </Text>
                <Paragraph color={ds.colors.secondaryForeground} fontFamily={ds.fonts.bodyMedium}>
                    {place.project_name}
                </Paragraph>
                <Paragraph
                    color={ds.colors.mutedForeground}
                    fontFamily={ds.fonts.bodyMedium}
                    fontSize={ds.typography.bodySm.fontSize}
                >
                    {deriveLocality(place, t("place.assignedPlace", { ns: "common" }))}
                </Paragraph>
            </YStack>

            <Button
                height={layout.isTablet ? layout.buttonHeight : 42}
                rounded={ds.radii.md}
                borderWidth={1}
                borderColor={ds.colors.border}
                bg={ds.colors.input}
                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                onPress={onPress}
            >
                <Text
                    color={ds.colors.foreground}
                    fontFamily={ds.fonts.bodyBold}
                    fontSize={ds.typography.labelMd.fontSize}
                    textTransform="uppercase"
                    letterSpacing={1.2}
                >
                    {hasActiveSession && flowSubject !== null
                        ? t("copy.continueToSubject", { ns: "audit", subject: flowSubject })
                        : hasActiveSession
                          ? t("resumeAudit", { ns: "audit" })
                          : t("startAudit", { ns: "audit" })}
                </Text>
            </Button>
        </YStack>
    );
}

interface FeaturedPlaceCardProps {
    readonly children: React.ReactNode;
}

/**
 * Highlight card shown above the execute list when an active place is ready to resume.
 *
 * @param props Featured place card content.
 * @returns Styled featured card surface.
 */
function FeaturedPlaceCard({ children }: Readonly<FeaturedPlaceCardProps>) {
    const ds = useDesignSystem();
    const layout = useResponsiveLayout();
    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p={layout.cardPadding}
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            {children}
        </YStack>
    );
}
