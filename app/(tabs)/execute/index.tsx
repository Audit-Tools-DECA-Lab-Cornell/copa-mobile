import { FlashList, type ListRenderItemInfo } from "@shopify/flash-list";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, ClipboardCheck } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { FilterChip } from "components/ui/filter-chip";
import { SearchInput } from "components/ui/search-input";
import type { AuditorPlace } from "lib/audit/places-api";
import { deriveLocality, matchesPlaceSearch } from "lib/audit/place-helpers";
import { getProjectPlaceKey } from "lib/audit/pair-key";
import { useLocalFirstPlaces } from "lib/audit/use-local-first-places";
import { useDesignSystem } from "lib/design-system";
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
    const hasActiveFilters = searchQuery.trim().length > 0 || executeFilter !== "active";
    const keyExtractor = useCallback((item: AuditorPlace) => {
        return getProjectPlaceKey(item.project_id, item.place_id);
    }, []);
    const renderSeparator = useCallback(() => {
        return <YStack height={12} />;
    }, []);
    const renderItem = useCallback(
        ({ item: place }: ListRenderItemInfo<AuditorPlace>) => {
            const activeSession = hasHydratedCurrentUser
                ? sessionsByPairKey[getProjectPlaceKey(place.project_id, place.place_id)]
                : undefined;
            const hasActiveSession = activeSession !== undefined;

            return (
                <YStack
                    rounded={ds.radii.lg}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surface}
                    p="$4"
                    gap="$2.5"
                    style={{ boxShadow: ds.shadows.card }}
                >
                    <Text
                        color={ds.colors.foreground}
                        fontFamily={ds.fonts.bodyBold}
                        fontSize={ds.typography.titleMd.fontSize}
                    >
                        {place.place_name}
                    </Text>
                    <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                        {place.project_name}
                    </Paragraph>
                    <Paragraph
                        color={ds.colors.mutedForeground}
                        fontFamily={ds.fonts.bodyMedium}
                        fontSize={ds.typography.bodySm.fontSize}
                    >
                        {deriveLocality(place, t("place.assignedPlace", { ns: "common" }))}
                    </Paragraph>
                    <Button
                        height={42}
                        rounded={ds.radii.md}
                        borderWidth={1}
                        borderColor={ds.colors.border}
                        bg={ds.colors.input}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={() => {
                            router.push(
                                `/(tabs)/execute/${place.place_id}?projectId=${encodeURIComponent(place.project_id)}`,
                            );
                        }}
                    >
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.bodyBold}
                            fontSize={ds.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            {hasActiveSession
                                ? t("resumeAudit", { ns: "audit" })
                                : t("startAudit", { ns: "audit" })}
                        </Text>
                    </Button>
                </YStack>
            );
        },
        [ds, hasHydratedCurrentUser, router, sessionsByPairKey, t],
    );

    return (
        <FlashList<AuditorPlace>
            data={listPlaces}
            keyExtractor={keyExtractor}
            contentInsetAdjustmentBehavior="automatic"
            maintainVisibleContentPosition={{ disabled: true }}
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: ds.spacing.screenPaddingHorizontal,
                paddingTop: ds.spacing.screenPaddingVertical,
                paddingBottom: 92,
            }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
                <YStack gap="$4">
                    <YStack gap="$3">
                        <Text
                            color={ds.colors.foreground}
                            fontFamily={ds.fonts.headingBold}
                            fontSize={ds.typography.displayMd.fontSize}
                            lineHeight={ds.typography.displayMd.lineHeight}
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
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.titleLg.fontSize}
                            >
                                {featuredPlace.place_name}
                            </Text>
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                            >
                                {deriveLocality(
                                    featuredPlace,
                                    t("place.assignedPlace", { ns: "common" }),
                                )}
                            </Paragraph>
                            <Button
                                height={48}
                                rounded={ds.radii.md}
                                borderWidth={0}
                                bg={ds.colors.primary}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    router.push(
                                        `/(tabs)/execute/${featuredPlace.place_id}?projectId=${encodeURIComponent(featuredPlace.project_id)}`,
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
            }
            ListHeaderComponentStyle={{ marginBottom: 20 }}
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
            }
            renderItem={renderItem}
        />
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
    return (
        <YStack
            rounded={ds.radii.lg}
            borderWidth={1}
            borderColor={ds.colors.border}
            bg={ds.colors.surface}
            p="$4"
            gap="$3"
            style={{ boxShadow: ds.shadows.card }}
        >
            {children}
        </YStack>
    );
}
