import { useMemo } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
    ArrowUpRight,
    BarChart3,
    Bell,
    ClipboardCheck,
    Clock3,
    LogOut,
    MapPinned,
    Play,
    ShieldCheck,
    UserRound,
    WifiOff,
} from "@tamagui/lucide-icons";
import { Button, Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import { FIELD_PRIORITY_ITEMS, PLAYSPACE_PLACES, type PlaceStatus } from "lib/playspace-demo-data";
import { designSystem, getPlaceStatusTone } from "lib/design-system";
import { useDemoUiStore } from "stores/demo-ui-store";
import { useAuthStore } from "stores/auth-store";

const PLACE_STATUS_LABELS: Record<PlaceStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    ready_for_review: "Ready for Review",
    submitted: "Submitted",
};

/**
 * Dashboard tab for playspace field operations.
 */
export default function DashboardScreen() {
    const router = useRouter();
    const setSelectedPlaceId = useDemoUiStore((state) => state.setSelectedPlaceId);
    const session = useAuthStore((state) => state.session);
    const logout = useAuthStore((state) => state.logout);
    const highlightedPlaces = useMemo(() => {
        return PLAYSPACE_PLACES.filter((place) => place.status !== "submitted").slice(0, 3);
    }, []);
    const assignedCount = PLAYSPACE_PLACES.length;
    const completedCount = PLAYSPACE_PLACES.filter((place) => place.status === "submitted").length;
    const priorityPlace = highlightedPlaces[0] ?? PLAYSPACE_PLACES[0];
    const fieldReadinessPercent = useMemo(() => {
        if (highlightedPlaces.length === 0) {
            return 0;
        }

        const totalCompletion = highlightedPlaces.reduce((sum, place) => {
            return sum + place.mandatoryCompletionPercent;
        }, 0);

        return Math.round(totalCompletion / highlightedPlaces.length);
    }, [highlightedPlaces]);
    const activeAuditorName = session?.user.name ?? session?.user.email ?? "Active auditor";
    const dateLabel = useMemo(() => {
        return new Date().toLocaleDateString("en-NZ", {
            month: "long",
            day: "numeric",
            year: "numeric",
            weekday: "long",
        });
    }, []);

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: designSystem.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: designSystem.spacing.screenPaddingHorizontal,
                paddingTop: designSystem.spacing.screenPaddingVertical,
                paddingBottom: 132,
                gap: 28,
            }}
        >
            <YStack gap="$6">
                <XStack justify="space-between" items="center" gap="$3">
                    <XStack items="center" gap="$3" flex={1}>
                        <YStack
                            width={44}
                            height={44}
                            items="center"
                            justify="center"
                            rounded={designSystem.radii.md}
                            borderWidth={1}
                            borderColor={designSystem.colors.border}
                            bg={designSystem.colors.surfaceMuted}
                        >
                            <UserRound size={20} color={designSystem.colors.primary} />
                        </YStack>
                        <YStack flex={1} gap="$0.5">
                            <Paragraph
                                color={designSystem.colors.mutedForeground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={10}
                                textTransform="uppercase"
                                letterSpacing={1.4}
                            >
                                Active auditor
                            </Paragraph>
                            <Text
                                color={designSystem.colors.foreground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={15}
                            >
                                {activeAuditorName}
                            </Text>
                        </YStack>
                    </XStack>

                    <XStack gap="$2">
                        <YStack
                            width={42}
                            height={42}
                            items="center"
                            justify="center"
                            rounded={designSystem.radii.full}
                            borderWidth={1}
                            borderColor={designSystem.colors.border}
                            bg={designSystem.colors.surfaceMuted}
                        >
                            <Bell size={18} color={designSystem.colors.foreground} />
                        </YStack>
                        <Button
                            width={42}
                            height={42}
                            p={0}
                            rounded={designSystem.radii.full}
                            borderWidth={1}
                            borderColor={designSystem.colors.border}
                            bg={designSystem.colors.surfaceMuted}
                            pressStyle={{ opacity: 0.92, scale: 0.985 }}
                            onPress={logout}
                        >
                            <LogOut size={16} color={designSystem.colors.foreground} />
                        </Button>
                    </XStack>
                </XStack>

                <YStack gap="$1.5">
                    <Text
                        color={designSystem.colors.foreground}
                        fontFamily={designSystem.fonts.headingBold}
                        fontSize={34}
                        lineHeight={38}
                        letterSpacing={-0.8}
                    >
                        Field Dashboard
                    </Text>
                    <Paragraph
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodySemiBold}
                    >
                        {dateLabel}
                    </Paragraph>
                </YStack>

                <XStack gap="$3">
                    <YStack
                        flex={1}
                        height={128}
                        justify="space-between"
                        rounded={designSystem.radii.lg}
                        borderWidth={1}
                        borderColor={designSystem.colors.border}
                        bg={designSystem.colors.surface}
                        p="$4"
                        style={{
                            boxShadow: designSystem.shadows.card,
                        }}
                    >
                        <YStack gap="$1">
                            <Text
                                color={designSystem.colors.primary}
                                fontFamily={designSystem.fonts.headingBold}
                                fontSize={34}
                                lineHeight={36}
                            >
                                {assignedCount.toString().padStart(2, "0")}
                            </Text>
                            <Paragraph
                                color={designSystem.colors.mutedForeground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={11}
                                textTransform="uppercase"
                                letterSpacing={1.5}
                            >
                                Assigned
                            </Paragraph>
                        </YStack>
                        <MapPinned size={28} color="rgba(255, 107, 0, 0.25)" />
                    </YStack>

                    <YStack
                        flex={1}
                        height={128}
                        justify="space-between"
                        rounded={designSystem.radii.lg}
                        borderWidth={1}
                        borderColor={designSystem.colors.border}
                        bg={designSystem.colors.surface}
                        p="$4"
                        style={{
                            boxShadow: designSystem.shadows.card,
                        }}
                    >
                        <YStack gap="$1">
                            <Text
                                color={designSystem.colors.success}
                                fontFamily={designSystem.fonts.headingBold}
                                fontSize={34}
                                lineHeight={36}
                            >
                                {completedCount.toString().padStart(2, "0")}
                            </Text>
                            <Paragraph
                                color={designSystem.colors.mutedForeground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={11}
                                textTransform="uppercase"
                                letterSpacing={1.5}
                            >
                                Completed
                            </Paragraph>
                        </YStack>
                        <ShieldCheck size={28} color="rgba(16, 185, 129, 0.28)" />
                    </YStack>
                </XStack>
            </YStack>

            <YStack gap="$3">
                <XStack justify="space-between" items="center">
                    <Text
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={11}
                        textTransform="uppercase"
                        letterSpacing={1.6}
                    >
                        Priority task
                    </Text>
                    <Paragraph
                        color={designSystem.colors.danger}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={11}
                        textTransform="uppercase"
                        letterSpacing={1.3}
                    >
                        Due today
                    </Paragraph>
                </XStack>

                {priorityPlace === undefined ? null : (
                    <YStack
                        rounded={designSystem.radii.lg}
                        borderWidth={2}
                        borderColor={designSystem.colors.primary}
                        bg={designSystem.colors.surface}
                        overflow="hidden"
                        style={{
                            boxShadow: designSystem.shadows.card,
                        }}
                    >
                        <YStack
                            p="$4"
                            gap="$3"
                            bg={designSystem.colors.surface}
                            style={{
                                backgroundColor: designSystem.colors.surface,
                            }}
                        >
                            <XStack gap="$2" items="center" flexWrap="wrap">
                                <YStack
                                    rounded={designSystem.radii.sm}
                                    px="$2"
                                    py="$1"
                                    bg={designSystem.colors.primary}
                                >
                                    <Text
                                        color={designSystem.colors.primaryForeground}
                                        fontFamily={designSystem.fonts.bodyBold}
                                        fontSize={10}
                                        textTransform="uppercase"
                                        letterSpacing={1.3}
                                    >
                                        Urgent audit
                                    </Text>
                                </YStack>
                                <YStack
                                    rounded={designSystem.radii.sm}
                                    px="$2"
                                    py="$1"
                                    bg={designSystem.colors.surfaceMuted}
                                >
                                    <Text
                                        color={designSystem.colors.secondaryForeground}
                                        fontFamily={designSystem.fonts.bodyBold}
                                        fontSize={10}
                                        textTransform="uppercase"
                                        letterSpacing={1.3}
                                    >
                                        {priorityPlace.locality}
                                    </Text>
                                </YStack>
                            </XStack>

                            <YStack gap="$1">
                                <Text
                                    color={designSystem.colors.foreground}
                                    fontFamily={designSystem.fonts.headingBold}
                                    fontSize={24}
                                    lineHeight={28}
                                >
                                    {priorityPlace.placeName}
                                </Text>
                                <Paragraph
                                    color={designSystem.colors.mutedForeground}
                                    fontFamily={designSystem.fonts.bodyMedium}
                                >
                                    {priorityPlace.projectName}
                                </Paragraph>
                            </YStack>
                        </YStack>

                        <XStack
                            items="center"
                            gap="$4"
                            p="$4"
                            borderTopWidth={1}
                            borderTopColor={designSystem.colors.border}
                        >
                            <YStack flex={1} gap="$2">
                                <YStack
                                    height={6}
                                    rounded={designSystem.radii.full}
                                    bg={designSystem.colors.mutedSurface}
                                    overflow="hidden"
                                >
                                    <YStack
                                        height={6}
                                        rounded={designSystem.radii.full}
                                        bg={designSystem.colors.primary}
                                        width={`${priorityPlace.mandatoryCompletionPercent}%`}
                                    />
                                </YStack>
                                <Text
                                    color={designSystem.colors.mutedForeground}
                                    fontFamily={designSystem.fonts.monoBold}
                                    fontSize={11}
                                    textTransform="uppercase"
                                    letterSpacing={1.1}
                                >
                                    {priorityPlace.mandatoryCompletionPercent}% progress •{" "}
                                    {priorityPlace.id.toUpperCase()}
                                </Text>
                            </YStack>
                            <Button
                                height={40}
                                px="$4"
                                rounded={designSystem.radii.sm}
                                borderWidth={0}
                                bg={designSystem.colors.primary}
                                pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                onPress={() => {
                                    setSelectedPlaceId(priorityPlace.id);
                                    router.push("/(tabs)/execute");
                                }}
                            >
                                <XStack items="center" gap="$2">
                                    <Text
                                        color={designSystem.colors.primaryForeground}
                                        fontFamily={designSystem.fonts.bodyBold}
                                        fontSize={12}
                                        textTransform="uppercase"
                                        letterSpacing={1.2}
                                    >
                                        Resume
                                    </Text>
                                    <Play size={14} color={designSystem.colors.primaryForeground} />
                                </XStack>
                            </Button>
                        </XStack>
                    </YStack>
                )}
            </YStack>

            <XStack gap="$3">
                <Button
                    flex={1}
                    height={48}
                    rounded={designSystem.radii.md}
                    borderWidth={1}
                    borderColor={designSystem.colors.border}
                    bg={designSystem.colors.surfaceMuted}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push("/places");
                    }}
                >
                    <XStack items="center" gap="$2">
                        <MapPinned size={16} color={designSystem.colors.foreground} />
                        <Text
                            color={designSystem.colors.foreground}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={12}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            Places
                        </Text>
                    </XStack>
                </Button>

                <Button
                    flex={1}
                    height={48}
                    rounded={designSystem.radii.md}
                    borderWidth={0}
                    bg={designSystem.colors.primary}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push("/execute");
                    }}
                >
                    <XStack items="center" gap="$2">
                        <ClipboardCheck size={16} color={designSystem.colors.primaryForeground} />
                        <Text
                            color={designSystem.colors.primaryForeground}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={12}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            Execute
                        </Text>
                    </XStack>
                </Button>

                <Button
                    flex={1}
                    height={48}
                    rounded={designSystem.radii.md}
                    borderWidth={1}
                    borderColor={designSystem.colors.border}
                    bg={designSystem.colors.surfaceMuted}
                    pressStyle={{ opacity: 0.92, scale: 0.985 }}
                    onPress={() => {
                        router.push("/reports");
                    }}
                >
                    <XStack items="center" gap="$2">
                        <BarChart3 size={16} color={designSystem.colors.foreground} />
                        <Text
                            color={designSystem.colors.foreground}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={12}
                            textTransform="uppercase"
                            letterSpacing={1.2}
                        >
                            Reports
                        </Text>
                    </XStack>
                </Button>
            </XStack>

            <YStack gap="$3">
                <Text
                    color={designSystem.colors.mutedForeground}
                    fontFamily={designSystem.fonts.bodyBold}
                    fontSize={11}
                    textTransform="uppercase"
                    letterSpacing={1.6}
                >
                    Connectivity status
                </Text>

                <YStack
                    borderWidth={1}
                    borderColor={designSystem.colors.border}
                    rounded={designSystem.radii.lg}
                    p="$4"
                    gap="$3"
                    bg={designSystem.colors.surfaceMuted}
                    style={{
                        boxShadow: designSystem.shadows.card,
                    }}
                >
                    <XStack items="center" gap="$3">
                        <YStack
                            width={44}
                            height={44}
                            items="center"
                            justify="center"
                            rounded={designSystem.radii.md}
                            bg={designSystem.colors.successSoft}
                        >
                            <WifiOff size={22} color={designSystem.colors.success} />
                        </YStack>
                        <YStack flex={1} gap="$1">
                            <Text
                                color={designSystem.colors.foreground}
                                fontFamily={designSystem.fonts.bodyBold}
                                fontSize={15}
                            >
                                Offline ready
                            </Text>
                            <Paragraph
                                color={designSystem.colors.mutedForeground}
                                fontFamily={designSystem.fonts.bodyMedium}
                            >
                                Assigned audit data is stored locally and ready for field use.
                            </Paragraph>
                        </YStack>
                    </XStack>
                </YStack>
            </YStack>

            <YStack gap="$3">
                <XStack justify="space-between" items="center">
                    <Text
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={11}
                        textTransform="uppercase"
                        letterSpacing={1.6}
                    >
                        Field priorities
                    </Text>
                    <Text
                        color={designSystem.colors.primary}
                        fontFamily={designSystem.fonts.monoBold}
                        fontSize={11}
                        textTransform="uppercase"
                        letterSpacing={1.1}
                    >
                        {fieldReadinessPercent}% ready
                    </Text>
                </XStack>

                <XStack gap="$2.5">
                    {FIELD_PRIORITY_ITEMS.map((item) => {
                        return (
                            <YStack
                                key={item.id}
                                flex={1}
                                rounded={designSystem.radii.lg}
                                borderWidth={1}
                                borderColor={designSystem.colors.border}
                                bg={designSystem.colors.surface}
                                p="$3"
                            >
                                <Paragraph
                                    color={designSystem.colors.mutedForeground}
                                    fontFamily={designSystem.fonts.bodyBold}
                                    fontSize={10}
                                    textTransform="uppercase"
                                    letterSpacing={1.2}
                                >
                                    {item.title}
                                </Paragraph>
                                <Text
                                    color={designSystem.colors.foreground}
                                    fontFamily={designSystem.fonts.headingBold}
                                    fontSize={24}
                                    mt="$2"
                                >
                                    {item.value}
                                </Text>
                            </YStack>
                        );
                    })}
                </XStack>
            </YStack>

            <YStack gap="$3">
                <XStack justify="space-between" items="center">
                    <Text
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyBold}
                        fontSize={11}
                        textTransform="uppercase"
                        letterSpacing={1.6}
                    >
                        Active work
                    </Text>
                    <Button
                        chromeless
                        onPress={() => {
                            router.push("/places");
                        }}
                    >
                        <Text
                            color={designSystem.colors.primary}
                            fontFamily={designSystem.fonts.bodyBold}
                            fontSize={11}
                            textTransform="uppercase"
                            letterSpacing={1.3}
                        >
                            See all
                        </Text>
                    </Button>
                </XStack>

                <YStack gap="$3">
                    {highlightedPlaces.map((place) => {
                        const placeTone = getPlaceStatusTone(place.status);

                        return (
                            <YStack
                                key={place.id}
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
                                <XStack justify="space-between" items="flex-start" gap="$3">
                                    <YStack flex={1} gap="$1">
                                        <Text
                                            color={designSystem.colors.foreground}
                                            fontFamily={designSystem.fonts.bodyBold}
                                            fontSize={16}
                                        >
                                            {place.placeName}
                                        </Text>
                                        <Paragraph
                                            color={designSystem.colors.mutedForeground}
                                            fontFamily={designSystem.fonts.bodyMedium}
                                        >
                                            {place.projectName}
                                        </Paragraph>
                                    </YStack>
                                    <YStack
                                        rounded={designSystem.radii.full}
                                        px="$3"
                                        py="$1"
                                        style={{ backgroundColor: placeTone.surface }}
                                    >
                                        <Text
                                            style={{ color: placeTone.text }}
                                            fontFamily={designSystem.fonts.bodyBold}
                                            fontSize={10}
                                            textTransform="uppercase"
                                            letterSpacing={1.2}
                                        >
                                            {PLACE_STATUS_LABELS[place.status]}
                                        </Text>
                                    </YStack>
                                </XStack>

                                <XStack justify="space-between" items="center">
                                    <Paragraph
                                        color={designSystem.colors.mutedForeground}
                                        fontFamily={designSystem.fonts.bodyMedium}
                                    >
                                        Mandatory completion {place.mandatoryCompletionPercent}%
                                    </Paragraph>
                                    <Paragraph
                                        color={designSystem.colors.primary}
                                        fontFamily={designSystem.fonts.bodyBold}
                                    >
                                        Audit {place.auditScore}%
                                    </Paragraph>
                                </XStack>

                                <YStack
                                    height={6}
                                    rounded={designSystem.radii.full}
                                    bg={designSystem.colors.mutedSurface}
                                    overflow="hidden"
                                >
                                    <YStack
                                        height={6}
                                        rounded={designSystem.radii.full}
                                        bg={designSystem.colors.primary}
                                        width={`${place.mandatoryCompletionPercent}%`}
                                    />
                                </YStack>

                                <XStack justify="space-between" items="center">
                                    <XStack items="center" gap="$1.5">
                                        <Clock3
                                            size={13}
                                            color={designSystem.colors.mutedForeground}
                                        />
                                        <Paragraph
                                            color={designSystem.colors.mutedForeground}
                                            fontFamily={designSystem.fonts.bodyMedium}
                                        >
                                            {place.updatedAtLabel}
                                        </Paragraph>
                                    </XStack>
                                    <Button
                                        height={36}
                                        px="$3"
                                        rounded={designSystem.radii.sm}
                                        borderWidth={0}
                                        bg={designSystem.colors.primary}
                                        pressStyle={{ opacity: 0.92, scale: 0.985 }}
                                        onPress={() => {
                                            setSelectedPlaceId(place.id);
                                            router.push("/(tabs)/execute");
                                        }}
                                    >
                                        <XStack items="center" gap="$1.5">
                                            <Text
                                                color={designSystem.colors.primaryForeground}
                                                fontFamily={designSystem.fonts.bodyBold}
                                                fontSize={11}
                                                textTransform="uppercase"
                                                letterSpacing={1.2}
                                            >
                                                Open audit
                                            </Text>
                                            <ArrowUpRight
                                                size={14}
                                                color={designSystem.colors.primaryForeground}
                                            />
                                        </XStack>
                                    </Button>
                                </XStack>

                                <Separator borderColor={designSystem.colors.border} opacity={0} />
                            </YStack>
                        );
                    })}
                </YStack>
            </YStack>
        </ScrollView>
    );
}
