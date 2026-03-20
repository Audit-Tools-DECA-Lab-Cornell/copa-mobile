import { useEffect, useMemo } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, ClipboardCheck } from "@tamagui/lucide-icons";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import { designSystem } from "lib/design-system";
import { useAuthStore } from "stores/auth-store";
import { usePlayspaceAuditStore } from "stores/audit-store";
import { usePlacesStore } from "stores/places-store";

/**
 * Execute tab landing screen with place picker and audit flow entry point.
 */
export default function ExecuteIndexScreen() {
    const router = useRouter();
    const session = useAuthStore((state) => state.session);
    const hydrate = usePlayspaceAuditStore((state) => state.hydrate);
    const places = usePlacesStore((state) => state.places);
    const loadPlaces = usePlacesStore((state) => state.loadPlaces);
    const sessionsByPlaceId = usePlayspaceAuditStore((state) => state.sessionsByPlaceId);

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    useEffect(() => {
        if (session !== null) {
            void loadPlaces(session);
        }
    }, [session, loadPlaces]);

    const activePlaces = useMemo(() => {
        return places.filter((place) => place.audit_status !== "SUBMITTED");
    }, [places]);

    const firstPlace = activePlaces[0] ?? places[0];

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: designSystem.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: designSystem.spacing.screenPaddingHorizontal,
                paddingTop: designSystem.spacing.screenPaddingVertical,
                paddingBottom: 92,
                gap: 20,
            }}
        >
            <YStack gap="$3">
                <Text
                    color={designSystem.colors.foreground}
                    fontFamily={designSystem.fonts.headingBold}
                    fontSize={designSystem.typography.displayMd.fontSize}
                    lineHeight={designSystem.typography.displayMd.lineHeight}
                >
                    Audit Execute
                </Text>
                <Paragraph
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyMedium}
                    fontSize={designSystem.typography.bodyLg.fontSize}
                >
                    Choose a place to start or resume the section-by-section playspace audit flow.
                </Paragraph>
            </YStack>

            {firstPlace === undefined ? null : (
                <YStack
                    rounded={designSystem.radii.lg}
                    borderWidth={1}
                    borderColor={designSystem.colors.border}
                    bg={designSystem.colors.surface}
                    p="$4"
                    gap="$3"
                    style={{
                        boxShadow: designSystem.shadows.card,
                    }}
                >
                    <XStack items="center" gap="$2">
                        <ClipboardCheck size={16} color={designSystem.colors.primary} />
                        <Text
                            color={designSystem.colors.primary}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={designSystem.typography.labelMd.fontSize}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            Continue Selected Place
                        </Text>
                    </XStack>
                    <Text
                        color={designSystem.colors.foreground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={designSystem.typography.titleLg.fontSize}
                    >
                        {firstPlace.place_name}
                    </Text>
                    <Paragraph
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyMedium}
                    >
                        {[firstPlace.city, firstPlace.country].filter(Boolean).join(", ") ||
                            "Assigned place"}
                    </Paragraph>
                    <Button
                        height={48}
                        rounded={designSystem.radii.md}
                        borderWidth={0}
                        bg={designSystem.colors.primary}
                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                        onPress={() => {
                            router.push(`/(tabs)/execute/${firstPlace.place_id}`);
                        }}
                    >
                        <XStack items="center" gap="$2">
                            <Text
                                color={designSystem.colors.primaryForeground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={designSystem.typography.labelLg.fontSize}
                                textTransform="uppercase"
                                letterSpacing={1.2}
                            >
                                Open selected audit
                            </Text>
                            <ArrowRight size={16} color={designSystem.colors.primaryForeground} />
                        </XStack>
                    </Button>
                </YStack>
            )}

            <YStack gap="$3">
                {places.map((place) => {
                    const activeSession = sessionsByPlaceId[place.place_id];
                    const hasActiveSession = activeSession !== undefined;

                    return (
                        <YStack
                            key={place.place_id}
                            rounded={designSystem.radii.lg}
                            borderWidth={1}
                            borderColor={designSystem.colors.border}
                            bg={designSystem.colors.surface}
                            p="$4"
                            gap="$2"
                            style={{
                                boxShadow: designSystem.shadows.card,
                            }}
                        >
                            <Text
                                color={designSystem.colors.foreground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={designSystem.typography.titleMd.fontSize}
                            >
                                {place.place_name}
                            </Text>
                            <Paragraph
                                color={designSystem.colors.mutedForeground}
                                fontFamily={designSystem.fonts.bodyMedium}
                            >
                                {place.project_name}
                            </Paragraph>
                            <Button
                                height={42}
                                rounded={designSystem.radii.md}
                                borderWidth={1}
                                borderColor={designSystem.colors.border}
                                bg={designSystem.colors.input}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    router.push(`/(tabs)/execute/${place.place_id}`);
                                }}
                            >
                                <Text
                                    color={designSystem.colors.foreground}
                                    fontFamily={designSystem.fonts.bodyBold}
                                    fontSize={designSystem.typography.labelMd.fontSize}
                                    textTransform="uppercase"
                                    letterSpacing={1.2}
                                >
                                    {hasActiveSession ? "Resume audit" : "Start audit"}
                                </Text>
                            </Button>
                        </YStack>
                    );
                })}
            </YStack>
        </ScrollView>
    );
}
