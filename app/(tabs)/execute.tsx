import { useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleCheckBig, Clock3, Link2, Save, Send, TriangleAlert } from "@tamagui/lucide-icons";
import { Button, Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import {
    AUDIT_SECTION_PREVIEW,
    PLAYSPACE_PLACES,
    type ManagerSurveyStatus,
    toCompletionPercent,
} from "lib/playspace-demo-data";
import { useDemoUiStore } from "stores/demo-ui-store";

const MANAGER_SURVEY_STATUS_LABELS: Record<ManagerSurveyStatus, string> = {
    pending: "Manager survey not requested",
    requested: "Waiting for manager survey response",
    submitted: "Manager survey submitted",
};

/**
 * Audit execution tab that previews playspace section progress.
 */
export default function ExecuteScreen() {
    const insets = useSafeAreaInsets();
    const selectedPlaceId = useDemoUiStore((state) => state.selectedPlaceId);
    const [ratingValue, setRatingValue] = useState<number>(4);
    const defaultPlace = PLAYSPACE_PLACES[0];

    if (defaultPlace === undefined) {
        throw new Error("PLAYSPACE_PLACES must define at least one place.");
    }

    const activePlace = useMemo(() => {
        return PLAYSPACE_PLACES.find((place) => place.id === selectedPlaceId) ?? defaultPlace;
    }, [defaultPlace, selectedPlaceId]);

    const totalAnswered = useMemo(() => {
        return AUDIT_SECTION_PREVIEW.reduce((sum, section) => {
            return sum + section.answeredItems;
        }, 0);
    }, []);
    const totalQuestions = useMemo(() => {
        return AUDIT_SECTION_PREVIEW.reduce((sum, section) => {
            return sum + section.totalItems;
        }, 0);
    }, []);

    const mandatoryAnswered = useMemo(() => {
        return AUDIT_SECTION_PREVIEW.reduce((sum, section) => {
            if (!section.mandatory) {
                return sum;
            }

            return sum + section.answeredItems;
        }, 0);
    }, []);

    const mandatoryQuestions = useMemo(() => {
        return AUDIT_SECTION_PREVIEW.reduce((sum, section) => {
            if (!section.mandatory) {
                return sum;
            }

            return sum + section.totalItems;
        }, 0);
    }, []);

    const overallCompletion = toCompletionPercent(totalAnswered, totalQuestions);
    const mandatoryCompletion = toCompletionPercent(mandatoryAnswered, mandatoryQuestions);
    const scorePreviewBase = Math.round((ratingValue / 5) * 100);

    return (
        <YStack flex={1}>
            <ScrollView
                contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 96 }}
            >
                <YStack gap="$4">
                    <Text fontSize={28} fontWeight="700">
                        Execute Playspace Audit
                    </Text>
                    <Paragraph color="$color10">
                        Complete your assigned field audit offline and sync updates when connected.
                    </Paragraph>
                </YStack>

                <YStack
                    borderWidth={1}
                    borderColor="$borderColor"
                    rounded={16}
                    p="$4"
                    bg="$background"
                    gap="$3"
                    shadowColor="$shadowColor"
                    shadowOpacity={0.08}
                    shadowRadius={8}
                    shadowOffset={{ width: 0, height: 3 }}
                    elevation={2}
                >
                    <XStack justify="space-between" items="center">
                        <YStack gap="$1">
                            <Text fontSize={18} fontWeight="700">
                                {activePlace.placeName}
                            </Text>
                            <Paragraph color="$color10">{activePlace.locality}</Paragraph>
                        </YStack>
                        <YStack rounded={999} px="$3" py="$1" bg="$blue4">
                            <Paragraph color="$blue10" fontWeight="700">
                                Assigned to you
                            </Paragraph>
                        </YStack>
                    </XStack>

                    <XStack items="center" gap="$2">
                        <Link2 size={14} color="$purple10" />
                        <Paragraph color="$purple10" fontWeight="700">
                            {MANAGER_SURVEY_STATUS_LABELS[activePlace.managerSurveyStatus]}
                        </Paragraph>
                    </XStack>

                    <YStack gap="$2">
                        <XStack justify="space-between">
                            <Paragraph color="$color10">Overall completion</Paragraph>
                            <Paragraph color="$blue10" fontWeight="700">
                                {overallCompletion}%
                            </Paragraph>
                        </XStack>
                        <YStack height={10} rounded={999} bg="$background">
                            <YStack
                                height={10}
                                rounded={999}
                                bg="$blue9"
                                width={`${overallCompletion}%`}
                            />
                        </YStack>
                    </YStack>

                    <YStack gap="$2">
                        <XStack justify="space-between">
                            <Paragraph color="$color10">Mandatory completion</Paragraph>
                            <Paragraph color="$green10" fontWeight="700">
                                {mandatoryCompletion}%
                            </Paragraph>
                        </XStack>
                        <YStack height={10} rounded={999} bg="$background">
                            <YStack
                                height={10}
                                rounded={999}
                                bg="$green9"
                                width={`${mandatoryCompletion}%`}
                            />
                        </YStack>
                    </YStack>

                    <XStack items="center" gap="$2">
                        <Clock3 size={14} color="$color10" />
                        <Paragraph color="$color10">
                            Autosave every 30 seconds and on section transition
                        </Paragraph>
                    </XStack>

                    <XStack items="center" gap="$2">
                        <TriangleAlert size={14} color="$orange10" />
                        <Paragraph color="$orange10">
                            Combined score is calculated after manager survey data is submitted in
                            web.
                        </Paragraph>
                    </XStack>
                </YStack>

                <YStack gap="$3">
                    {AUDIT_SECTION_PREVIEW.map((section) => {
                        const completion = toCompletionPercent(
                            section.answeredItems,
                            section.totalItems,
                        );

                        return (
                            <YStack
                                key={section.id}
                                borderWidth={1}
                                borderColor="$borderColor"
                                rounded={16}
                                p="$4"
                                bg="$background"
                                gap="$2.5"
                            >
                                <XStack justify="space-between" items="center">
                                    <Text fontSize={17} fontWeight="700">
                                        {section.sectionName}
                                    </Text>
                                    <XStack
                                        rounded={999}
                                        px="$3"
                                        py="$1"
                                        bg={section.mandatory ? "$orange4" : "$blue4"}
                                    >
                                        <Paragraph
                                            color={section.mandatory ? "$orange10" : "$blue10"}
                                            fontWeight="700"
                                        >
                                            {section.mandatory ? "Mandatory" : "Optional"}
                                        </Paragraph>
                                    </XStack>
                                </XStack>

                                <XStack justify="space-between">
                                    <Paragraph color="$color10">
                                        {section.answeredItems} / {section.totalItems} answered
                                    </Paragraph>
                                    <Paragraph color="$blue10" fontWeight="700">
                                        {completion}%
                                    </Paragraph>
                                </XStack>
                                <YStack height={8} rounded={999} bg="$background">
                                    <YStack
                                        height={8}
                                        rounded={999}
                                        bg="$blue9"
                                        width={`${completion}%`}
                                    />
                                </YStack>
                                {section.mandatory ? (
                                    <Paragraph color="$green10" fontWeight="700">
                                        Section score: {section.sectionScorePercent}%
                                    </Paragraph>
                                ) : (
                                    <Paragraph color="$color10">
                                        Participant info supports context and is not scored.
                                    </Paragraph>
                                )}
                            </YStack>
                        );
                    })}
                </YStack>

                <YStack
                    borderWidth={1}
                    borderColor="$borderColor"
                    rounded={16}
                    p="$4"
                    bg="$background"
                    gap="$3"
                    shadowColor="$shadowColor"
                    shadowOpacity={0.08}
                    shadowRadius={8}
                    shadowOffset={{ width: 0, height: 3 }}
                    elevation={2}
                >
                    <Text fontSize={18} fontWeight="700">
                        Quick Prompt Preview
                    </Text>
                    <Paragraph color="$color10">
                        To what extent does this place support varied, inclusive, and meaningful
                        play for youth?
                    </Paragraph>
                    <XStack gap="$2">
                        {[1, 2, 3, 4, 5].map((value) => {
                            const isSelected = value === ratingValue;
                            return (
                                <Button
                                    key={value}
                                    flex={1}
                                    size="$3"
                                    theme={isSelected ? "blue" : null}
                                    pressStyle={{ scale: 0.97 }}
                                    onPress={() => {
                                        setRatingValue(value);
                                    }}
                                >
                                    {value}
                                </Button>
                            );
                        })}
                    </XStack>
                    <XStack gap="$3">
                        <YStack
                            flex={1}
                            borderWidth={1}
                            borderColor="$borderColor"
                            rounded={12}
                            p="$3"
                        >
                            <Paragraph color="$color10">Preview Audit Score</Paragraph>
                            <Text color="$blue10" fontSize={22} fontWeight="700">
                                {scorePreviewBase}%
                            </Text>
                        </YStack>
                    </XStack>
                    <Separator borderColor="$borderColor" />
                    <XStack items="center" gap="$2">
                        <CircleCheckBig size={14} color="$green10" />
                        <Paragraph color="$green10">
                            Draft ready. Mandatory sections are{" "}
                            {mandatoryCompletion >= 80
                                ? "ready for submission"
                                : "still in progress"}
                            .
                        </Paragraph>
                    </XStack>
                </YStack>
            </ScrollView>

            <YStack
                borderTopWidth={1}
                borderTopColor="$borderColor"
                bg="$background"
                px="$4"
                pt="$3"
                pb={Math.max(insets.bottom, 12)}
                gap="$2"
                shadowColor="$shadowColor"
                shadowOpacity={0.12}
                shadowRadius={12}
                shadowOffset={{ width: 0, height: -4 }}
                elevation={6}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                }}
            >
                <XStack gap="$2">
                    <Button flex={1} size="$4">
                        <XStack items="center" gap="$2">
                            <Save size={16} />
                            <Text>Save local draft</Text>
                        </XStack>
                    </Button>
                    <Button
                        flex={1}
                        size="$4"
                        theme="green"
                        disabled={mandatoryCompletion < 80}
                        opacity={mandatoryCompletion < 80 ? 0.6 : 1}
                    >
                        <XStack items="center" gap="$2">
                            <Send size={16} />
                            <Text>Submit Playspace audit</Text>
                        </XStack>
                    </Button>
                </XStack>
            </YStack>
        </YStack>
    );
}
