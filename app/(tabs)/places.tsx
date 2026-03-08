import { useMemo } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Clock3, LocateFixed, MapPin } from "@tamagui/lucide-icons";
import { Button, Paragraph, Text, XStack, YStack } from "tamagui";
import {
    PLAYSPACE_PLACES,
    type ManagerSurveyStatus,
    type PlaceStatus,
} from "lib/playspace-demo-data";
import {
    designSystem,
    getManagerSurveyTone,
    getPlaceStatusTone,
    type DesignTone,
} from "lib/design-system";
import { useDemoUiStore } from "stores/demo-ui-store";

const PLACE_STATUS_LABELS: Record<PlaceStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    ready_for_review: "Ready for Review",
    submitted: "Submitted",
};

const MANAGER_SURVEY_STATUS_LABELS: Record<ManagerSurveyStatus, string> = {
    pending: "Survey Pending",
    requested: "Survey Requested",
    submitted: "Survey Submitted",
};

/**
 * Assigned places tab for auditor field execution.
 */
export default function PlacesScreen() {
    const router = useRouter();
    const setSelectedPlaceId = useDemoUiStore((state) => state.setSelectedPlaceId);
    const placeStatusCounts = useMemo(() => {
        return PLAYSPACE_PLACES.reduce(
            (accumulator, place) => {
                accumulator[place.status] += 1;
                return accumulator;
            },
            {
                not_started: 0,
                in_progress: 0,
                ready_for_review: 0,
                submitted: 0,
            } satisfies Record<PlaceStatus, number>,
        );
    }, []);

    return (
        <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            style={{ backgroundColor: designSystem.colors.background }}
            contentContainerStyle={{
                paddingHorizontal: designSystem.spacing.screenPaddingHorizontal,
                paddingTop: designSystem.spacing.screenPaddingVertical,
                paddingBottom: 132,
                gap: 24,
            }}
        >
            <YStack gap="$4">
                <YStack gap="$1.5">
                    <Text
                        color={designSystem.colors.foreground}
                        fontFamily={designSystem.fonts.headingBold}
                        fontSize={32}
                        lineHeight={36}
                        letterSpacing={-0.7}
                    >
                        Assigned Places
                    </Text>
                    <Paragraph
                        color={designSystem.colors.mutedForeground}
                        fontFamily={designSystem.fonts.bodyMedium}
                    >
                        Review your field queue, monitor progress, and jump back into active audits.
                    </Paragraph>
                </YStack>

                <XStack gap="$3">
                    <SummaryTile label="In progress" value={placeStatusCounts.in_progress} />
                    <SummaryTile
                        label="Ready"
                        value={placeStatusCounts.ready_for_review}
                        tone={{
                            accent: designSystem.colors.violet,
                            surface: designSystem.colors.violetSoft,
                            text: designSystem.colors.violet,
                        }}
                    />
                    <SummaryTile
                        label="Submitted"
                        value={placeStatusCounts.submitted}
                        tone={{
                            accent: designSystem.colors.success,
                            surface: designSystem.colors.successSoft,
                            text: designSystem.colors.success,
                        }}
                    />
                </XStack>
            </YStack>

            <YStack gap="$3">
                {PLAYSPACE_PLACES.map((place) => {
                    const placeTone = getPlaceStatusTone(place.status);
                    const managerSurveyTone = getManagerSurveyTone(place.managerSurveyStatus);

                    return (
                        <YStack
                            key={place.id}
                            rounded={designSystem.radii.lg}
                            borderWidth={1}
                            borderColor={designSystem.colors.border}
                            bg={designSystem.colors.surface}
                            overflow="hidden"
                            style={{
                                boxShadow: designSystem.shadows.card,
                            }}
                        >
                            <XStack>
                                <YStack width={4} style={{ backgroundColor: placeTone.accent }} />

                                <YStack flex={1} p="$4" gap="$3">
                                    <XStack justify="space-between" items="flex-start" gap="$3">
                                        <YStack flex={1} gap="$1">
                                            <Text
                                                color={designSystem.colors.foreground}
                                                fontFamily={designSystem.fonts.bodyBold}
                                                fontSize={17}
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

                                    <XStack items="center" gap="$2">
                                        <MapPin
                                            size={14}
                                            color={designSystem.colors.mutedForeground}
                                        />
                                        <Paragraph
                                            color={designSystem.colors.mutedForeground}
                                            fontFamily={designSystem.fonts.bodyMedium}
                                        >
                                            {place.locality}
                                        </Paragraph>
                                    </XStack>

                                    <XStack gap="$3">
                                        <ScoreTile
                                            label="Audit score"
                                            value={
                                                place.auditScore === 0
                                                    ? "--"
                                                    : `${place.auditScore}%`
                                            }
                                            valueColor={designSystem.colors.primary}
                                        />
                                        <ScoreTile
                                            label="Combined score"
                                            value={
                                                place.combinedScore === null
                                                    ? "Pending"
                                                    : `${place.combinedScore}%`
                                            }
                                            valueColor={
                                                place.combinedScore === null
                                                    ? designSystem.colors.warning
                                                    : designSystem.colors.success
                                            }
                                        />
                                    </XStack>

                                    <YStack gap="$2">
                                        <XStack justify="space-between" items="center">
                                            <Paragraph
                                                color={designSystem.colors.mutedForeground}
                                                fontFamily={designSystem.fonts.bodyMedium}
                                            >
                                                Mandatory completion
                                            </Paragraph>
                                            <Text
                                                color={designSystem.colors.primary}
                                                fontFamily={designSystem.fonts.monoBold}
                                                fontSize={12}
                                            >
                                                {place.mandatoryCompletionPercent}%
                                            </Text>
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
                                    </YStack>

                                    <YStack
                                        gap="$3"
                                        rounded={designSystem.radii.md}
                                        borderWidth={1}
                                        borderColor={designSystem.colors.border}
                                        bg={designSystem.colors.input}
                                        p="$3"
                                    >
                                        <XStack justify="space-between" items="center" gap="$2.5">
                                            <XStack items="center" gap="$2" flex={1} style={{ minWidth: 0 }}>
                                                <Clock3
                                                    size={14}
                                                    color={designSystem.colors.mutedForeground}
                                                />
                                                <Paragraph
                                                    color={designSystem.colors.mutedForeground}
                                                    fontFamily={designSystem.fonts.bodyMedium}
                                                >
                                                    {place.updatedAtLabel}
                                                </Paragraph>
                                            </XStack>

                                            <YStack
                                                height={30}
                                                justify="center"
                                                rounded={designSystem.radii.sm}
                                                px="$3"
                                                style={{
                                                    backgroundColor: managerSurveyTone.surface,
                                                }}
                                            >
                                                <Text
                                                    style={{ color: managerSurveyTone.text }}
                                                    fontFamily={designSystem.fonts.bodyBold}
                                                    fontSize={10}
                                                    textTransform="uppercase"
                                                    letterSpacing={1.1}
                                                >
                                                    {
                                                        MANAGER_SURVEY_STATUS_LABELS[
                                                            place.managerSurveyStatus
                                                        ]
                                                    }
                                                </Text>
                                            </YStack>
                                        </XStack>

                                        <Button
                                            width="100%"
                                            height={42}
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
                                            <XStack items="center" justify="center" gap="$1.5">
                                                <LocateFixed
                                                    size={14}
                                                    color={designSystem.colors.primaryForeground}
                                                />
                                                <Text
                                                    color={designSystem.colors.primaryForeground}
                                                    fontFamily={designSystem.fonts.bodyBold}
                                                    fontSize={10}
                                                    textTransform="uppercase"
                                                    letterSpacing={1.1}
                                                >
                                                    Open audit
                                                </Text>
                                            </XStack>
                                        </Button>
                                    </YStack>
                                </YStack>
                            </XStack>
                        </YStack>
                    );
                })}
            </YStack>
        </ScrollView>
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
function SummaryTile({ label, value, tone }: SummaryTileProps) {
    const tileTone = tone ?? {
        accent: designSystem.colors.primary,
        surface: designSystem.colors.primarySoft,
        text: designSystem.colors.primary,
    };

    return (
        <YStack
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
                {label}
            </Paragraph>
            <Text
                fontFamily={designSystem.fonts.headingBold}
                fontSize={24}
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
function ScoreTile({ label, value, valueColor }: ScoreTileProps) {
    return (
        <YStack
            flex={1}
            rounded={designSystem.radii.md}
            borderWidth={1}
            borderColor={designSystem.colors.border}
            bg={designSystem.colors.input}
            p="$3"
        >
            <Paragraph
                color={designSystem.colors.mutedForeground}
                fontFamily={designSystem.fonts.bodyBold}
                fontSize={10}
                textTransform="uppercase"
                letterSpacing={1.2}
            >
                {label}
            </Paragraph>
            <Text
                fontFamily={designSystem.fonts.headingBold}
                fontSize={22}
                mt="$2"
                style={{ color: valueColor }}
            >
                {value}
            </Text>
        </YStack>
    );
}
