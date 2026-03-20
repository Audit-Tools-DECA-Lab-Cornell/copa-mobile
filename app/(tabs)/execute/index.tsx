import { useEffect, useMemo } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, ClipboardCheck } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { useDesignSystem } from "lib/design-system";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";
import { usePlacesStore } from "stores/places-store";

/**
 * Execute tab landing screen with place picker and audit flow entry point.
 */
export default function ExecuteIndexScreen() {
    const ds = useDesignSystem();
    const router = useRouter();
    const { t } = useTranslation(["audit", "common"]);
    const session = useAuthStore((state) => state.session);
    const hydrate = usePlayspaceAuditStore((state) => state.hydrate);
    const currentUserId = usePlayspaceAuditStore((state) => state.currentUserId);
    const places = usePlacesStore((state) => state.places);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);
    const sessionsByPlaceId = usePlayspaceAuditStore((state) => state.sessionsByPlaceId);

    useEffect(() => {
        hydrate(session?.user.id ?? null).catch(() => undefined);
    }, [hydrate, session]);

    useEffect(() => {
        if (session !== null) {
            loadPlaces(session).catch(() => undefined);
        }
    }, [session, loadPlaces]);

    const activePlaces = useMemo(() => {
        return places.filter((place) => place.audit_status !== "SUBMITTED");
    }, [places]);

    const firstPlace = activePlaces[0] ?? places[0];
    const hasHydratedCurrentUser = session === null || currentUserId === session.user.id;

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: ds.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: ds.spacing.screenPaddingHorizontal,
                paddingTop: ds.spacing.screenPaddingVertical,
                paddingBottom: 92,
                gap: 20,
            }}
        >
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

            {firstPlace === undefined ? null : (
                <YStack
                    rounded={ds.radii.lg}
                    borderWidth={1}
                    borderColor={ds.colors.border}
                    bg={ds.colors.surface}
                    p="$4"
                    gap="$3"
                    style={{
                        boxShadow: ds.shadows.card,
                    }}
                >
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
                        {firstPlace.place_name}
                    </Text>
                    <Paragraph color={ds.colors.mutedForeground} fontFamily={ds.fonts.bodyMedium}>
                        {[firstPlace.city, firstPlace.country].filter(Boolean).join(", ") ||
                            t("place.assignedPlace", { ns: "common" })}
                    </Paragraph>
                    <Button
                        height={48}
                        rounded={ds.radii.md}
                        borderWidth={0}
                        bg={ds.colors.primary}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={() => {
                            router.push(`/(tabs)/execute/${firstPlace.place_id}`);
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
                </YStack>
            )}

            <YStack gap="$3">
                {places.map((place) => {
                    const activeSession = hasHydratedCurrentUser
                        ? sessionsByPlaceId[place.place_id]
                        : undefined;
                    const hasActiveSession = activeSession !== undefined;

                    return (
                        <YStack
                            key={place.place_id}
                            rounded={ds.radii.lg}
                            borderWidth={1}
                            borderColor={ds.colors.border}
                            bg={ds.colors.surface}
                            p="$4"
                            gap="$2"
                            style={{
                                boxShadow: ds.shadows.card,
                            }}
                        >
                            <Text
                                color={ds.colors.foreground}
                                fontFamily={ds.fonts.bodyBold}
                                fontSize={ds.typography.titleMd.fontSize}
                            >
                                {place.place_name}
                            </Text>
                            <Paragraph
                                color={ds.colors.mutedForeground}
                                fontFamily={ds.fonts.bodyMedium}
                            >
                                {place.project_name}
                            </Paragraph>
                            <Button
                                height={42}
                                rounded={ds.radii.md}
                                borderWidth={1}
                                borderColor={ds.colors.border}
                                bg={ds.colors.input}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    router.push(`/(tabs)/execute/${place.place_id}`);
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
                })}
            </YStack>
        </ScrollView>
    );
}
